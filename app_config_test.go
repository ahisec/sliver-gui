package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestAppConfigPathUsesExecutableDirectory(t *testing.T) {
	executable := filepath.Join("C:\\Apps", "Sliver", "sliver-gui.exe")
	want := filepath.Join(filepath.Dir(executable), appConfigFilename)
	if got := appConfigPathFromExecutable(executable); got != want {
		t.Fatalf("config path = %q, want %q", got, want)
	}
}

func TestConfiguredWindowTitleCreatesDefaultYAML(t *testing.T) {
	path := filepath.Join(t.TempDir(), appConfigFilename)
	title, err := configuredWindowTitle(path)
	if err != nil {
		t.Fatal(err)
	}
	if title != defaultWindowTitle {
		t.Fatalf("title = %q", title)
	}
	document, err := readAppConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if document.Version != appConfigVersion || document.Title != defaultWindowTitle {
		t.Fatalf("unexpected default config: %#v", document)
	}
}

func TestConfiguredWindowTitleUsesValidUnifiedYAML(t *testing.T) {
	path := filepath.Join(t.TempDir(), appConfigFilename)
	content := "version: 1\ntitle: '  Internal Console  '\ndingtalk:\n  enabled: false\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	title, err := configuredWindowTitle(path)
	if err != nil {
		t.Fatal(err)
	}
	if title != "Internal Console" {
		t.Fatalf("title = %q", title)
	}
}

func TestConfiguredWindowTitleFallsBackForInvalidConfig(t *testing.T) {
	tests := []string{
		"version: 2\ntitle: test\n",
		"version: 1\ntitle: ''\n",
		"version: 1\ntitle: |\n  first\n  second\n",
		"version: [invalid\n",
	}
	for index, content := range tests {
		path := filepath.Join(t.TempDir(), fmt.Sprintf("invalid-%d.yaml", index))
		if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
		title, err := configuredWindowTitle(path)
		if err == nil || title != defaultWindowTitle {
			t.Fatalf("content %q: title=%q err=%v", content, title, err)
		}
	}
}

func TestEnsureAppConfigMigratesBothLegacyFiles(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, legacyWindowConfigFilename), []byte("version: 1\ntitle: Migrated Title\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	legacyDingTalk := "version: 1\nenabled: true\nwebhook: https://oapi.dingtalk.com/robot/send?access_token=legacy-token\nsecret: legacy-secret\n"
	if err := os.WriteFile(filepath.Join(dir, legacyDingTalkFilename), []byte(legacyDingTalk), 0o600); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, appConfigFilename)
	document, err := ensureAppConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if document.Title != "Migrated Title" || !document.DingTalk.Enabled || document.DingTalk.Secret != "legacy-secret" || !strings.Contains(document.DingTalk.Webhook, "legacy-token") {
		t.Fatalf("legacy values were not migrated: %#v", document)
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("unified config was not created: %v", err)
	}
}

func TestUpdateDingTalkConfigPreservesTitleAndUnknownFields(t *testing.T) {
	path := filepath.Join(t.TempDir(), appConfigFilename)
	content := "version: 1\ntitle: Custom Title\nfuture_option: retained\ndingtalk:\n  enabled: false\n  future_nested: 42\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	cfg := dingTalkStoredConfig{Enabled: true, Webhook: "https://oapi.dingtalk.com/robot/send?access_token=test", Secret: "plain-secret"}
	if err := updateDingTalkConfig(path, cfg); err != nil {
		t.Fatal(err)
	}
	document, err := readAppConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if document.Title != "Custom Title" || document.Extra["future_option"] != "retained" {
		t.Fatalf("top-level fields were overwritten: %#v", document)
	}
	if document.DingTalk.Extra["future_nested"] != 42 || document.DingTalk.Secret != "plain-secret" {
		t.Fatalf("DingTalk fields were not preserved: %#v", document.DingTalk)
	}
}

func TestAppConfigConcurrentAccessRemainsReadable(t *testing.T) {
	path := filepath.Join(t.TempDir(), appConfigFilename)
	if err := writeAppConfig(path, defaultAppConfig()); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for worker := 0; worker < 8; worker++ {
		wg.Add(1)
		go func(worker int) {
			defer wg.Done()
			for index := 0; index < 20; index++ {
				cfg := dingTalkStoredConfig{Enabled: index%2 == 0, Webhook: fmt.Sprintf("https://oapi.dingtalk.com/robot/send?access_token=%d-%d", worker, index)}
				if err := updateDingTalkConfig(path, cfg); err != nil {
					t.Errorf("update failed: %v", err)
					return
				}
				if _, err := loadDingTalkConfig(path); err != nil {
					t.Errorf("load failed: %v", err)
					return
				}
			}
		}(worker)
	}
	wg.Wait()
	if _, err := readAppConfig(path); err != nil {
		t.Fatalf("final config is unreadable: %v", err)
	}
}

func TestValidateWindowTitleRejectsOversizedValue(t *testing.T) {
	if _, err := validateWindowTitle(strings.Repeat("a", maxWindowTitleRunes+1)); err == nil {
		t.Fatal("oversized title accepted")
	}
}
