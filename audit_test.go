package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAuditLoggerStoresConnectionIdentity(t *testing.T) {
	logger := newAuditLogger()
	logger.path = filepath.Join(t.TempDir(), "audit.log")
	logger.setIdentity("alice", "team.example:31337")
	logger.log("connect", "team.example:31337", "success")
	data, err := os.ReadFile(logger.path)
	if err != nil {
		t.Fatal(err)
	}
	var entry auditEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		t.Fatal(err)
	}
	if entry.Operator != "alice" || entry.Server != "team.example:31337" {
		t.Fatalf("audit identity = %#v", entry)
	}
	if entry.Target != "[地址已隐藏]" {
		t.Fatalf("connection target leaked: %q", entry.Target)
	}
}

func TestLogDestructiveStoresOutcomeWithoutErrorDetail(t *testing.T) {
	dir := t.TempDir()
	app := NewApp()
	app.audit.path = filepath.Join(dir, "audit.log")

	app.logDestructive("credential-delete", "record-1", errors.New("secret path C:\\private\\token"))
	data, err := os.ReadFile(app.audit.path)
	if err != nil {
		t.Fatal(err)
	}
	text := string(data)
	if !strings.Contains(text, `"detail":"failed"`) {
		t.Fatalf("audit entry does not include failed outcome: %s", text)
	}
	if strings.Contains(text, "secret") || strings.Contains(text, "private") || strings.Contains(text, "token") {
		t.Fatalf("audit entry leaked backend error detail: %s", text)
	}
}
