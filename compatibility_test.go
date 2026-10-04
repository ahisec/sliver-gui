package main

import (
	"errors"
	"testing"
)

func TestUnavailableCapability(t *testing.T) {
	wantErr := errors.New("rpc is not implemented")
	item := unavailableCapability("builders", "外部 Builder", wantErr)

	if item.ID != "builders" {
		t.Fatalf("ID = %q, want %q", item.ID, "builders")
	}
	if item.Label != "外部 Builder" {
		t.Fatalf("Label = %q, want %q", item.Label, "外部 Builder")
	}
	if item.Status != capabilityUnavailable {
		t.Fatalf("Status = %q, want %q", item.Status, capabilityUnavailable)
	}
	if item.Summary == "" {
		t.Fatal("Summary should explain that the capability is unavailable")
	}
	if item.Error != wantErr.Error() {
		t.Fatalf("Error = %q, want %q", item.Error, wantErr.Error())
	}
	if len(item.Details) != 0 {
		t.Fatalf("Details = %v, want no details", item.Details)
	}
}

func TestCapabilityStatusesAreDistinct(t *testing.T) {
	statuses := []string{capabilityAvailable, capabilityEmpty, capabilityUnavailable}
	seen := make(map[string]bool, len(statuses))
	for _, status := range statuses {
		if status == "" {
			t.Fatal("capability status must not be empty")
		}
		if seen[status] {
			t.Fatalf("duplicate capability status %q", status)
		}
		seen[status] = true
	}
}

func TestParseSemanticVersionAcceptsGoPseudoVersion(t *testing.T) {
	got, ok := parseSemanticVersion("v1.7.4-0.20260715053412-e53f66de72b9")
	if !ok {
		t.Fatal("expected pseudo-version to parse")
	}
	if got != (semanticVersion{major: 1, minor: 7, patch: 4}) {
		t.Fatalf("version = %+v, want 1.7.4", got)
	}
}

func TestNegotiateServerVersion(t *testing.T) {
	tests := []struct {
		name       string
		dependency string
		server     VersionInfo
		known      bool
		wantMode   string
	}{
		{name: "matched", dependency: "v1.7.4-0.20260715053412-deadbeef", server: VersionInfo{Major: 1, Minor: 7, Patch: 4}, known: true, wantMode: versionModeMatched},
		{name: "newer server", dependency: "v1.7.4", server: VersionInfo{Major: 1, Minor: 8, Patch: 0}, known: true, wantMode: versionModeForward},
		{name: "older server", dependency: "v1.7.4", server: VersionInfo{Major: 1, Minor: 6, Patch: 9}, known: true, wantMode: versionModeBackward},
		{name: "major mismatch", dependency: "v1.7.4", server: VersionInfo{Major: 2, Minor: 0, Patch: 0}, known: true, wantMode: versionModeIncompatible},
		{name: "unknown dependency", dependency: "unknown", server: VersionInfo{Major: 1, Minor: 7, Patch: 4}, known: true, wantMode: versionModeUnknown},
		{name: "unknown server", dependency: "v1.7.4", known: false, wantMode: versionModeUnknown},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := negotiateServerVersion(test.dependency, test.server, test.known)
			if got.Mode != test.wantMode {
				t.Fatalf("Mode = %q, want %q", got.Mode, test.wantMode)
			}
			if !got.ContinueKnownRPCs {
				t.Fatal("known RPCs should remain enabled and be judged individually")
			}
			if got.Label == "" || got.Summary == "" {
				t.Fatal("negotiation should include an operator-facing explanation")
			}
		})
	}
}
