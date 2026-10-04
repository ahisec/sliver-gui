package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"unicode"
	"unicode/utf8"

	"gopkg.in/yaml.v3"
)

const (
	appConfigFilename          = "config.yaml"
	legacyWindowConfigFilename = "sliver-gui.yaml"
	legacyDingTalkFilename     = "dingtalk-notifications.yaml"
	appConfigVersion           = 1
	defaultWindowTitle         = "Sliver GUI 增强版"
	maxWindowTitleRunes        = 128
)

type appYAMLConfig struct {
	Version        int                       `yaml:"version"`
	Title          string                    `yaml:"title"`
	DingTalk       dingTalkYAMLSection       `yaml:"dingtalk"`
	OfficialClient officialClientYAMLSection `yaml:"official_client"`
	Extra          map[string]any            `yaml:",inline"`
}

type dingTalkYAMLSection struct {
	Enabled bool           `yaml:"enabled"`
	Webhook string         `yaml:"webhook,omitempty"`
	Secret  string         `yaml:"secret,omitempty"`
	Extra   map[string]any `yaml:",inline"`
}

type officialClientYAMLSection struct {
	Path  string         `yaml:"path,omitempty"`
	Extra map[string]any `yaml:",inline"`
}

type legacyWindowYAMLConfig struct {
	Version int    `yaml:"version"`
	Title   string `yaml:"title"`
}

type legacyDingTalkYAMLConfig struct {
	Version int    `yaml:"version"`
	Enabled bool   `yaml:"enabled"`
	Webhook string `yaml:"webhook,omitempty"`
	Secret  string `yaml:"secret,omitempty"`
}

var appConfigMu sync.Mutex

func appConfigPath() string {
	executable, err := os.Executable()
	if err != nil {
		return appConfigFilename
	}
	return appConfigPathFromExecutable(executable)
}

func appConfigPathFromExecutable(executable string) string {
	return filepath.Join(filepath.Dir(executable), appConfigFilename)
}

func validateWindowTitle(value string) (string, error) {
	title := strings.TrimSpace(value)
	if title == "" {
		return "", errors.New("窗口标题不能为空")
	}
	if !utf8.ValidString(title) {
		return "", errors.New("窗口标题不是有效的 UTF-8")
	}
	if utf8.RuneCountInString(title) > maxWindowTitleRunes {
		return "", fmt.Errorf("窗口标题不能超过 %d 个字符", maxWindowTitleRunes)
	}
	for _, char := range title {
		if unicode.IsControl(char) {
			return "", errors.New("窗口标题不能包含换行或控制字符")
		}
	}
	return title, nil
}

func defaultAppConfig() appYAMLConfig {
	return appYAMLConfig{Version: appConfigVersion, Title: defaultWindowTitle}
}

func readAppConfig(path string) (appYAMLConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return appYAMLConfig{}, err
	}
	var document appYAMLConfig
	if err := yaml.Unmarshal(data, &document); err != nil {
		return appYAMLConfig{}, fmt.Errorf("程序配置 YAML 无效: %w", err)
	}
	if document.Version != appConfigVersion {
		return appYAMLConfig{}, fmt.Errorf("不支持的程序配置版本: %d", document.Version)
	}
	return document, nil
}

func writeAppConfig(path string, document appYAMLConfig) error {
	data, err := yaml.Marshal(document)
	if err != nil {
		return err
	}
	dir := filepath.Dir(path)
	temp, err := os.CreateTemp(dir, ".config-*.yaml.tmp")
	if err != nil {
		return fmt.Errorf("程序目录不可写: %w", err)
	}
	tempPath := temp.Name()
	defer os.Remove(tempPath)
	if err := temp.Chmod(0o600); err != nil {
		temp.Close()
		return err
	}
	if _, err := temp.Write(data); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Sync(); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}
	if err := replaceFileAtomically(tempPath, path); err != nil {
		return fmt.Errorf("无法替换程序目录中的配置: %w", err)
	}
	return nil
}

func migrateLegacyConfig(path string) (appYAMLConfig, error) {
	document := defaultAppConfig()
	dir := filepath.Dir(path)
	windowData, windowErr := os.ReadFile(filepath.Join(dir, legacyWindowConfigFilename))
	if windowErr == nil {
		var legacy legacyWindowYAMLConfig
		if err := yaml.Unmarshal(windowData, &legacy); err == nil && legacy.Version == 1 {
			if title, err := validateWindowTitle(legacy.Title); err == nil {
				document.Title = title
			}
		}
	}
	dingTalkData, dingTalkErr := os.ReadFile(filepath.Join(dir, legacyDingTalkFilename))
	if dingTalkErr == nil {
		var legacy legacyDingTalkYAMLConfig
		if err := yaml.Unmarshal(dingTalkData, &legacy); err == nil && legacy.Version == 1 {
			document.DingTalk = dingTalkYAMLSection{Enabled: legacy.Enabled, Webhook: legacy.Webhook, Secret: legacy.Secret}
		}
	}
	if err := writeAppConfig(path, document); err != nil {
		return appYAMLConfig{}, err
	}
	return document, nil
}

func ensureAppConfig(path string) (appYAMLConfig, error) {
	appConfigMu.Lock()
	defer appConfigMu.Unlock()
	if _, err := os.Stat(path); err == nil {
		return readAppConfig(path)
	} else if !os.IsNotExist(err) {
		return appYAMLConfig{}, err
	}
	return migrateLegacyConfig(path)
}

func configuredWindowTitle(path string) (string, error) {
	document, err := ensureAppConfig(path)
	if err != nil {
		return defaultWindowTitle, err
	}
	title, err := validateWindowTitle(document.Title)
	if err != nil {
		return defaultWindowTitle, err
	}
	return title, nil
}

func loadDingTalkConfig(path string) (dingTalkStoredConfig, error) {
	document, err := ensureAppConfig(path)
	if err != nil {
		return dingTalkStoredConfig{}, err
	}
	return dingTalkStoredConfig{Enabled: document.DingTalk.Enabled, Webhook: document.DingTalk.Webhook, Secret: document.DingTalk.Secret}, nil
}

func updateDingTalkConfig(path string, cfg dingTalkStoredConfig) error {
	appConfigMu.Lock()
	defer appConfigMu.Unlock()
	document, err := readAppConfig(path)
	if err != nil {
		if !os.IsNotExist(err) {
			return err
		}
		document, err = migrateLegacyConfig(path)
		if err != nil {
			return err
		}
	}
	document.DingTalk.Enabled = cfg.Enabled
	document.DingTalk.Webhook = cfg.Webhook
	document.DingTalk.Secret = cfg.Secret
	return writeAppConfig(path, document)
}

func loadOfficialClientPath(path string) (string, error) {
	document, err := ensureAppConfig(path)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(document.OfficialClient.Path), nil
}

func updateOfficialClientPath(path, clientPath string) error {
	appConfigMu.Lock()
	defer appConfigMu.Unlock()
	document, err := readAppConfig(path)
	if err != nil {
		if !os.IsNotExist(err) {
			return err
		}
		document = defaultAppConfig()
	}
	document.OfficialClient.Path = strings.TrimSpace(clientPath)
	return writeAppConfig(path, document)
}
