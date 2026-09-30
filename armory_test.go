package main

import (
	"path/filepath"
	"testing"
)

func TestArmoryInstallDirSeparatesAliases(t *testing.T) {
	extension := armoryInstallDir("seatbelt")
	alias := armoryInstallDir("community-aliases")
	if filepath.Dir(extension) != armoryExtDir() {
		t.Fatalf("extension directory = %q", extension)
	}
	if filepath.Dir(alias) != armoryAliasDir() {
		t.Fatalf("alias directory = %q", alias)
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
