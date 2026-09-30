package main

import "testing"

func TestListenerValidation(t *testing.T) {
	if err := validateListenerHostPort("0.0.0.0", 8443); err != nil {
		t.Fatal(err)
	}
	if err := validateListenerHostPort("", 8443); err == nil {
		t.Fatal("expected empty host to fail")
	}
	if err := validateHTTPListener(StartHTTPReq{Host: "0.0.0.0", Port: 443, Cert: []byte("cert")}); err == nil {
		t.Fatal("expected unpaired certificate to fail")
	}
	if err := validateDNSListener(StartDNSReq{Domains: []string{"c2.example.com"}, Port: 53}); err != nil {
		t.Fatal(err)
	}
	if err := validateDNSListener(StartDNSReq{Domains: []string{"bad_domain"}}); err == nil {
		t.Fatal("expected invalid domain to fail")
	}
	if err := validateWGListener(StartWGReq{Host: "0.0.0.0", Port: 51820, TunIP: "100.64.0.1", NPort: 8888, KeyPort: 1337}); err != nil {
		t.Fatal(err)
	}
}

func TestValidateGenerateRequest(t *testing.T) {
	valid := GenerateRequest{GOOS: "windows", GOARCH: "amd64", Format: "exe", C2URL: "mtls://example.com:8888", Beacon: true, Interval: 60, Jitter: 30}
	if errors := validateGenerateRequest(valid); len(errors) != 0 {
		t.Fatalf("valid request errors: %v", errors)
	}
	invalid := valid
	invalid.C2URL = "example.com"
	invalid.Jitter = 90
	if errors := validateGenerateRequest(invalid); len(errors) != 2 {
		t.Fatalf("got %d errors, want 2: %v", len(errors), errors)
	}
	invalid = valid
	invalid.GOOS = "linux"
	invalid.MetadataPath = "donor.exe"
	if errors := validateGenerateRequest(invalid); len(errors) != 1 {
		t.Fatalf("metadata validation errors: %v", errors)
	}
}

func TestBuildPreflight(t *testing.T) {
	req := GenerateRequest{
		GOOS: "windows", GOARCH: "amd64", Format: "exe", C2URL: "https://c2.example.com:443",
		HTTPC2Profile: "default", TrafficEncoders: []string{"gzip"},
	}
	result := buildPreflight(req,
		[]JobView{{Name: "https"}},
		CompilerView{Targets: []CompilerTargetView{{GOOS: "windows", GOARCH: "amd64", Format: "EXECUTABLE"}}},
		nil, []C2ProfileView{{Name: "default"}}, []string{"gzip"})
	if !result.Valid || !result.ListenerMatched || !result.CompilerSupported {
		t.Fatalf("unexpected preflight: %+v", result)
	}
	for _, summary := range result.EffectiveSummary {
		if summary == req.C2URL {
			t.Fatal("preflight summary must not expose a C2 URL")
		}
	}

	req.TrafficEncoders = []string{"missing"}
	result = buildPreflight(req, nil, CompilerView{}, nil, nil, nil)
	if result.Valid || len(result.Errors) < 3 {
		t.Fatalf("expected unavailable dependencies: %+v", result)
	}
}
