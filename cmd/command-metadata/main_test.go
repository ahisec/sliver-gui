package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestBuildMetadataIgnoresInstalledExtensionsAndRestoresClientRoot(t *testing.T) {
	clientRoot := t.TempDir()
	extensionDir := filepath.Join(clientRoot, "extensions", "local-test-command")
	if err := os.MkdirAll(extensionDir, 0o755); err != nil {
		t.Fatal(err)
	}
	manifest := `{"name":"local-test-command","commands":[{"command_name":"local-test-command","help":"local test"}]}`
	if err := os.WriteFile(filepath.Join(extensionDir, "extension.json"), []byte(manifest), 0o600); err != nil {
		t.Fatal(err)
	}

	const environment = "SLIVER_CLIENT_ROOT_DIR"
	previous, existed := os.LookupEnv(environment)
	if err := os.Setenv(environment, clientRoot); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if existed {
			_ = os.Setenv(environment, previous)
			return
		}
		_ = os.Unsetenv(environment)
	})

	metadata, err := buildMetadata()
	if err != nil {
		t.Fatal(err)
	}
	if _, exists := metadata["agent"]["local-test-command"]; exists {
		t.Fatal("locally installed extension leaked into official command metadata")
	}
	if current := os.Getenv(environment); current != clientRoot {
		t.Fatalf("client root was not restored: got %q, want %q", current, clientRoot)
	}
	if _, exists := metadata["agent"]["info"]; !exists {
		t.Fatal("official agent command metadata was not generated")
	}
}
