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
