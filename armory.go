package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/bishopfox/sliver/util/minisign"
)

var armoryPackageNamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`)

// ─── Armory — Extension Package Manager ──────────────────────────────────────
//
// The Sliver "Armory" is a client-side package manager for extensions and
// aliases. It fetches a JSON index from a GitHub-hosted repository listing
// available packages with their release download URLs, then extracts .tar.gz
// archives into ~/.sliver-client/extensions/ or ~/.sliver-client/aliases/.
//
// This implementation replicates the official sliver-client armory flow:
//   1. Fetch armory index (JSON array of packages from GitHub API)
//   2. Present available packages to the operator
//   3. Download the matching release asset (.tar.gz)
//   4. Extract to the correct local directory
//
// The official index is verified with Sliver's embedded Armory trust root;
// each package is then verified with the public key from that signed index.

const (
	defaultArmoryIndexURL  = "https://api.github.com/repos/sliverarmory/armory/releases/latest"
	defaultArmoryPublicKey = "RWSBpxpRWDrD7Fe+VvRE3c2VEDC2NK80rlNCj+BX0gz44Xw07r6KQD9L"
	// HTTP timeout for armory operations
	armoryHTTPTimeout    = 120 * time.Second
	armoryMaxIndexSize   = 4 * 1024 * 1024
	armoryMaxPackageSize = 256 * 1024 * 1024
)

// ArmoryPackage represents an installable extension/alias from the armory.
type ArmoryPackage struct {
	Name        string `json:"name"`
	CommandName string `json:"commandName"`
	Description string `json:"description"`
	URL         string `json:"url"`
	Version     string `json:"version"`
	Stars       int    `json:"stars"`
	Type        string `json:"type"` // "extension" or "alias"
	Installed   bool   `json:"installed"`
}

type armoryIndex struct {
	Aliases    []armoryIndexPackage `json:"aliases"`
	Extensions []armoryIndexPackage `json:"extensions"`
}

type armoryIndexPackage struct {
	Name        string `json:"name"`
	CommandName string `json:"command_name"`
	RepoURL     string `json:"repo_url"`
	PublicKey   string `json:"public_key"`
}

type armoryAliasManifest struct {
	CommandName string `json:"command_name"`
}

type armoryGitHubRelease struct {
	TagName string `json:"tag_name"`
	Assets  []struct {
		Name string `json:"name"`
		URL  string `json:"browser_download_url"`
	} `json:"assets"`
}

// ArmoryList fetches the armory index and returns available packages.
func (a *App) ArmoryList() ([]ArmoryPackage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), armoryHTTPTimeout)
	defer cancel()
	client := &http.Client{}
	index, err := fetchOfficialArmoryIndex(ctx, client, defaultArmoryIndexURL)
	if err != nil {
		return nil, err
	}

	installed := installedExtensionNames()
	packages := make([]ArmoryPackage, 0, len(index.Aliases)+len(index.Extensions))
	appendPackages := func(entries []armoryIndexPackage, kind string) {
		for _, entry := range entries {
			if !armoryPackageNamePattern.MatchString(entry.CommandName) {
				continue
			}
			packages = append(packages, ArmoryPackage{
				Name: entry.Name, CommandName: entry.CommandName,
				Description: "来自 Sliver 官方 Armory 索引", URL: entry.RepoURL,
				Version: "安装时获取最新版本", Type: kind,
				Installed: installed[strings.ToLower(entry.CommandName)],
			})
		}
	}
	appendPackages(index.Aliases, "alias")
	appendPackages(index.Extensions, "extension")
	return packages, nil
}

// ArmoryInstall downloads and installs a package by name from the armory.
func (a *App) ArmoryInstall(packageName string) error {
	packageName = strings.TrimSpace(packageName)
	if err := validateArmoryPackageArgument(packageName); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), armoryHTTPTimeout)
	defer cancel()
	client := &http.Client{}
	index, err := fetchOfficialArmoryIndex(ctx, client, defaultArmoryIndexURL)
	if err != nil {
		return err
	}
	entry, kind := findArmoryPackage(index, packageName)
	if entry == nil {
		return fmt.Errorf("package '%s' not found in official armory index", packageName)
	}
	if !armoryPackageNamePattern.MatchString(entry.CommandName) {
		return fmt.Errorf("official armory index contains an invalid command name for %q", packageName)
	}
	archive, signature, err := fetchArmoryPackage(ctx, client, *entry)
	if err != nil {
		return err
	}
	if err := verifyArmorySignature(entry.PublicKey, archive, signature); err != nil {
		return err
	}
	installName, err := armoryManifestInstallName(archive, kind)
	if err != nil {
		return err
	}
	return installArmoryArchive(archive, installName, kind)
}

func fetchOfficialArmoryIndex(ctx context.Context, client *http.Client, releaseURL string) (*armoryIndex, error) {
	return fetchSignedArmoryIndex(ctx, client, releaseURL, defaultArmoryPublicKey)
}

func fetchSignedArmoryIndex(ctx context.Context, client *http.Client, releaseURL, trustedPublicKey string) (*armoryIndex, error) {
	releaseData, err := armoryDownload(ctx, client, releaseURL, armoryMaxIndexSize, "fetch armory release")
	if err != nil {
		return nil, err
	}
	var release armoryGitHubRelease
	if err := json.Unmarshal(releaseData, &release); err != nil {
		return nil, fmt.Errorf("parse armory release: %w", err)
	}
	assets := map[string]string{}
	for _, asset := range release.Assets {
		assets[asset.Name] = asset.URL
	}
	indexURL, sigURL := assets["armory.json"], assets["armory.minisig"]
	if indexURL == "" || sigURL == "" {
		return nil, fmt.Errorf("official armory release is missing armory.json or armory.minisig")
	}
	indexData, err := armoryDownload(ctx, client, indexURL, armoryMaxIndexSize, "download armory index")
	if err != nil {
		return nil, err
	}
	sigData, err := armoryDownload(ctx, client, sigURL, 64*1024, "download armory index signature")
	if err != nil {
		return nil, err
	}
	if err := verifyArmorySignature(trustedPublicKey, indexData, sigData); err != nil {
		return nil, fmt.Errorf("verify armory index: %w", err)
	}
	var index armoryIndex
	if err := json.Unmarshal(indexData, &index); err != nil {
		return nil, fmt.Errorf("parse armory index: %w", err)
	}
	if len(index.Aliases)+len(index.Extensions) == 0 {
		return nil, fmt.Errorf("parse armory index: index contains no packages")
	}
	return &index, nil
}

func fetchArmoryPackage(ctx context.Context, client *http.Client, pkg armoryIndexPackage) ([]byte, []byte, error) {
	if strings.TrimSpace(pkg.PublicKey) == "" {
		return nil, nil, fmt.Errorf("package '%s' has no minisign public key", pkg.CommandName)
	}
	u, err := url.Parse(pkg.RepoURL)
	if err != nil || !strings.EqualFold(u.Hostname(), "github.com") {
		return nil, nil, fmt.Errorf("invalid armory package repository URL")
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) != 2 {
		return nil, nil, fmt.Errorf("invalid armory package repository URL")
	}
	releaseURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", parts[0], parts[1])
	releaseData, err := armoryDownload(ctx, client, releaseURL, armoryMaxIndexSize, "fetch package release")
	if err != nil {
		return nil, nil, err
	}
	var release armoryGitHubRelease
	if err := json.Unmarshal(releaseData, &release); err != nil {
		return nil, nil, fmt.Errorf("parse package release: %w", err)
	}
	assets := map[string]string{}
	for _, asset := range release.Assets {
		assets[asset.Name] = asset.URL
	}
	archiveURL := assets[pkg.CommandName+".tar.gz"]
	sigURL := assets[pkg.CommandName+".minisig"]
	if archiveURL == "" || sigURL == "" {
		return nil, nil, fmt.Errorf("package release is missing archive or minisign asset")
	}
	archive, err := armoryDownload(ctx, client, archiveURL, armoryMaxPackageSize, "download package")
	if err != nil {
		return nil, nil, err
	}
	signature, err := armoryDownload(ctx, client, sigURL, 64*1024, "download package signature")
	return archive, signature, err
}

func verifyArmorySignature(publicKeyText string, data, signature []byte) error {
	var publicKey minisign.PublicKey
	if err := publicKey.UnmarshalText([]byte(strings.TrimSpace(publicKeyText))); err != nil {
		return fmt.Errorf("invalid minisign public key: %w", err)
	}
	if len(signature) == 0 {
		return fmt.Errorf("minisign signature is missing")
	}
	if minisign.Verify(publicKey, data, signature) {
		return nil
	}
	// Self-hosted package metadata may transport the minisig as base64.
	decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(signature)))
	if err == nil && minisign.Verify(publicKey, data, decoded) {
		return nil
	}
	return fmt.Errorf("minisign signature verification failed")
}

// ArmoryRemove uninstalls a package by deleting its directory.
func (a *App) ArmoryRemove(packageName string) error {
	if !armoryPackageNamePattern.MatchString(packageName) {
		return fmt.Errorf("invalid package name")
	}
	paths := installedArmoryPackageDirs(packageName)
	removed := false
	for _, installDir := range paths {
		if _, err := os.Stat(installDir); err == nil {
			if err := os.RemoveAll(installDir); err != nil {
				return err
			}
			removed = true
		}
	}
	if !removed {
		return fmt.Errorf("package '%s' is not installed", packageName)
	}
	return nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// armoryExtDir returns the path to ~/.sliver-client/extensions/
func armoryExtDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".sliver-client", "extensions")
}

// armoryAliasDir returns the path to ~/.sliver-client/aliases/
func armoryAliasDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".sliver-client", "aliases")
}

func armoryInstallDir(packageName, kind string) string {
	root := armoryExtDir()
	if kind == "alias" {
		root = armoryAliasDir()
	}
	return filepath.Join(root, packageName)
}

// installedExtensionNames returns a set of already-installed extension names.
func installedExtensionNames() map[string]bool {
	installed := make(map[string]bool)
	collectInstalledArmoryNames(armoryExtDir(), "extension", installed)
	collectInstalledArmoryNames(armoryAliasDir(), "alias", installed)
	return installed
}

func collectInstalledArmoryNames(root, kind string, installed map[string]bool) {
	entries, err := os.ReadDir(root)
	if err != nil {
		return
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		installed[strings.ToLower(entry.Name())] = true
		manifestName := "extension.json"
		if kind == "alias" {
			manifestName = "alias.json"
		}
		data, err := os.ReadFile(filepath.Join(root, entry.Name(), manifestName))
		if err != nil {
			continue
		}
		if kind == "alias" {
			var manifest armoryAliasManifest
			if json.Unmarshal(data, &manifest) == nil && manifest.CommandName != "" {
				installed[strings.ToLower(manifest.CommandName)] = true
			}
			continue
		}
		var manifest extManifest
		if json.Unmarshal(data, &manifest) != nil {
			continue
		}
		for _, command := range manifest.commands() {
			if command.CommandName != "" {
				installed[strings.ToLower(command.CommandName)] = true
			}
		}
	}
}

func installedArmoryPackageDirs(packageName string) []string {
	wanted := strings.ToLower(packageName)
	seen := make(map[string]bool)
	paths := make([]string, 0, 2)
	for _, candidate := range []struct{ root, kind string }{{armoryExtDir(), "extension"}, {armoryAliasDir(), "alias"}} {
		entries, err := os.ReadDir(candidate.root)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			dir := filepath.Join(candidate.root, entry.Name())
			matched := strings.EqualFold(entry.Name(), packageName)
			manifestName := "extension.json"
			if candidate.kind == "alias" {
				manifestName = "alias.json"
			}
			data, err := os.ReadFile(filepath.Join(dir, manifestName))
			if err == nil && candidate.kind == "alias" {
				var manifest armoryAliasManifest
				matched = matched || (json.Unmarshal(data, &manifest) == nil && strings.ToLower(manifest.CommandName) == wanted)
			} else if err == nil {
				var manifest extManifest
				if json.Unmarshal(data, &manifest) == nil {
					matched = matched || strings.EqualFold(manifest.Name, packageName) || strings.EqualFold(manifest.PackageName, packageName)
					for _, command := range manifest.commands() {
						matched = matched || strings.ToLower(command.CommandName) == wanted
					}
				}
			}
			if matched && !seen[dir] {
				seen[dir] = true
				paths = append(paths, dir)
			}
		}
	}
	return paths
}

func fetchArmoryIndex(ctx context.Context, client *http.Client, indexURL string) (*armoryIndex, error) {
	body, err := armoryDownload(ctx, client, indexURL, armoryMaxIndexSize, "fetch armory index")
	if err != nil {
		return nil, err
	}
	var index armoryIndex
	if err := json.Unmarshal(body, &index); err != nil {
		return nil, fmt.Errorf("parse armory index: %w", err)
	}
	if len(index.Aliases)+len(index.Extensions) == 0 {
		return nil, fmt.Errorf("parse armory index: index contains no packages")
	}
	return &index, nil
}

func armoryDownload(ctx context.Context, client *http.Client, requestURL string, limit int64, operation string) ([]byte, error) {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", operation, err)
		}
		req.Header.Set("Accept", "application/octet-stream, application/json")
		req.Header.Set("User-Agent", "sliver-gui/1.0")
		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			if attempt < 2 {
				select {
				case <-time.After(time.Duration(attempt+1) * time.Second):
				case <-ctx.Done():
					return nil, fmt.Errorf("%s: %w", operation, ctx.Err())
				}
				continue
			}
			break
		}
		body, readErr := io.ReadAll(io.LimitReader(resp.Body, limit+1))
		resp.Body.Close()
		if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests {
			return nil, fmt.Errorf("%s: GitHub rate limit HTTP %d", operation, resp.StatusCode)
		}
		if resp.StatusCode == http.StatusNotFound {
			return nil, fmt.Errorf("%s: asset not found HTTP 404", operation)
		}
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return nil, fmt.Errorf("%s: HTTP %d", operation, resp.StatusCode)
		}
		if readErr != nil {
			lastErr = readErr
			continue
		}
		if int64(len(body)) > limit {
			return nil, fmt.Errorf("%s: response exceeds size limit", operation)
		}
		return body, nil
	}
	return nil, fmt.Errorf("%s: %w", operation, lastErr)
}

func findArmoryPackage(index *armoryIndex, name string) (*armoryIndexPackage, string) {
	for i := range index.Aliases {
		entry := &index.Aliases[i]
		if strings.EqualFold(entry.CommandName, name) || strings.EqualFold(entry.Name, name) {
			return entry, "alias"
		}
	}
	for i := range index.Extensions {
		entry := &index.Extensions[i]
		if strings.EqualFold(entry.CommandName, name) || strings.EqualFold(entry.Name, name) {
			return entry, "extension"
		}
	}
	return nil, ""
}

func armoryPackageDownloadURL(pkg armoryIndexPackage) (string, error) {
	u, err := url.Parse(pkg.RepoURL)
	if err != nil || !strings.EqualFold(u.Hostname(), "github.com") {
		return "", fmt.Errorf("invalid armory package repository URL")
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", fmt.Errorf("invalid armory package repository URL")
	}
	if !armoryPackageNamePattern.MatchString(pkg.CommandName) {
		return "", fmt.Errorf("invalid armory package command name")
	}
	return fmt.Sprintf("https://github.com/%s/%s/releases/latest/download/%s.tar.gz", parts[0], parts[1], pkg.CommandName), nil
}

func validateArmoryArchive(data []byte, kind string) error {
	_, err := armoryManifestInstallName(data, kind)
	return err
}

func armoryManifestInstallName(data []byte, kind string) (string, error) {
	wanted := "extension.json"
	if kind == "alias" {
		wanted = "alias.json"
	}
	gz, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("validate package archive: %w", err)
	}
	defer gz.Close()
	tr := tar.NewReader(gz)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", fmt.Errorf("validate package archive: %w", err)
		}
		if strings.TrimPrefix(filepath.ToSlash(filepath.Clean(header.Name)), "./") != wanted {
			continue
		}
		manifestData, err := io.ReadAll(io.LimitReader(tr, 1024*1024+1))
		if err != nil {
			return "", fmt.Errorf("validate package archive: read %s: %w", wanted, err)
		}
		if len(manifestData) > 1024*1024 {
			return "", fmt.Errorf("validate package archive: %s exceeds size limit", wanted)
		}
		installName := ""
		if kind == "alias" {
			var manifest armoryAliasManifest
			if err := json.Unmarshal(manifestData, &manifest); err != nil {
				return "", fmt.Errorf("validate package archive: parse %s: %w", wanted, err)
			}
			installName = manifest.CommandName
		} else {
			var manifest extManifest
			if err := json.Unmarshal(manifestData, &manifest); err != nil {
				return "", fmt.Errorf("validate package archive: parse %s: %w", wanted, err)
			}
			installName = manifest.PackageName
			if installName == "" {
				installName = manifest.Name
			}
		}
		if err := validateArmoryInstallName(installName); err != nil {
			return "", err
		}
		return installName, nil
	}
	return "", fmt.Errorf("package manifest mismatch: expected %s", wanted)
}

func validateArmoryInstallName(name string) error {
	if name == "" || name == "." || name == ".." || filepath.Base(name) != name || strings.ContainsAny(name, `/\\`) {
		return fmt.Errorf("invalid armory package install name")
	}
	return nil
}

func validateArmoryPackageArgument(name string) error {
	lower := strings.ToLower(strings.TrimSpace(name))
	looksLikeArchive := strings.HasSuffix(lower, ".tar.gz") || strings.HasSuffix(lower, ".tgz")
	looksLikePath := filepath.IsAbs(name) || strings.ContainsAny(name, `/\\`) ||
		(len(name) >= 2 && name[1] == ':')
	if looksLikeArchive || looksLikePath {
		return fmt.Errorf("armory install 需要官方 Armory 索引中的包名，不能使用文件路径；该命令读取 GUI 客户端本机的 Armory 索引，无法读取 Teamserver 或目标主机路径 %q。请先执行 armory 查看可安装包", name)
	}
	if name == "" {
		return fmt.Errorf("Armory 包名不能为空；请先执行 armory 查看可安装包")
	}
	return nil
}

func installArmoryArchive(data []byte, packageName, kind string) error {
	root := armoryExtDir()
	if kind == "alias" {
		root = armoryAliasDir()
	}
	if err := os.MkdirAll(root, 0700); err != nil {
		return fmt.Errorf("create install root: %w", err)
	}
	tempDir, err := os.MkdirTemp(root, ".armory-install-")
	if err != nil {
		return fmt.Errorf("create temporary install dir: %w", err)
	}
	defer os.RemoveAll(tempDir)
	if err := extractTarGz(bytes.NewReader(data), tempDir); err != nil {
		return fmt.Errorf("extract package: %w", err)
	}
	installDir := armoryInstallDir(packageName, kind)
	backupDir := installDir + ".previous"
	_ = os.RemoveAll(backupDir)
	if _, err := os.Stat(installDir); err == nil {
		if err := os.Rename(installDir, backupDir); err != nil {
			return fmt.Errorf("replace installed package: %w", err)
		}
	}
	if err := os.Rename(tempDir, installDir); err != nil {
		_ = os.Rename(backupDir, installDir)
		return fmt.Errorf("activate package: %w", err)
	}
	_ = os.RemoveAll(backupDir)
	return nil
}

// extractTarGz extracts a .tar.gz stream into destDir with zip-slip protection.
func extractTarGz(r io.Reader, destDir string) error {
	gz, err := gzip.NewReader(r)
	if err != nil {
		return fmt.Errorf("gzip reader: %w", err)
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("tar read: %w", err)
		}

		// Zip-slip protection: allow the archive root itself ("./"), but no
		// entry may resolve above the temporary install directory.
		target := filepath.Join(destDir, header.Name)
		relative, relErr := filepath.Rel(destDir, target)
		if relErr != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(os.PathSeparator)) || filepath.IsAbs(relative) {
			return fmt.Errorf("zip-slip detected: %s", header.Name)
		}

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return fmt.Errorf("mkdir %s: %w", target, err)
			}
		case tar.TypeReg:
			// Ensure parent directory exists
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return fmt.Errorf("mkdir parent %s: %w", target, err)
			}
			f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return fmt.Errorf("create %s: %w", target, err)
			}
			// Limit extraction size to 100MB per file to prevent resource exhaustion
			limited := io.LimitReader(tr, 100*1024*1024)
			if _, err := io.Copy(f, limited); err != nil {
				f.Close()
				return fmt.Errorf("write %s: %w", target, err)
			}
			f.Close()
		default:
			return fmt.Errorf("unsupported archive entry type: %s", header.Name)
		}
	}
	return nil
}
