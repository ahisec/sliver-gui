package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

const validLocalExtensionManifest = `{
  "name":"Test Extension",
  "package_name":"test-extension",
  "version":"1.0.0",
  "commands":[{
    "command_name":"test-command",
    "help":"Test command",
    "entrypoint":"Run",
    "files":[{"os":"windows","arch":"amd64","path":"bin/test.dll"}]
  }]
}`

const legacyNameExtensionManifest = `{
  "name":"load",
  "version":"0.1.0",
  "commands":[{
    "name":"load",
    "command_name":"",
    "help":"Load command",
    "entrypoint":"GoExtensionArgs",
    "files":[{"os":"windows","arch":"amd64","path":"load.x64.dll"}]
  }]
}`

func useTemporaryExtensionHome(t *testing.T) string {
	t.Helper()
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("USERPROFILE", home)
	return home
}

func writeLocalExtensionDirectory(t *testing.T, root string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(root, "bin"), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "extension.json"), []byte(validLocalExtensionManifest), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "bin", "test.dll"), []byte("binary"), 0600); err != nil {
		t.Fatal(err)
	}
}

func TestInstallLocalExtensionFromDirectory(t *testing.T) {
	home := useTemporaryExtensionHome(t)
	source := t.TempDir()
	writeLocalExtensionDirectory(t, source)

	app := &App{}
	if err := app.InstallLocalExtension(source); err != nil {
		t.Fatal(err)
	}
	destination := filepath.Join(home, ".sliver-client", "extensions", "test-extension")
	if _, err := os.Stat(filepath.Join(destination, "bin", "test.dll")); err != nil {
		t.Fatalf("installed artifact missing: %v", err)
	}
	installed, err := app.ListInstalledExtensions()
	if err != nil {
		t.Fatal(err)
	}
	if len(installed) != 1 || installed[0].Command != "test-command" {
		t.Fatalf("installed commands = %#v", installed)
	}
	if err := app.InstallLocalExtension(source); err == nil || !strings.Contains(err.Error(), "已安装") {
		t.Fatalf("duplicate install returned %v", err)
	}
}

func TestInstallLocalExtensionFromArchive(t *testing.T) {
	useTemporaryExtensionHome(t)
	archive := filepath.Join(t.TempDir(), "test-extension.tar.gz")
	data := testTarGz(t, map[string]string{
		"./extension.json": validLocalExtensionManifest,
		"./bin/test.dll":   "binary",
	})
	if err := os.WriteFile(archive, data, 0600); err != nil {
		t.Fatal(err)
	}
	if err := (&App{}).InstallLocalExtension(archive); err != nil {
		t.Fatal(err)
	}
}

func TestInstallLocalExtensionAcceptsThirdPartyCommandNameAlias(t *testing.T) {
	useTemporaryExtensionHome(t)
	archive := filepath.Join(t.TempDir(), "load-0.1.0.tar.gz")
	data := testTarGz(t, map[string]string{
		"./extension.json": legacyNameExtensionManifest,
		"./load.x64.dll":   "binary",
	})
	if err := os.WriteFile(archive, data, 0600); err != nil {
		t.Fatal(err)
	}
	app := &App{}
	if err := app.InstallLocalExtension(archive); err != nil {
		t.Fatal(err)
	}
	installed, err := app.ListInstalledExtensions()
	if err != nil {
		t.Fatal(err)
	}
	if len(installed) != 1 || installed[0].Command != "load" {
		t.Fatalf("installed commands = %#v", installed)
	}
}

func TestOfficialCommandNameTakesPriorityOverThirdPartyAlias(t *testing.T) {
	manifestPath := filepath.Join(t.TempDir(), "extension.json")
	data := `{"name":"test","commands":[{"name":"legacy","command_name":"official","help":"test","files":[{"os":"windows","arch":"amd64","path":"test.dll"}]}]}`
	if err := os.WriteFile(manifestPath, []byte(data), 0600); err != nil {
		t.Fatal(err)
	}
	manifest, err := loadManifest(manifestPath)
	if err != nil {
		t.Fatal(err)
	}
	if got := manifest.commands()[0].CommandName; got != "official" {
		t.Fatalf("command name = %q, want official", got)
	}
}

func TestInstallLocalExtensionRejectsMissingManifestAndArtifact(t *testing.T) {
	useTemporaryExtensionHome(t)
	missingManifest := t.TempDir()
	if err := (&App{}).InstallLocalExtension(missingManifest); err == nil || !strings.Contains(err.Error(), "extension.json") {
		t.Fatalf("missing manifest returned %v", err)
	}

	missingArtifact := t.TempDir()
	if err := os.WriteFile(filepath.Join(missingArtifact, "extension.json"), []byte(validLocalExtensionManifest), 0600); err != nil {
		t.Fatal(err)
	}
	if err := (&App{}).InstallLocalExtension(missingArtifact); err == nil || !strings.Contains(err.Error(), "引用的文件不存在") {
		t.Fatalf("missing artifact returned %v", err)
	}
}

func TestExtractLocalExtensionArchiveRejectsTraversalAndLinks(t *testing.T) {
	for _, tc := range []struct {
		name     string
		header   tar.Header
		contents string
	}{
		{name: "traversal", header: tar.Header{Name: "../outside", Typeflag: tar.TypeReg, Mode: 0600, Size: 1}, contents: "x"},
		{name: "symlink", header: tar.Header{Name: "link", Typeflag: tar.TypeSymlink, Linkname: "../outside"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var archive bytes.Buffer
			gz := gzip.NewWriter(&archive)
			tw := tar.NewWriter(gz)
			if err := tw.WriteHeader(&tc.header); err != nil {
				t.Fatal(err)
			}
			if tc.contents != "" {
				if _, err := tw.Write([]byte(tc.contents)); err != nil {
					t.Fatal(err)
				}
			}
			if err := tw.Close(); err != nil {
				t.Fatal(err)
			}
			if err := gz.Close(); err != nil {
				t.Fatal(err)
			}
			err := extractLocalExtensionArchive(bytes.NewReader(archive.Bytes()), t.TempDir())
			if err == nil {
				t.Fatal("unsafe archive accepted")
			}
		})
	}
}

func TestInstallLocalExtensionExplainsRemoteLinuxPathOnWindows(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Windows-specific path diagnostic")
	}
	err := (&App{}).InstallLocalExtension("/home/hacker/sliver/package.tar.gz")
	if err == nil || !strings.Contains(err.Error(), "Teamserver") || !strings.Contains(err.Error(), "Windows") {
		t.Fatalf("remote path returned unhelpful error: %v", err)
	}
}
