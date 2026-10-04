package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/bishopfox/sliver/util/minisign"
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

func TestExtractTarGzAllowsArchiveRoot(t *testing.T) {
	var buffer bytes.Buffer
	gz := gzip.NewWriter(&buffer)
	tw := tar.NewWriter(gz)
	if err := tw.WriteHeader(&tar.Header{Name: "./", Typeflag: tar.TypeDir, Mode: 0700}); err != nil {
		t.Fatal(err)
	}
	content := "manifest"
	if err := tw.WriteHeader(&tar.Header{Name: "./extension.json", Typeflag: tar.TypeReg, Mode: 0600, Size: int64(len(content))}); err != nil {
		t.Fatal(err)
	}
	if _, err := io.WriteString(tw, content); err != nil {
		t.Fatal(err)
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := gz.Close(); err != nil {
		t.Fatal(err)
	}
	destination := t.TempDir()
	if err := extractTarGz(bytes.NewReader(buffer.Bytes()), destination); err != nil {
		t.Fatal(err)
	}
	if got, err := os.ReadFile(filepath.Join(destination, "extension.json")); err != nil || string(got) != content {
		t.Fatalf("extracted manifest = %q, %v", got, err)
	}
}

func TestExtractTarGzRejectsTraversalAndLinks(t *testing.T) {
	for _, header := range []tar.Header{
		{Name: "../outside", Typeflag: tar.TypeReg, Mode: 0600, Size: 1},
		{Name: "./link", Typeflag: tar.TypeSymlink, Linkname: "../outside"},
	} {
		var buffer bytes.Buffer
		gz := gzip.NewWriter(&buffer)
		tw := tar.NewWriter(gz)
		if err := tw.WriteHeader(&header); err != nil {
			t.Fatal(err)
		}
		if header.Typeflag == tar.TypeReg {
			if _, err := io.WriteString(tw, "x"); err != nil {
				t.Fatal(err)
			}
		}
		if err := tw.Close(); err != nil {
			t.Fatal(err)
		}
		if err := gz.Close(); err != nil {
			t.Fatal(err)
		}
		if err := extractTarGz(bytes.NewReader(buffer.Bytes()), t.TempDir()); err == nil {
			t.Fatalf("unsafe entry accepted: %s", header.Name)
		}
	}
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

func TestValidateArmoryPackageArgumentExplainsFilePaths(t *testing.T) {
	for _, name := range []string{
		"/home/hacker/sliver/Sliver-Evasion-Suite-0.2.0.tar.gz",
		`C:\\Users\\operator\\package.tar.gz`,
		`\\\\server\\share\\package.tgz`,
		"relative/package.tar.gz",
	} {
		err := validateArmoryPackageArgument(name)
		if err == nil || !strings.Contains(err.Error(), "不能使用文件路径") || !strings.Contains(err.Error(), "Teamserver") {
			t.Fatalf("path %q returned unhelpful error: %v", name, err)
		}
	}
}

func TestValidateArmoryPackageArgumentAcceptsIndexNames(t *testing.T) {
	for _, name := range []string{"seatbelt", "community-aliases", "package.v2", "Nano Dump"} {
		if err := validateArmoryPackageArgument(name); err != nil {
			t.Fatalf("valid package name %q rejected: %v", name, err)
		}
	}
}

func TestVerifyArmorySignature(t *testing.T) {
	publicKey, privateKey, err := minisign.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}
	publicText, err := publicKey.MarshalText()
	if err != nil {
		t.Fatal(err)
	}
	message := []byte("signed armory package")
	signature := minisign.Sign(privateKey, message)
	if err := verifyArmorySignature(string(publicText), message, signature); err != nil {
		t.Fatalf("valid signature rejected: %v", err)
	}
	if err := verifyArmorySignature(string(publicText), []byte("tampered"), signature); err == nil {
		t.Fatal("tampered package signature accepted")
	}
	if err := verifyArmorySignature("", message, signature); err == nil {
		t.Fatal("missing public key accepted")
	}
}

func TestFetchSignedArmoryIndexVerifiesReleaseAssets(t *testing.T) {
	publicKey, privateKey, err := minisign.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}
	publicText, err := publicKey.MarshalText()
	if err != nil {
		t.Fatal(err)
	}
	indexData := []byte(`{"aliases":[{"name":"Seatbelt","command_name":"seatbelt","repo_url":"https://github.com/sliverarmory/Seatbelt","public_key":"package-key"}]}`)
	signature := minisign.Sign(privateKey, indexData)
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/release":
			fmt.Fprintf(w, `{"assets":[{"name":"armory.json","browser_download_url":%q},{"name":"armory.minisig","browser_download_url":%q}]}`, server.URL+"/armory.json", server.URL+"/armory.minisig")
		case "/armory.json":
			_, _ = w.Write(indexData)
		case "/armory.minisig":
			_, _ = w.Write(signature)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	index, err := fetchSignedArmoryIndex(t.Context(), server.Client(), server.URL+"/release", string(publicText))
	if err != nil {
		t.Fatal(err)
	}
	if len(index.Aliases) != 1 || index.Aliases[0].CommandName != "seatbelt" {
		t.Fatalf("index = %#v", index)
	}
	indexData[0] = 'X'
	if _, err := fetchSignedArmoryIndex(t.Context(), server.Client(), server.URL+"/release", string(publicText)); err == nil {
		t.Fatal("tampered signed index accepted")
	}
}

func TestOfficialArmoryIndexSignature(t *testing.T) {
	if os.Getenv("SLIVER_GUI_TEST_OFFICIAL_ARMORY") != "1" {
		t.Skip("set SLIVER_GUI_TEST_OFFICIAL_ARMORY=1 for the live trust-chain check")
	}
	ctx, cancel := context.WithTimeout(t.Context(), 30*time.Second)
	defer cancel()
	index, err := fetchOfficialArmoryIndex(ctx, &http.Client{}, defaultArmoryIndexURL)
	if err != nil {
		t.Fatal(err)
	}
	if len(index.Aliases)+len(index.Extensions) == 0 {
		t.Fatal("verified official index contains no packages")
	}
}

func TestOfficialArmoryPackageSignature(t *testing.T) {
	if os.Getenv("SLIVER_GUI_TEST_OFFICIAL_ARMORY") != "1" {
		t.Skip("set SLIVER_GUI_TEST_OFFICIAL_ARMORY=1 for the live package check")
	}
	ctx, cancel := context.WithTimeout(t.Context(), 90*time.Second)
	defer cancel()
	client := &http.Client{}
	index, err := fetchOfficialArmoryIndex(ctx, client, defaultArmoryIndexURL)
	if err != nil {
		t.Fatal(err)
	}
	if len(index.Aliases) == 0 {
		t.Fatal("official index contains no aliases to verify")
	}
	entry := index.Aliases[0]
	archive, signature, err := fetchArmoryPackage(ctx, client, entry)
	if err != nil {
		t.Fatal(err)
	}
	if err := verifyArmorySignature(entry.PublicKey, archive, signature); err != nil {
		t.Fatal(err)
	}
	if err := validateArmoryArchive(archive, "alias"); err != nil {
		t.Fatal(err)
	}
}

func TestOfficialMimikatzPackageTrustChain(t *testing.T) {
	if os.Getenv("SLIVER_GUI_TEST_OFFICIAL_ARMORY") != "1" {
		t.Skip("set SLIVER_GUI_TEST_OFFICIAL_ARMORY=1 for the live package check")
	}
	ctx, cancel := context.WithTimeout(t.Context(), 120*time.Second)
	defer cancel()
	client := &http.Client{}
	index, err := fetchOfficialArmoryIndex(ctx, client, defaultArmoryIndexURL)
	if err != nil {
		t.Fatal(err)
	}
	entry, kind := findArmoryPackage(index, "mimikatz")
	if entry == nil || kind != "extension" {
		t.Fatalf("mimikatz extension missing from official index: %#v, %q", entry, kind)
	}
	archive, signature, err := fetchArmoryPackage(ctx, client, *entry)
	if err != nil {
		t.Fatal(err)
	}
	if err := verifyArmorySignature(entry.PublicKey, archive, signature); err != nil {
		t.Fatal(err)
	}
	name, err := armoryManifestInstallName(archive, kind)
	if err != nil {
		t.Fatal(err)
	}
	if name != "mimikatz" {
		t.Fatalf("install name = %q, want mimikatz", name)
	}
}
