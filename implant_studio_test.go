package main

import (
	"reflect"
	"testing"
	"time"

	"github.com/bishopfox/sliver/protobuf/clientpb"
)

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

func TestBuildImplantConfigAdvancedProfile(t *testing.T) {
	req := GenerateRequest{
		GOOS: "windows", GOARCH: "amd64", Format: "shared",
		C2: []ImplantC2Input{
			{URL: "https://one.example:443", Priority: 2, Options: "driver=winhttp"},
			{URL: "dns://two.example", Priority: 1},
			{URL: "wg://three.example:51820", Priority: 3},
		},
		Evasion: true, ObfuscateSymbols: true, NetGo: true, RunAtLoad: true,
		GoPackage: "example.org/implant", Extension: ".bin",
		WGPeerTunIP: "100.64.0.22", WGKeyExchangePort: 1337, WGTCPCommsPort: 8888,
		ConnectionStrategy: "r", ReconnectInterval: 45, MaxConnectionErrors: 12, PollTimeout: 90,
		CanaryDomains:     []string{"first.example, second.example.", "first.example"},
		LimitDomainJoined: true, LimitDatetime: " 2027-01-01T00:00:00Z ",
		LimitHostname: " host-a ", LimitUsername: " alice ", LimitFileExists: " C:\\ready ", LimitLocale: " en-US ",
	}
	cfg := (&App{}).buildImplantConfig(req)
	if len(cfg.C2) != 3 || cfg.C2[0].Priority != 2 || cfg.C2[0].Options != "driver=winhttp" {
		t.Fatalf("unexpected C2 mapping: %+v", cfg.C2)
	}
	if !cfg.IncludeHTTP || !cfg.IncludeDNS || !cfg.IncludeWG || !cfg.Evasion || !cfg.ObfuscateSymbols || !cfg.NetGoEnabled || !cfg.RunAtLoad {
		t.Fatalf("advanced flags were not mapped: %+v", cfg)
	}
	if cfg.ReconnectInterval != int64(45*time.Second) || cfg.PollTimeout != int64(90*time.Second) || cfg.MaxConnectionErrors != 12 {
		t.Fatalf("connection settings were not mapped: %+v", cfg)
	}
	if cfg.GoPackage != "example.org/implant" || cfg.Extension != "bin" || cfg.WGPeerTunIP != "100.64.0.22" || cfg.WGKeyExchangePort != 1337 || cfg.WGTcpCommsPort != 8888 {
		t.Fatalf("advanced build and WireGuard fields were not mapped: %+v", cfg)
	}
	if !reflect.DeepEqual(cfg.CanaryDomains, []string{"first.example.", "second.example."}) {
		t.Fatalf("unexpected canary domains: %#v", cfg.CanaryDomains)
	}
	if cfg.LimitDatetime != "2027-01-01T00:00:00Z" || cfg.LimitHostname != "host-a" || cfg.LimitUsername != "alice" {
		t.Fatalf("execution limits were not normalized: %+v", cfg)
	}
}

func TestBuildImplantConfigLegacyC2AndDebug(t *testing.T) {
	cfg := (&App{}).buildImplantConfig(GenerateRequest{
		GOOS: "linux", GOARCH: "amd64", Format: "exe", C2URL: "mtls://legacy.example:8888",
		Debug: true, ObfuscateSymbols: true, RunAtLoad: true,
	})
	if len(cfg.C2) != 1 || cfg.C2[0].URL != "mtls://legacy.example:8888" || cfg.C2[0].Priority != 1 {
		t.Fatalf("legacy C2 was not preserved: %+v", cfg.C2)
	}
	if cfg.ObfuscateSymbols || cfg.RunAtLoad {
		t.Fatalf("debug/non-shared compatibility rules were not applied: %+v", cfg)
	}
	if cfg.HTTPC2ConfigName != "" {
		t.Fatalf("non-HTTP implant must not carry an HTTP C2 profile: %+v", cfg)
	}
}

func TestBuildImplantConfigPivotTransportsKeepMTLSBaseline(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		included func(*clientpb.ImplantConfig) bool
	}{
		{name: "tcp pivot", url: "tcp-pivot://pivot.example:9898", included: func(cfg *clientpb.ImplantConfig) bool { return cfg.IncludeTCP }},
		{name: "named pipe", url: "namedpipe://host/pipe/sliver", included: func(cfg *clientpb.ImplantConfig) bool { return cfg.IncludeNamePipe }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := (&App{}).buildImplantConfig(GenerateRequest{
				GOOS: "windows", GOARCH: "amd64", Format: "exe", C2URL: tt.url,
			})
			if !tt.included(cfg) || !cfg.IncludeMTLS {
				t.Fatalf("pivot transport or MTLS baseline missing: %+v", cfg)
			}
		})
	}
}

func TestProfileViewFromConfig(t *testing.T) {
	cfg := &clientpb.ImplantConfig{
		GOOS: "darwin", GOARCH: "arm64", Format: clientpb.OutputFormat_SHELLCODE,
		C2:      []*clientpb.ImplantC2{{URL: "https://one.example", Priority: 4, Options: "x=y"}},
		Evasion: true, ObfuscateSymbols: true, NetGoEnabled: true,
		BeaconInterval: 30 * int64(time.Second), BeaconJitter: 5 * int64(time.Second), IsBeacon: true,
		LimitLocale: "en-US", CanaryDomains: []string{"canary.example."},
		GoPackage: "example.org/profile", Extension: "dat", WGPeerTunIP: "100.64.0.4", WGKeyExchangePort: 1337, WGTcpCommsPort: 8888,
	}
	view := profileViewFromConfig("mac", cfg)
	if view.Format != "shellcode" || view.C2URL != cfg.C2[0].URL || len(view.C2) != 1 || view.C2[0].Options != "x=y" {
		t.Fatalf("unexpected profile view: %+v", view)
	}
	if !view.Evasion || !view.ObfuscateSymbols || !view.NetGo || view.Interval != 30 || view.Jitter != 5 {
		t.Fatalf("advanced profile fields missing: %+v", view)
	}
	if view.GoPackage != cfg.GoPackage || view.Extension != cfg.Extension || view.WGPeerTunIP != cfg.WGPeerTunIP || view.WGKeyExchangePort != cfg.WGKeyExchangePort || view.WGTCPCommsPort != cfg.WGTcpCommsPort {
		t.Fatalf("profile-only fields did not survive the view mapping: %+v", view)
	}
}

func TestValidateGenerateRequestRejectsInvalidWireGuardFields(t *testing.T) {
	req := GenerateRequest{
		GOOS: "windows", GOARCH: "amd64", Format: "exe", C2URL: "wg://example.com:51820",
		WGPeerTunIP: "not-an-ip", WGKeyExchangePort: 70000,
	}
	if errors := validateGenerateRequest(req); len(errors) != 2 {
		t.Fatalf("got %d WireGuard validation errors, want 2: %v", len(errors), errors)
	}
}

func TestBuildImplantConfigDropsWireGuardFieldsWithoutTransport(t *testing.T) {
	app := NewApp()
	cfg := app.buildImplantConfig(GenerateRequest{
		GOOS: "windows", GOARCH: "amd64", Format: "exe", C2URL: "mtls://example.com:8888",
		WGPeerTunIP: "100.64.0.22", WGKeyExchangePort: 1337, WGTCPCommsPort: 8888,
	})
	if cfg.IncludeWG || cfg.WGPeerTunIP != "" || cfg.WGKeyExchangePort != 0 || cfg.WGTcpCommsPort != 0 {
		t.Fatalf("WireGuard-only fields leaked into a non-WireGuard profile: %+v", cfg)
	}
}
