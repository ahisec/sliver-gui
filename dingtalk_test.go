package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/bishopfox/sliver/protobuf/clientpb"
	"google.golang.org/protobuf/proto"
	"gopkg.in/yaml.v3"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) { return fn(req) }

func TestValidateDingTalkWebhook(t *testing.T) {
	valid := "https://oapi.dingtalk.com/robot/send?access_token=test-token"
	if _, err := validateDingTalkWebhook(valid); err != nil {
		t.Fatalf("valid webhook was rejected: %v", err)
	}
	for _, raw := range []string{
		"http://oapi.dingtalk.com/robot/send?access_token=x",
		"https://example.com/robot/send?access_token=x",
		"https://oapi.dingtalk.com/other?access_token=x",
		"https://oapi.dingtalk.com/robot/send",
	} {
		if _, err := validateDingTalkWebhook(raw); err == nil {
			t.Fatalf("invalid webhook was accepted: %s", raw)
		}
	}
}

func TestSignedDingTalkURLPreservesTokenAndAddsSignature(t *testing.T) {
	endpoint, err := signedDingTalkURL("https://oapi.dingtalk.com/robot/send?access_token=token", "secret", time.UnixMilli(1700000000123))
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(endpoint)
	if u.Query().Get("access_token") != "token" || u.Query().Get("timestamp") != "1700000000123" || u.Query().Get("sign") == "" {
		t.Fatalf("signed URL is incomplete: %s", endpoint)
	}
}

func TestSaveDingTalkConfigUsesPlaintextYAMLAndSupportsClearingSecret(t *testing.T) {
	path := filepath.Join(t.TempDir(), dingTalkConfigFilename)
	webhook := "https://oapi.dingtalk.com/robot/send?access_token=test-token"
	if _, err := saveDingTalkConfig(path, DingTalkConfigInput{Enabled: true, Webhook: webhook, Secret: "first-secret"}); err != nil {
		t.Fatal(err)
	}
	cfg, err := loadDingTalkConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Secret != "first-secret" {
		t.Fatal("saved secret was not restored")
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), "access_token=test-token") || !strings.Contains(string(raw), "first-secret") {
		t.Fatal("stored configuration does not contain the requested plaintext credentials")
	}
	var document dingTalkYAMLConfig
	if err := yaml.Unmarshal(raw, &document); err != nil {
		t.Fatalf("stored configuration is not valid YAML: %v", err)
	}
	if document.Version != dingTalkConfigVersion || !document.Enabled || document.Webhook != webhook || document.Secret != "first-secret" {
		t.Fatalf("unexpected YAML document: %#v", document)
	}
	if runtime.GOOS != "windows" {
		if info, err := os.Stat(path); err != nil || info.Mode().Perm()&0o077 != 0 {
			t.Fatalf("config permissions are not private: info=%v err=%v", info, err)
		}
	}
	view := dingTalkConfigView(cfg, path)
	if view.Webhook != webhook || view.Secret != "first-secret" || !view.ConfigurationOK || view.ConfigPath != path {
		t.Fatalf("config view did not return the visible configuration: %#v", view)
	}
	cfg, err = saveDingTalkConfig(path, DingTalkConfigInput{Enabled: true, Webhook: webhook})
	if err != nil || cfg.Secret != "" {
		t.Fatalf("clearing the visible secret failed: cfg=%#v err=%v", cfg, err)
	}
}

func TestDingTalkConfigPathUsesExecutableDirectory(t *testing.T) {
	executable := filepath.Join("C:\\Apps", "Sliver", "sliver-gui.exe")
	want := filepath.Join(filepath.Dir(executable), dingTalkConfigFilename)
	if got := dingTalkConfigPathFromExecutable(executable); got != want {
		t.Fatalf("unexpected config path: got %q want %q", got, want)
	}
}

func TestSendDingTalkTextChecksPayloadAndBusinessResponse(t *testing.T) {
	var captured map[string]interface{}
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		if req.Method != http.MethodPost || req.Header.Get("Content-Type") != "application/json; charset=utf-8" {
			t.Fatalf("unexpected request metadata: %s %s", req.Method, req.Header.Get("Content-Type"))
		}
		body, _ := io.ReadAll(req.Body)
		if err := json.Unmarshal(body, &captured); err != nil {
			t.Fatal(err)
		}
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(`{"errcode":0,"errmsg":"ok"}`))}, nil
	})}
	cfg := dingTalkStoredConfig{Webhook: "https://oapi.dingtalk.com/robot/send?access_token=test-token"}
	if err := sendDingTalkText(context.Background(), client, cfg, "hello", time.Unix(0, 0)); err != nil {
		t.Fatal(err)
	}
	if captured["msgtype"] != "text" {
		t.Fatalf("unexpected payload: %#v", captured)
	}
}

func TestSendDingTalkTextRejectsBusinessError(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(`{"errcode":310000,"errmsg":"keywords not in content"}`))}, nil
	})}
	cfg := dingTalkStoredConfig{Webhook: "https://oapi.dingtalk.com/robot/send?access_token=test-token"}
	if err := sendDingTalkText(context.Background(), client, cfg, "hello", time.Unix(0, 0)); err == nil || !strings.Contains(err.Error(), "310000") {
		t.Fatalf("business error was not returned: %v", err)
	}
}

func TestDingTalkNoticeTextExcludesIdentifiersAndSensitiveFields(t *testing.T) {
	text := dingTalkNoticeText(DingTalkAgentNotice{Kind: "session", Hostname: "host-1", Username: "user", OS: "windows", Arch: "amd64"}, time.Unix(0, 0))
	for _, expected := range []string{"Session", "host-1", "user", "windows/amd64"} {
		if !strings.Contains(text, expected) {
			t.Fatalf("notice is missing %q: %s", expected, text)
		}
	}
}

func TestBeaconEventViewDecodesStructuredAgentMetadata(t *testing.T) {
	data, err := proto.Marshal(&clientpb.Beacon{ID: "beacon-1", Hostname: "host-1", Username: "user", OS: "windows", Arch: "amd64"})
	if err != nil {
		t.Fatal(err)
	}
	view := beaconEventView(data)
	if view["id"] != "beacon-1" || view["hostname"] != "host-1" || view["username"] != "user" || view["os"] != "windows" || view["arch"] != "amd64" {
		t.Fatalf("beacon event metadata was not preserved: %#v", view)
	}
	if beaconEventView([]byte("invalid")) != nil {
		t.Fatal("invalid beacon event data was accepted")
	}
}
