package main

import (
	"strings"
	"testing"
)

func TestSafeAuditSummaryDoesNotExposeDetails(t *testing.T) {
	secret := `curl https://c2.example/path token=supersecret C:\Users\me\payload.exe`
	if got := safeAuditSummary(secret); got != "详情已隐藏" {
		t.Fatalf("summary = %q", got)
	}
	if got := safeAuditSummary("failed"); got != "失败" {
		t.Fatalf("outcome = %q", got)
	}
}

func TestSanitizeReportTextRemovesSensitiveValues(t *testing.T) {
	input := `password=hunter2 https://c2.example/a C:\Users\me\key.pem /home/me/key.pem`
	output := sanitizeReportText(input)
	for _, forbidden := range []string{"hunter2", "c2.example", `C:\Users`, "/home/me"} {
		if strings.Contains(output, forbidden) {
			t.Fatalf("sensitive value %q remained in %q", forbidden, output)
		}
	}
}

func TestSafeTargetHidesLegacyConnectionAddress(t *testing.T) {
	if got := safeTarget("10.0.0.1:31337", false); got != "[地址已隐藏]" {
		t.Fatalf("legacy address = %q", got)
	}
	if got := safeTarget("session-1234", false); got != "session-1234" {
		t.Fatalf("safe target = %q", got)
	}
}

func TestReportFindingsOnlyReturnsCounts(t *testing.T) {
	entries := []auditEntry{{Server: "10.0.0.1:31337", Detail: "token=secret"}}
	findings := reportFindings(entries, []IOCEntry{{Path: `C:\Temp\x`}})
	if len(findings) < 2 {
		t.Fatalf("findings = %#v", findings)
	}
	for _, finding := range findings {
		if strings.Contains(finding.Note, "secret") || strings.Contains(finding.Note, "10.0.0.1") {
			t.Fatalf("finding leaked value: %#v", finding)
		}
	}
}

func TestAuditStorageRemovesSensitiveTargetAndDetail(t *testing.T) {
	for _, target := range []string{
		"10.0.0.1:31337",
		"https://c2.example/path",
		`C:\Users\operator\payload.exe`,
		"token=supersecret",
		"shell whoami",
	} {
		stored := safeAuditStorageTarget(target)
		if stored == target || strings.Contains(stored, "supersecret") || strings.Contains(stored, "c2.example") {
			t.Fatalf("sensitive target was stored: %q", stored)
		}
	}
	if got := safeAuditStorageTarget("session-1234"); got != "session-1234" {
		t.Fatalf("safe identifier changed to %q", got)
	}
	if got := safeAuditStorageDetail("curl https://c2.example token=secret"); got != "recorded" {
		t.Fatalf("detail = %q", got)
	}
	if got := safeAuditStorageDetail("failed"); got != "failed" {
		t.Fatalf("outcome = %q", got)
	}
}

func TestReportTaskResultIgnoresFreeFormSummary(t *testing.T) {
	if got := reportTaskResult("success"); got != "已完成" {
		t.Fatalf("result = %q", got)
	}
	if got := reportTaskResult("token=secret"); got != "已记录" {
		t.Fatalf("unknown status = %q", got)
	}
	if got := reportTaskTitle("shell whoami token=secret"); got != "客户端任务" {
		t.Fatalf("unknown title = %q", got)
	}
}
