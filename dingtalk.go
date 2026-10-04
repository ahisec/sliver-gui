package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	dingTalkResponseLimit = 64 << 10
)

type DingTalkConfigInput struct {
	Enabled bool   `json:"enabled"`
	Webhook string `json:"webhook"`
	Secret  string `json:"secret"`
}

type DingTalkConfigView struct {
	Enabled         bool   `json:"enabled"`
	Webhook         string `json:"webhook"`
	Secret          string `json:"secret"`
	ConfigurationOK bool   `json:"configurationOk"`
	ConfigPath      string `json:"configPath"`
}

type DingTalkAgentNotice struct {
	Kind      string `json:"kind"`
	IP        string `json:"ip"`
	Username  string `json:"username"`
	Privilege string `json:"privilege"`
	OS        string `json:"os"`
	Arch      string `json:"arch"`
}

type dingTalkStoredConfig struct {
	Enabled bool
	Webhook string
	Secret  string
}

type dingTalkAPIResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
}

var (
	dingTalkHTTPClient = &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return errors.New("钉钉重定向次数过多")
			}
			_, err := validateDingTalkWebhook(req.URL.String())
			return err
		},
	}
)

func validateDingTalkWebhook(raw string) (*url.URL, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Scheme != "https" || u.Host == "" {
		return nil, errors.New("Webhook 必须是有效的 HTTPS 地址")
	}
	host := strings.ToLower(u.Hostname())
	if host != "oapi.dingtalk.com" && host != "api.dingtalk.com" {
		return nil, errors.New("Webhook 仅允许钉钉官方机器人域名")
	}
	if !strings.HasPrefix(u.Path, "/robot/send") {
		return nil, errors.New("Webhook 路径必须是钉钉机器人发送接口")
	}
	if strings.TrimSpace(u.Query().Get("access_token")) == "" {
		return nil, errors.New("Webhook 缺少 access_token")
	}
	u.Fragment = ""
	return u, nil
}

func signedDingTalkURL(webhook, secret string, now time.Time) (string, error) {
	u, err := validateDingTalkWebhook(webhook)
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(secret) == "" {
		return u.String(), nil
	}
	timestamp := now.UnixMilli()
	stringToSign := fmt.Sprintf("%d\n%s", timestamp, secret)
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(stringToSign))
	sign := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	query := u.Query()
	query.Set("timestamp", fmt.Sprintf("%d", timestamp))
	query.Set("sign", sign)
	u.RawQuery = query.Encode()
	return u.String(), nil
}

func saveDingTalkConfig(path string, input DingTalkConfigInput) (dingTalkStoredConfig, error) {
	webhook := strings.TrimSpace(input.Webhook)
	if webhook != "" {
		if _, err := validateDingTalkWebhook(webhook); err != nil {
			return dingTalkStoredConfig{}, err
		}
	}
	if input.Enabled && webhook == "" {
		return dingTalkStoredConfig{}, errors.New("启用钉钉通知前必须填写 Webhook")
	}
	secret := strings.TrimSpace(input.Secret)
	cfg := dingTalkStoredConfig{Enabled: input.Enabled, Webhook: webhook, Secret: secret}
	if err := updateDingTalkConfig(path, cfg); err != nil {
		return dingTalkStoredConfig{}, err
	}
	return cfg, nil
}

func dingTalkConfigView(cfg dingTalkStoredConfig, path string) DingTalkConfigView {
	_, err := validateDingTalkWebhook(cfg.Webhook)
	return DingTalkConfigView{
		Enabled:         cfg.Enabled,
		Webhook:         cfg.Webhook,
		Secret:          cfg.Secret,
		ConfigurationOK: err == nil,
		ConfigPath:      path,
	}
}

func dingTalkNoticeText(notice DingTalkAgentNotice, now time.Time) string {
	kind := "Session"
	if strings.EqualFold(strings.TrimSpace(notice.Kind), "beacon") {
		kind = "Beacon"
	}
	value := func(text string) string {
		text = strings.TrimSpace(text)
		if text == "" {
			return "-"
		}
		return text
	}
	return fmt.Sprintf("【Sliver GUI】新 %s 上线\nIP：%s\n用户：%s（%s）\n系统：%s/%s\n时间：%s",
		kind, value(notice.IP), value(notice.Username), value(notice.Privilege), value(notice.OS), value(notice.Arch), now.Local().Format("2006-01-02 15:04:05"))
}

func sendDingTalkText(ctx context.Context, client *http.Client, cfg dingTalkStoredConfig, text string, now time.Time) error {
	endpoint, err := signedDingTalkURL(cfg.Webhook, cfg.Secret, now)
	if err != nil {
		return err
	}
	body, err := json.Marshal(map[string]interface{}{
		"msgtype": "text",
		"text":    map[string]string{"content": text},
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("钉钉请求失败: %w", err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, dingTalkResponseLimit))
	if err != nil {
		return fmt.Errorf("读取钉钉响应失败: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("钉钉返回 HTTP %d", resp.StatusCode)
	}
	var result dingTalkAPIResponse
	if err := json.Unmarshal(data, &result); err != nil {
		return errors.New("钉钉返回了无法解析的响应")
	}
	if result.ErrCode != 0 {
		return fmt.Errorf("钉钉拒绝了通知: %s (code %d)", result.ErrMsg, result.ErrCode)
	}
	return nil
}

func (a *App) GetDingTalkConfig() (DingTalkConfigView, error) {
	path := appConfigPath()
	cfg, err := loadDingTalkConfig(path)
	if err != nil {
		return DingTalkConfigView{}, err
	}
	return dingTalkConfigView(cfg, path), nil
}

func (a *App) SaveDingTalkConfig(input DingTalkConfigInput) (DingTalkConfigView, error) {
	path := appConfigPath()
	cfg, err := saveDingTalkConfig(path, input)
	if err != nil {
		return DingTalkConfigView{}, err
	}
	a.audit.log("dingtalk-config", "local", map[bool]string{true: "enabled", false: "disabled"}[cfg.Enabled])
	return dingTalkConfigView(cfg, path), nil
}

func (a *App) TestDingTalkNotification() error {
	cfg, err := loadDingTalkConfig(appConfigPath())
	if err != nil {
		return err
	}
	if _, err := validateDingTalkWebhook(cfg.Webhook); err != nil {
		return err
	}
	err = sendDingTalkText(a.ctx, dingTalkHTTPClient, cfg, "【Sliver GUI】钉钉机器人测试通知\n配置连接正常。", time.Now())
	a.logDestructive("dingtalk-test", "local", err)
	return err
}

func (a *App) NotifyDingTalkAgentOnline(notice DingTalkAgentNotice) error {
	cfg, err := loadDingTalkConfig(appConfigPath())
	if err != nil {
		return err
	}
	if !cfg.Enabled {
		return nil
	}
	now := time.Now()
	err = sendDingTalkText(a.ctx, dingTalkHTTPClient, cfg, dingTalkNoticeText(notice, now), now)
	a.logDestructive("dingtalk-agent-online", strings.ToLower(strings.TrimSpace(notice.Kind)), err)
	return err
}
