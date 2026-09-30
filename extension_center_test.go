package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestInstalledExtensionDetailsProducesSafeStructuredView(t *testing.T) {
	dir := t.TempDir()
	pkg := filepath.Join(dir, "sample")
	if err := os.MkdirAll(pkg, 0o755); err != nil {
		t.Fatal(err)
	}
	manifest := `{"name":"sample","version":"1.2.3","commands":[{"command_name":"sample-run","help":"run sample","entrypoint":"Run","files":[{"os":"windows","arch":"amd64","path":"sample.o"}],"arguments":[{"name":"target","type":"string","desc":"Target","optional":false}]}]}`
	if err := os.WriteFile(filepath.Join(pkg, "extension.json"), []byte(manifest), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(pkg, "sample.o"), []byte("binary"), 0o600); err != nil {
		t.Fatal(err)
	}
	details := installedExtensionDetails(dir)
	if len(details) != 1 || details[0].Kind != "bof" || details[0].Version != "1.2.3" {
		t.Fatalf("unexpected details: %#v", details)
	}
	if len(details[0].IntegritySHA) != 64 || len(details[0].Arguments) != 1 || !details[0].Arguments[0].Required {
		t.Fatalf("missing structured metadata: %#v", details[0])
	}
}

func TestExtensionExecutionRecordsAreBoundedAndDoNotStoreArguments(t *testing.T) {
	app := NewApp()
	for i := 0; i < 105; i++ {
		app.recordExtensionExecution("extension", "safe-command", "session", "success", "执行完成", time.Now())
	}
	if len(app.extensionRecords) != 100 {
		t.Fatalf("records = %d", len(app.extensionRecords))
	}
	for _, record := range app.extensionRecords {
		if record.Summary != "执行完成" {
			t.Fatalf("unsafe summary: %#v", record)
		}
	}
}
