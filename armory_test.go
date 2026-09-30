package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestArmoryInstallDirSeparatesAliases(t *testing.T) {
	extension := armoryInstallDir("coff-loader", "extension")
	alias := armoryInstallDir("seatbelt", "alias")
	if filepath.Dir(extension) != armoryExtDir() {
		t.Fatalf("extension directory = %q", extension)
	}
	if filepath.Dir(alias) != armoryAliasDir() {
		t.Fatalf("alias directory = %q", alias)
	}
}

func TestFetchArmoryIndexAndFindPackage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, `{"aliases":[{"name":"Seatbelt","command_name":"seatbelt","repo_url":"https://github.com/sliverarmory/Seatbelt"}],"extensions":[{"name":"COFF Loader","command_name":"coff-loader","repo_url":"https://github.com/sliverarmory/COFFLoader"}]}`)
	}))
	defer server.Close()

	index, err := fetchArmoryIndex(t.Context(), server.Client(), server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if pkg, kind := findArmoryPackage(index, "Seatbelt"); pkg == nil || pkg.CommandName != "seatbelt" || kind != "alias" {
		t.Fatalf("alias lookup = %#v, %q", pkg, kind)
	}
	if pkg, kind := findArmoryPackage(index, "coff-loader"); pkg == nil || kind != "extension" {
		t.Fatalf("extension lookup = %#v, %q", pkg, kind)
	}
}

func TestArmoryPackageDownloadURLUsesCommandName(t *testing.T) {
	got, err := armoryPackageDownloadURL(armoryIndexPackage{
		CommandName: "sharp-hound-3", RepoURL: "https://github.com/sliverarmory/SharpHound3",
	})
	if err != nil {
		t.Fatal(err)
	}
	want := "https://github.com/sliverarmory/SharpHound3/releases/latest/download/sharp-hound-3.tar.gz"
	if got != want {
		t.Fatalf("download URL = %q, want %q", got, want)
	}
}

func TestValidateArmoryArchiveRequiresMatchingManifest(t *testing.T) {
	archive := testTarGz(t, map[string]string{"./alias.json": `{"name":"Seatbelt","command_name":"seatbelt"}`})
	if err := validateArmoryArchive(archive, "alias"); err != nil {
		t.Fatal(err)
	}
	if err := validateArmoryArchive(archive, "extension"); err == nil || !strings.Contains(err.Error(), "manifest mismatch") {
		t.Fatalf("expected manifest mismatch, got %v", err)
	}
}

func TestArmoryManifestInstallName(t *testing.T) {
	tests := []struct {
		name     string
		kind     string
		manifest string
		want     string
	}{
		{name: "alias command", kind: "alias", manifest: `{"command_name":"seatbelt"}`, want: "seatbelt"},
		{name: "extension display name", kind: "extension", manifest: `{"name":"COFF Loader","command_name":"coff-loader"}`, want: "COFF Loader"},
		{name: "extension package name", kind: "extension", manifest: `{"name":"Inline Execute","package_name":"inline-execute","commands":[{"command_name":"inline-execute"}]}`, want: "inline-execute"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			manifestName := "extension.json"
			if tt.kind == "alias" {
				manifestName = "alias.json"
			}
			got, err := armoryManifestInstallName(testTarGz(t, map[string]string{"./" + manifestName: tt.manifest}), tt.kind)
			if err != nil {
				t.Fatal(err)
			}
			if got != tt.want {
				t.Fatalf("install name = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestArmoryManifestInstallNameRejectsUnsafeName(t *testing.T) {
	archive := testTarGz(t, map[string]string{"./extension.json": `{"name":"../outside","command_name":"unsafe"}`})
	if _, err := armoryManifestInstallName(archive, "extension"); err == nil || !strings.Contains(err.Error(), "invalid armory package install name") {
		t.Fatalf("expected unsafe install name error, got %v", err)
	}
}

func TestInstalledArmoryNamesAndRemovalUseManifestCommands(t *testing.T) {
	home := t.TempDir()
	t.Setenv("USERPROFILE", home)
	extensionDir := filepath.Join(home, ".sliver-client", "extensions", "COFF Loader")
	if err := os.MkdirAll(extensionDir, 0700); err != nil {
		t.Fatal(err)
	}
	manifest := `{"name":"COFF Loader","commands":[{"command_name":"coff-loader"},{"command_name":"coff-loader-local"}]}`
	if err := os.WriteFile(filepath.Join(extensionDir, "extension.json"), []byte(manifest), 0600); err != nil {
		t.Fatal(err)
	}

	installed := installedExtensionNames()
	if !installed["coff-loader"] || !installed["coff-loader-local"] {
		t.Fatalf("manifest commands not detected: %#v", installed)
	}
	paths := installedArmoryPackageDirs("coff-loader")
	if len(paths) != 1 || paths[0] != extensionDir {
		t.Fatalf("remove paths = %#v, want %q", paths, extensionDir)
	}
	if got := installedExtensionManifestPath("coff-loader"); got != filepath.Join(extensionDir, "extension.json") {
		t.Fatalf("dependency manifest = %q", got)
	}
}

func testTarGz(t *testing.T, files map[string]string) []byte {
	t.Helper()
	var buffer bytes.Buffer
	gz := gzip.NewWriter(&buffer)
	tw := tar.NewWriter(gz)
	for name, content := range files {
		if err := tw.WriteHeader(&tar.Header{Name: name, Mode: 0600, Size: int64(len(content))}); err != nil {
			t.Fatal(err)
		}
		if _, err := io.WriteString(tw, content); err != nil {
			t.Fatal(err)
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := gz.Close(); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

func TestArmoryPackageNameRejectsPaths(t *testing.T) {
	for _, name := range []string{"", "../outside", `..\\outside`, "name/child"} {
		if armoryPackageNamePattern.MatchString(name) {
			t.Fatalf("unsafe package name accepted: %q", name)
		}
	}
	for _, name := range []string{"seatbelt", "community-aliases", "package.v2"} {
		if !armoryPackageNamePattern.MatchString(name) {
			t.Fatalf("valid package name rejected: %q", name)
		}
	}
}
