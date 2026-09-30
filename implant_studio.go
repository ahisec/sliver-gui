package main

import (
	"debug/pe"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/bishopfox/sliver/protobuf/clientpb"
)

func validatePort(port uint32, field string) error {
	if port == 0 || port > 65535 {
		return fmt.Errorf("%s must be between 1 and 65535", field)
	}
	return nil
}

func validateListenerHostPort(host string, port uint32) error {
	if strings.TrimSpace(host) == "" {
		return fmt.Errorf("listener host is required")
	}
	return validatePort(port, "listener port")
}

func validateHTTPListener(req StartHTTPReq) error {
	if err := validateListenerHostPort(req.Host, req.Port); err != nil {
		return err
	}
	if req.LongPollTimeout < 0 || req.LongPollJitter < 0 {
		return fmt.Errorf("long-poll timeout and jitter cannot be negative")
	}
	if (len(req.Cert) == 0) != (len(req.Key) == 0) {
		return fmt.Errorf("TLS certificate and key must be supplied together")
	}
	return nil
}

func validDomain(value string) bool {
	value = strings.TrimSuffix(strings.TrimSpace(value), ".")
	if value == "" || len(value) > 253 || net.ParseIP(value) != nil {
		return false
	}
	for _, label := range strings.Split(value, ".") {
		if label == "" || len(label) > 63 || strings.HasPrefix(label, "-") || strings.HasSuffix(label, "-") {
			return false
		}
		for _, r := range label {
			if !(r >= 'a' && r <= 'z') && !(r >= 'A' && r <= 'Z') && !(r >= '0' && r <= '9') && r != '-' {
				return false
			}
		}
	}
	return true
}

func validateDNSListener(req StartDNSReq) error {
	if len(req.Domains) == 0 {
		return fmt.Errorf("at least one DNS domain is required")
	}
	for _, domain := range req.Domains {
		if !validDomain(domain) {
			return fmt.Errorf("invalid DNS domain %q", domain)
		}
	}
	if req.Port != 0 {
		return validatePort(req.Port, "DNS port")
	}
	return nil
}

func validateWGListener(req StartWGReq) error {
	if err := validateListenerHostPort(req.Host, req.Port); err != nil {
		return err
	}
	if ip := net.ParseIP(strings.TrimSpace(req.TunIP)); ip == nil {
		return fmt.Errorf("WireGuard tunnel IP is invalid")
	}
	if err := validatePort(req.NPort, "WireGuard TCP port"); err != nil {
		return err
	}
	return validatePort(req.KeyPort, "WireGuard key-exchange port")
}

type ImplantPreflight struct {
	Valid             bool     `json:"valid"`
	Errors            []string `json:"errors"`
	Warnings          []string `json:"warnings"`
	ListenerMatched   bool     `json:"listenerMatched"`
	CompilerSupported bool     `json:"compilerSupported"`
	AvailableBuilders []string `json:"availableBuilders"`
	EffectiveSummary  []string `json:"effectiveSummary"`
}

func validateGenerateRequest(req GenerateRequest) []string {
	var errors []string
	if req.GOOS == "" || req.GOARCH == "" {
		errors = append(errors, "target operating system and architecture are required")
	}
	allowedFormat := map[string]bool{"exe": true, "shared": true, "service": true, "shellcode": true}
	if !allowedFormat[strings.ToLower(req.Format)] {
		errors = append(errors, "unsupported output format")
	}
	c2Entries := implantC2Entries(req)
	if len(c2Entries) == 0 {
		errors = append(errors, "at least one C2 URL is required")
	}
	for _, c2 := range c2Entries {
		u, err := url.Parse(c2.URL)
		if err != nil || u.Scheme == "" || u.Host == "" {
			errors = append(errors, "C2 URL must include a supported scheme and host")
			break
		}
	}
	if req.Beacon && (req.Interval <= 0 || req.Jitter < 0 || req.Jitter > req.Interval) {
		errors = append(errors, "beacon interval must be positive and jitter must be between zero and the interval")
	}
	if req.ReconnectInterval < 0 || req.PollTimeout < 0 {
		errors = append(errors, "reconnect interval and poll timeout cannot be negative")
	}
	if req.ConnectionStrategy != "" && req.ConnectionStrategy != "s" && req.ConnectionStrategy != "r" && req.ConnectionStrategy != "rd" {
		errors = append(errors, "unsupported connection strategy")
	}
	if req.MetadataPath != "" && (req.GOOS != "windows" || req.Format == "shellcode") {
		errors = append(errors, "executable metadata cloning only supports Windows PE outputs")
	}
	return errors
}

func buildPreflight(req GenerateRequest, jobs []JobView, compiler CompilerView, builders []BuilderView, profiles []C2ProfileView, encoders []string) ImplantPreflight {
	result := ImplantPreflight{Errors: validateGenerateRequest(req)}
	c2Entries := implantC2Entries(req)
	requestedScheme := ""
	if len(c2Entries) > 0 {
		requestedScheme = strings.ToLower(schemeOf(c2Entries[0].URL))
	}
	for _, job := range jobs {
		if strings.Contains(strings.ToLower(job.Name), requestedScheme) {
			result.ListenerMatched = true
			break
		}
	}
	if !result.ListenerMatched {
		result.Warnings = append(result.Warnings, "no active listener matches the selected C2 transport")
	}
	format := formatFromString(req.Format).String()
	for _, target := range compiler.Targets {
		if target.GOOS == req.GOOS && target.GOARCH == req.GOARCH && strings.EqualFold(target.Format, format) {
			result.CompilerSupported = true
			break
		}
	}
	for _, builder := range builders {
		if builder.GOOS == req.GOOS && builder.GOARCH == req.GOARCH {
			result.AvailableBuilders = append(result.AvailableBuilders, builder.Name)
		}
	}
	if !result.CompilerSupported && len(result.AvailableBuilders) == 0 {
		result.Errors = append(result.Errors, "neither the Teamserver compiler nor an external builder supports this target")
	}
	if req.HTTPC2Profile != "" {
		found := false
		for _, profile := range profiles {
			found = found || profile.Name == req.HTTPC2Profile
		}
		if !found {
			result.Errors = append(result.Errors, "selected HTTP C2 profile is unavailable")
		}
	}
	encoderSet := map[string]bool{}
	for _, encoder := range encoders {
		encoderSet[encoder] = true
	}
	for _, encoder := range req.TrafficEncoders {
		if !encoderSet[encoder] {
			result.Errors = append(result.Errors, "traffic encoder is unavailable: "+encoder)
		}
	}
	result.EffectiveSummary = []string{
		fmt.Sprintf("Target: %s/%s", req.GOOS, req.GOARCH),
		fmt.Sprintf("Format: %s", req.Format),
		fmt.Sprintf("Mode: %s", map[bool]string{true: "beacon", false: "session"}[req.Beacon]),
		fmt.Sprintf("Transport: %s", requestedScheme),
	}
	if req.HTTPC2Profile != "" {
		result.EffectiveSummary = append(result.EffectiveSummary, "HTTP C2 profile: "+req.HTTPC2Profile)
	}
	if len(req.TrafficEncoders) > 0 {
		result.EffectiveSummary = append(result.EffectiveSummary, "Traffic encoders: "+strings.Join(req.TrafficEncoders, ", "))
	}
	if req.MetadataPath != "" {
		result.EffectiveSummary = append(result.EffectiveSummary, "PE metadata donor: "+filepath.Base(req.MetadataPath))
	}
	sort.Strings(result.AvailableBuilders)
	result.Valid = len(result.Errors) == 0
	return result
}

func (a *App) PreflightImplant(req GenerateRequest) (ImplantPreflight, error) {
	jobs, err := a.ListJobs()
	if err != nil {
		return ImplantPreflight{}, err
	}
	compiler, err := a.GetCompilerInfo()
	if err != nil {
		return ImplantPreflight{}, err
	}
	builders, err := a.ListBuilders()
	if err != nil {
		return ImplantPreflight{}, err
	}
	profiles, err := a.ListC2Profiles()
	if err != nil {
		return ImplantPreflight{}, err
	}
	encoders, err := a.ListTrafficEncoders()
	if err != nil {
		return ImplantPreflight{}, err
	}
	return buildPreflight(req, jobs, compiler, builders, profiles, encoders), nil
}

func loadPEMetadata(path string, goarch string) (*clientpb.SpoofMetadataConfig, error) {
	f, err := pe.Open(path)
	if err != nil {
		return nil, fmt.Errorf("metadata donor is not a valid PE file: %w", err)
	}
	machine := f.FileHeader.Machine
	f.Close()
	if (goarch == "amd64" && machine != pe.IMAGE_FILE_MACHINE_AMD64) || (goarch == "386" && machine != pe.IMAGE_FILE_MACHINE_I386) || (goarch == "arm64" && machine != pe.IMAGE_FILE_MACHINE_ARM64) {
		return nil, fmt.Errorf("metadata donor architecture does not match the target")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return &clientpb.SpoofMetadataConfig{PE: &clientpb.PESpoofMetadataConfig{Source: &clientpb.SpoofMetadataFile{Name: filepath.Base(path), Data: data}}}, nil
}
