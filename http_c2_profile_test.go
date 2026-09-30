package main

import "testing"

func TestParseHTTPC2Profile(t *testing.T) {
	cfg, err := parseHTTPC2Profile(`{"Name":"mobile-web","ImplantConfig":{},"ServerConfig":{}}`)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Name != "mobile-web" {
		t.Fatalf("name = %q, want mobile-web", cfg.Name)
	}
}

func TestParseHTTPC2ProfileRejectsMalformedAndUnnamed(t *testing.T) {
	for _, input := range []string{`{"Name":`, `{"ImplantConfig":{}}`} {
		if _, err := parseHTTPC2Profile(input); err == nil {
			t.Fatalf("expected validation error for %q", input)
		}
	}
}
