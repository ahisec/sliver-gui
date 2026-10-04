package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/bishopfox/sliver/protobuf/clientpb"
	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/bishopfox/sliver/protobuf/sliverpb"
	"google.golang.org/protobuf/proto"
)

func TestRandSuffix(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 1000; i++ {
		s := randSuffix()
		if len(s) == 0 {
			t.Fatal("randSuffix returned empty string")
		}
		if seen[s] {
			t.Fatalf("randSuffix collision on %q within 1000 draws", s)
		}
		seen[s] = true
	}
}

func TestSchemeOf(t *testing.T) {
	cases := map[string]string{
		"https://1.2.3.4:8443": "https",
		"mtls://host:8888":     "mtls",
		"dns://example.com":    "dns",
		"1.2.3.4:8888":         "",
		"":                     "",
	}
	for in, want := range cases {
		if got := schemeOf(in); got != want {
			t.Errorf("schemeOf(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestJoinRemotePath(t *testing.T) {
	cases := []struct {
		dir  string
		name string
		want string
	}{
		{dir: ".", name: "report.txt", want: "report.txt"},
		{dir: "/tmp", name: "report.txt", want: "/tmp/report.txt"},
		{dir: "/tmp/", name: "report.txt", want: "/tmp/report.txt"},
		{dir: `C:\Windows\Temp`, name: "report.txt", want: `C:\Windows\Temp\report.txt`},
	}
	for _, tc := range cases {
		if got := joinRemotePath(tc.dir, tc.name); got != tc.want {
			t.Errorf("joinRemotePath(%q, %q) = %q, want %q", tc.dir, tc.name, got, tc.want)
		}
	}
}

func TestValidateMCPListenAddress(t *testing.T) {
	for _, address := range []string{"127.0.0.1:8080", "[::1]:8080", "localhost:8080"} {
		if err := validateMCPListenAddress(address, false); err != nil {
			t.Errorf("loopback %q rejected: %v", address, err)
		}
	}
	if err := validateMCPListenAddress("0.0.0.0:8080", false); err == nil {
		t.Fatal("wildcard listen accepted without confirmation")
	}
	if err := validateMCPListenAddress("0.0.0.0:8080", true); err != nil {
		t.Fatalf("confirmed wildcard listen rejected: %v", err)
	}
	if err := validateMCPListenAddress("127.0.0.1", false); err == nil {
		t.Fatal("address without port accepted")
	}
	for _, address := range []string{"127.0.0.1:http", "127.0.0.1:0", "127.0.0.1:65536"} {
		if err := validateMCPListenAddress(address, false); err == nil {
			t.Errorf("invalid port in %q accepted", address)
		}
	}
	for _, address := range []string{":8080", "[::]:8080", "teamserver.example:8080"} {
		if err := validateMCPListenAddress(address, false); err == nil {
			t.Errorf("non-loopback %q accepted without confirmation", address)
		}
		if err := validateMCPListenAddress(address, true); err != nil {
			t.Errorf("confirmed non-loopback %q rejected: %v", address, err)
		}
	}
}

func TestMaskMCPToken(t *testing.T) {
	if got := maskMCPToken("0123456789abcdef"); got != "****cdef" {
		t.Fatalf("maskMCPToken = %q", got)
	}
	if got := maskMCPToken(""); got != "" {
		t.Fatalf("empty token mask = %q", got)
	}
}

func TestStartMCPRequiresConnection(t *testing.T) {
	app := NewApp()
	if _, err := app.StartMCP(MCPStartRequest{}); err == nil {
		t.Fatal("StartMCP without a Teamserver connection succeeded")
	}
}

func TestStopMCPIsIdempotent(t *testing.T) {
	app := NewApp()
	if err := app.StopMCP(); err != nil {
		t.Fatalf("first StopMCP returned %v", err)
	}
	if err := app.StopMCP(); err != nil {
		t.Fatalf("second StopMCP returned %v", err)
	}
}

func TestFormatFromString(t *testing.T) {
	cases := map[string]clientpb.OutputFormat{
		"shared":    clientpb.OutputFormat_SHARED_LIB,
		"service":   clientpb.OutputFormat_SERVICE,
		"shellcode": clientpb.OutputFormat_SHELLCODE,
		"exe":       clientpb.OutputFormat_EXECUTABLE,
		"":          clientpb.OutputFormat_EXECUTABLE,
	}
	for in, want := range cases {
		if got := formatFromString(in); got != want {
			t.Errorf("formatFromString(%q) = %v, want %v", in, got, want)
		}
	}
}

func TestSessionToViewPreservesIntegrity(t *testing.T) {
	view := sessionToView(&clientpb.Session{
		ID: "session-1", Username: `DOMAIN\operator`, Integrity: "High", Filename: `C:\Windows\agent.exe`,
	})
	if view.Integrity != "High" || view.ProcessName != "agent.exe" {
		t.Fatalf("session metadata was not preserved: %#v", view)
	}
}

func TestParseCSVLine(t *testing.T) {
	cases := []struct {
		in   string
		want []string
	}{
		{`a,b,c`, []string{"a", "b", "c"}},
		{`"a,b",c`, []string{"a,b", "c"}},
		{`"he said ""hi""",x`, []string{`he said "hi"`, "x"}},
		{``, []string{""}},
		{`,,`, []string{"", "", ""}},
	}
	for _, c := range cases {
		got := parseCSVLine(c.in)
		if len(got) != len(c.want) {
			t.Errorf("parseCSVLine(%q) len = %d, want %d (%q)", c.in, len(got), len(c.want), got)
			continue
		}
		for i := range got {
			if got[i] != c.want[i] {
				t.Errorf("parseCSVLine(%q)[%d] = %q, want %q", c.in, i, got[i], c.want[i])
			}
		}
	}
}

func TestParseExecuteResponse(t *testing.T) {
	// Empty -> placeholder.
	if out, _ := parseExecuteResponse(nil, "windows"); out != "(no output)" {
		t.Errorf("empty response = %q, want (no output)", out)
	}
	// Valid protobuf round-trips stdout/stderr.
	data, err := proto.Marshal(&sliverpb.Execute{
		Stdout: []byte("hello"),
		Stderr: []byte("oops"),
	})
	if err != nil {
		t.Fatal(err)
	}
	out, errStr := parseExecuteResponse(data, "windows")
	if out != "hello" || errStr != "oops" {
		t.Errorf("parseExecuteResponse = (%q,%q), want (hello,oops)", out, errStr)
	}
}

func TestParseExecuteResponseDecodesWindowsGBK(t *testing.T) {
	data, err := proto.Marshal(&sliverpb.Execute{
		Stderr: []byte{0xd6, 0xd0, 0xce, 0xc4, 0xca, 0xe4, 0xb3, 0xf6},
	})
	if err != nil {
		t.Fatal(err)
	}
	_, stderr := parseExecuteResponse(data, "windows")
	if stderr != "中文输出" {
		t.Fatalf("decoded stderr = %q, want 中文输出", stderr)
	}
}

func TestDecodeDownload(t *testing.T) {
	// Plain (no encoder) passes through.
	if got, err := decodeDownload(&sliverpb.Download{Data: []byte("raw")}); err != nil || string(got) != "raw" {
		t.Errorf("plain decode = (%q,%v), want (raw,nil)", got, err)
	}
	// gzip encoder is inflated.
	var buf bytes.Buffer
	zw := gzip.NewWriter(&buf)
	zw.Write([]byte("compressed payload"))
	zw.Close()
	got, err := decodeDownload(&sliverpb.Download{Encoder: "gzip", Data: buf.Bytes()})
	if err != nil || string(got) != "compressed payload" {
		t.Errorf("gzip decode = (%q,%v), want (compressed payload,nil)", got, err)
	}
}

func TestDownloadDefaultName(t *testing.T) {
	if got := downloadDefaultName(`C:\\Users\\alice\\Documents`, &sliverpb.Download{IsDir: true}); got != "Documents.tar.gz" {
		t.Fatalf("directory name = %q, want Documents.tar.gz", got)
	}
	if got := downloadDefaultName(`/tmp/report.txt`, &sliverpb.Download{}); got != "report.txt" {
		t.Fatalf("file name = %q, want report.txt", got)
	}
}

func TestDownloadPathRequestEnablesRecursiveDirectoryArchive(t *testing.T) {
	directory := downloadPathRequest("session-test", `C:\Users\CHEN\Desktop\sqli-payload`, true)
	if !directory.Recurse || directory.RestrictedToFile || directory.Request == nil {
		t.Fatalf("unexpected directory download request: %#v", directory)
	}
	if directory.Request.SessionID != "session-test" || directory.Request.Timeout != int64(directoryDownloadTimeout) {
		t.Fatalf("directory download timeout or target missing: %#v", directory.Request)
	}
	file := downloadPathRequest("session-test", `C:\Temp\report.txt`, false)
	if file.Recurse || file.Request == nil || file.Request.Timeout != 0 {
		t.Fatalf("file download should not recurse or override timeout: %#v", file)
	}
}

func TestCommandExecuteWindowsRequestHidesConsoleWindow(t *testing.T) {
	request := commandExecuteWindowsRequest("session-test", "whoami")
	if request.Path != "cmd.exe" || len(request.Args) != 2 || request.Args[0] != "/c" || request.Args[1] != "whoami" {
		t.Fatalf("unexpected command request: %#v", request)
	}
	if !request.Output || !request.HideWindow || request.Request == nil || request.Request.SessionID != "session-test" {
		t.Fatalf("Windows command request does not hide its console: %#v", request)
	}
}

func TestDecodeBeaconIntegrity(t *testing.T) {
	data, err := proto.Marshal(&sliverpb.GetPrivs{ProcessIntegrity: "High"})
	if err != nil {
		t.Fatal(err)
	}
	if got, err := decodeBeaconIntegrity(data); err != nil || got != "High" {
		t.Fatalf("decodeBeaconIntegrity = (%q, %v), want High", got, err)
	}
	if _, err := decodeBeaconIntegrity([]byte("invalid")); err == nil {
		t.Fatal("invalid Beacon integrity response was accepted")
	}
}

func TestNormalizeDirectoryArchiveUsesSelectedDirectoryAsRoot(t *testing.T) {
	var source bytes.Buffer
	tw := tar.NewWriter(&source)
	entries := []struct{ name, content string }{
		{`C:/Users/CHEN/Desktop/sqli-payload/`, ""},
		{`C:/Users/CHEN/Desktop/sqli-payload/nested/a.txt`, "payload"},
	}
	for _, entry := range entries {
		name, content := entry.name, entry.content
		header := &tar.Header{Name: name, Mode: 0o600, Size: int64(len(content))}
		if content == "" {
			header.Typeflag = tar.TypeDir
		}
		if err := tw.WriteHeader(header); err != nil {
			t.Fatal(err)
		}
		if _, err := tw.Write([]byte(content)); err != nil {
			t.Fatal(err)
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}

	normalized, err := normalizeDirectoryArchive(source.Bytes(), `C:\Users\CHEN\Desktop\sqli-payload`)
	if err != nil {
		t.Fatal(err)
	}
	gz, err := gzip.NewReader(bytes.NewReader(normalized))
	if err != nil {
		t.Fatalf("normalized archive is not gzip: %v", err)
	}
	tr := tar.NewReader(gz)
	var names []string
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		names = append(names, header.Name)
	}
	want := []string{"sqli-payload", "sqli-payload/nested/a.txt"}
	if !reflect.DeepEqual(names, want) {
		t.Fatalf("normalized archive names = %#v, want %#v", names, want)
	}
}

func TestDecodeCommandOutput(t *testing.T) {
	utf8Text := []byte("中文输出")
	if got := decodeCommandOutput(utf8Text, "windows"); got != "中文输出" {
		t.Fatalf("valid UTF-8 changed: %q", got)
	}
	gbkText := []byte{0xd6, 0xd0, 0xce, 0xc4, 0xca, 0xe4, 0xb3, 0xf6}
	if got := decodeCommandOutput(gbkText, "windows"); got != "中文输出" {
		t.Fatalf("GBK decode = %q, want 中文输出", got)
	}
	if got := decodeCommandOutput(gbkText, "linux"); got == "中文输出" {
		t.Fatal("non-Windows output must not assume GBK")
	}
	gb18030Text := []byte{0x95, 0x32, 0x82, 0x36}
	if got := decodeCommandOutput(gb18030Text, "windows"); got != "𠀀" {
		t.Fatalf("GB18030 decode = %q, want 𠀀", got)
	}
}

func TestScreenshotDataURLValidatesResponse(t *testing.T) {
	pngData := append(append([]byte(nil), pngSignature...), []byte("payload")...)
	got, err := screenshotDataURL(&sliverpb.Screenshot{Data: pngData})
	if err != nil || !strings.HasPrefix(got, "data:image/png;base64,") {
		t.Fatalf("valid screenshot rejected: url=%q err=%v", got, err)
	}
	tests := []*sliverpb.Screenshot{
		nil,
		{},
		{Data: []byte("not a png")},
		{Response: &commonpb.Response{Err: "capture failed"}},
		{Response: &commonpb.Response{Async: true, TaskID: "task-1"}},
	}
	for index, response := range tests {
		if _, err := screenshotDataURL(response); err == nil {
			t.Fatalf("invalid screenshot case %d was accepted", index)
		}
	}
}

func TestScreenshotFilenameIsPortable(t *testing.T) {
	now := time.Date(2026, 10, 3, 9, 8, 7, 0, time.Local)
	if got := screenshotFilename(` host:name/one `, now); got != "screenshot_host_name_one_20261003_090807.png" {
		t.Fatalf("unexpected screenshot filename: %q", got)
	}
	if got := screenshotFilename("", now); got != "screenshot_target_20261003_090807.png" {
		t.Fatalf("unexpected fallback screenshot filename: %q", got)
	}
}

func TestWriteUniqueScreenshotDoesNotOverwrite(t *testing.T) {
	dir := t.TempDir()
	first, err := writeUniqueScreenshot(dir, "screenshot_host.png", []byte("first"))
	if err != nil {
		t.Fatal(err)
	}
	second, err := writeUniqueScreenshot(dir, "screenshot_host.png", []byte("second"))
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(first) != "screenshot_host.png" || filepath.Base(second) != "screenshot_host_2.png" {
		t.Fatalf("unexpected unique screenshot paths: %q and %q", first, second)
	}
	firstData, _ := os.ReadFile(first)
	secondData, _ := os.ReadFile(second)
	if string(firstData) != "first" || string(secondData) != "second" {
		t.Fatalf("screenshots were overwritten: %q and %q", firstData, secondData)
	}
}

func TestEventTextDataRejectsBinaryPayloads(t *testing.T) {
	if got := eventTextData([]byte("中文事件")); got != "中文事件" {
		t.Fatalf("UTF-8 event text changed: %q", got)
	}
	if got := eventTextData([]byte{0xff, 0xfe, 0x00}); got != "" {
		t.Fatalf("binary event data leaked into UI: %q", got)
	}
}

func TestTransferLifecycle(t *testing.T) {
	app := NewApp()
	app.ctx = context.Background()
	ctx, done, err := app.beginTransfer("transfer-1")
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := app.beginTransfer("transfer-1"); err == nil {
		t.Fatal("expected duplicate transfer ID to fail")
	}
	if !app.CancelTransfer("transfer-1") {
		t.Fatal("expected active transfer to be cancelled")
	}
	select {
	case <-ctx.Done():
	case <-time.After(time.Second):
		t.Fatal("transfer context was not cancelled")
	}
	done()
	if app.CancelTransfer("transfer-1") {
		t.Fatal("completed transfer should not remain registered")
	}
}

func TestImplantDownloadFilenameUsesPlatformFormatExtension(t *testing.T) {
	tests := []struct {
		name, goos, format, configured, want string
	}{
		{name: "win-agent", goos: "windows", format: "exe", want: "win-agent.exe"},
		{name: "win-service", goos: "windows", format: "service", want: "win-service.exe"},
		{name: "win-lib", goos: "windows", format: "shared", want: "win-lib.dll"},
		{name: "payload", goos: "windows", format: "shellcode", want: "payload.bin"},
		{name: "custom", goos: "windows", format: "exe", configured: ".dat", want: "custom.dat"},
		{name: "ready.exe", goos: "windows", format: "exe", want: "ready.exe"},
		{name: "linux-agent", goos: "linux", format: "exe", want: "linux-agent"},
	}
	for _, tt := range tests {
		if got := implantDownloadFilename(tt.name, tt.goos, tt.format, tt.configured); got != tt.want {
			t.Errorf("implantDownloadFilename(%q, %q, %q, %q) = %q, want %q", tt.name, tt.goos, tt.format, tt.configured, got, tt.want)
		}
	}
}
