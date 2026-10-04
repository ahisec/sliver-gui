package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestValidateOfficialClientPath(t *testing.T) {
	if _, err := validateOfficialClientPath(""); err == nil {
		t.Fatal("empty official client path was accepted")
	}
	dir := t.TempDir()
	if _, err := validateOfficialClientPath(dir); err == nil {
		t.Fatal("directory was accepted as an official client executable")
	}
	if _, err := validateOfficialClientPath(filepath.Join(dir, "missing.exe")); err == nil {
		t.Fatal("missing official client was accepted")
	}
	executable := filepath.Join(dir, "sliver-client.exe")
	if err := os.WriteFile(executable, []byte("test"), 0o600); err != nil {
		t.Fatal(err)
	}
	got, err := validateOfficialClientPath("  " + executable + "  ")
	if err != nil {
		t.Fatal(err)
	}
	want, err := filepath.Abs(executable)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("validated path = %q, want %q", got, want)
	}
}

func TestSyncOfficialOperatorConfigReplacesOnlyConfigFiles(t *testing.T) {
	root := t.TempDir()
	configs := filepath.Join(root, "configs")
	if err := os.MkdirAll(filepath.Join(configs, "nested.cfg"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(configs, "old.cfg"), []byte("old"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(configs, "history.txt"), []byte("preserve"), 0o600); err != nil {
		t.Fatal(err)
	}
	source := filepath.Join(t.TempDir(), "operator.cfg")
	content := []byte("operator-certificate-and-key")
	if err := os.WriteFile(source, content, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := syncOfficialOperatorConfig(source, root); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(configs, "current.cfg"))
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(content) {
		t.Fatalf("synced config = %q", got)
	}
	if _, err := os.Stat(filepath.Join(configs, "old.cfg")); !os.IsNotExist(err) {
		t.Fatalf("old config was not removed: %v", err)
	}
	if preserved, err := os.ReadFile(filepath.Join(configs, "history.txt")); err != nil || string(preserved) != "preserve" {
		t.Fatalf("non-config data was changed: %q, %v", preserved, err)
	}
	if info, err := os.Stat(filepath.Join(configs, "nested.cfg")); err != nil || !info.IsDir() {
		t.Fatalf("directory with cfg suffix was changed: %v", err)
	}
}

func TestRemoveOfficialOperatorConfigLeavesOtherClientData(t *testing.T) {
	root := t.TempDir()
	configs := filepath.Join(root, "configs")
	if err := os.MkdirAll(configs, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(configs, "current.cfg"), []byte("sensitive"), 0o600); err != nil {
		t.Fatal(err)
	}
	history := filepath.Join(root, "history")
	if err := os.WriteFile(history, []byte("preserve"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := removeOfficialOperatorConfig(root); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(configs, "current.cfg")); !os.IsNotExist(err) {
		t.Fatalf("temporary operator config still exists: %v", err)
	}
	if data, err := os.ReadFile(history); err != nil || string(data) != "preserve" {
		t.Fatalf("official client data was changed: %q, %v", data, err)
	}
	if err := removeOfficialOperatorConfig(root); err != nil {
		t.Fatalf("cleanup should be idempotent: %v", err)
	}
}

func TestUpdateOfficialClientPathPreservesUnifiedConfigFields(t *testing.T) {
	path := filepath.Join(t.TempDir(), appConfigFilename)
	content := strings.Join([]string{
		"version: 1",
		"title: Custom Console",
		"future_option: retained",
		"dingtalk:",
		"  enabled: true",
		"  secret: plain-secret",
		"official_client:",
		"  path: old.exe",
		"  future_nested: retained-too",
		"",
	}, "\n")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := updateOfficialClientPath(path, "  C:\\Tools\\sliver-client.exe  "); err != nil {
		t.Fatal(err)
	}
	document, err := readAppConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if document.Title != "Custom Console" || document.DingTalk.Secret != "plain-secret" || document.Extra["future_option"] != "retained" {
		t.Fatalf("unrelated config fields changed: %#v", document)
	}
	if document.OfficialClient.Path != `C:\Tools\sliver-client.exe` || document.OfficialClient.Extra["future_nested"] != "retained-too" {
		t.Fatalf("official client config was not updated safely: %#v", document.OfficialClient)
	}
}
