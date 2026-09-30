package main

import (
	"runtime/debug"
	"testing"
)

func TestBuildDependencyVersions(t *testing.T) {
	info := &debug.BuildInfo{Deps: []*debug.Module{
		{Path: "github.com/wailsapp/wails/v2", Version: "v2.16.0"},
		{Path: "github.com/bishopfox/sliver", Version: "v1.7.4-test"},
		{
			Path:    "google.golang.org/protobuf",
			Version: "v1.0.0",
			Replace: &debug.Module{Path: "example.test/protobuf", Version: "v1.36.11-local"},
		},
	}}

	versions := buildDependencyVersions(info)
	if versions.Wails != "v2.16.0" {
		t.Fatalf("Wails = %q, want v2.16.0", versions.Wails)
	}
	if versions.Sliver != "v1.7.4-test" {
		t.Fatalf("Sliver = %q, want v1.7.4-test", versions.Sliver)
	}
	if versions.Protobuf != "v1.36.11-local" {
		t.Fatalf("Protobuf = %q, want replacement version", versions.Protobuf)
	}
}

func TestBuildDependencyVersionsHandlesMissingBuildInfo(t *testing.T) {
	versions := buildDependencyVersions(nil)
	if versions.Wails != "unknown" || versions.Sliver != "unknown" || versions.Protobuf != "unknown" {
		t.Fatalf("missing build info = %#v, want unknown versions", versions)
	}
}

func TestAppVersionIncludesCompiledDependencies(t *testing.T) {
	versions := (&App{}).AppVersion().Dependencies
	if versions.Wails == "unknown" || versions.Sliver == "unknown" || versions.Protobuf == "unknown" {
		t.Fatalf("compiled dependency versions = %#v, want all versions", versions)
	}
}
