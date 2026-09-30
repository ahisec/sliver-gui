package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

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
