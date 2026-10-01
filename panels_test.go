package main

import (
	"testing"
	"time"

	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/bishopfox/sliver/protobuf/sliverpb"
)

func TestFileSystemMountViewPreservesNavigationAndCapacityFields(t *testing.T) {
	info := &sliverpb.MountInfo{
		VolumeName:   `\\?\Volume{test}\`,
		VolumeType:   "3",
		MountPoint:   `C:\`,
		Label:        "System",
		FileSystem:   "NTFS",
		UsedSpace:    40,
		FreeSpace:    60,
		TotalSpace:   100,
		MountOptions: "rw",
	}

	got := fileSystemMountView(info)
	if got.MountPoint != info.MountPoint || got.Label != info.Label || got.FileSystem != info.FileSystem {
		t.Fatalf("mount identity fields were not preserved: %#v", got)
	}
	if got.VolumeType != "3" || got.UsedSpace != 40 || got.FreeSpace != 60 || got.TotalSpace != 100 {
		t.Fatalf("mount type or capacity fields were not preserved: %#v", got)
	}
}

func TestFileExecuteRequestPreservesArgumentsAndExecutionMode(t *testing.T) {
	args := []string{"--name", "hello world"}
	foreground := fileExecuteRequest("session-test", "/tmp/tool", args, false)
	if foreground.Path != "/tmp/tool" || !foreground.Output || foreground.Background {
		t.Fatalf("unexpected foreground request: %#v", foreground)
	}
	if foreground.Request == nil || foreground.Request.SessionID != "session-test" || len(foreground.Args) != 2 || foreground.Args[1] != "hello world" {
		t.Fatalf("foreground target or arguments were not preserved: %#v", foreground)
	}

	background := fileExecuteRequest("session-test", "/tmp/tool", args, true)
	if background.Output || !background.Background {
		t.Fatalf("unexpected background request: %#v", background)
	}
}

func TestFileExecuteWindowsRequestPreservesHideWindow(t *testing.T) {
	request := fileExecuteWindowsRequest("session-test", `C:\Tools\tool.exe`, []string{"/silent"}, true, true)
	if request.Output || !request.Background || !request.HideWindow {
		t.Fatalf("unexpected Windows execute options: %#v", request)
	}
	if request.Path != `C:\Tools\tool.exe` || request.Request == nil || request.Request.SessionID != "session-test" {
		t.Fatalf("Windows execute target was not preserved: %#v", request)
	}
}

func TestRemoteParentAndBaseHandlesUnixWindowsAndRelativePaths(t *testing.T) {
	tests := []struct {
		path       string
		wantParent string
		wantBase   string
	}{
		{`/var/log/syslog`, `/var/log`, `syslog`},
		{`C:\Windows\System32\cmd.exe`, `C:\Windows\System32`, `cmd.exe`},
		{`C:\Temp\`, `C:\`, `Temp`},
		{`notes.txt`, `.`, `notes.txt`},
	}
	for _, tt := range tests {
		parent, base := remoteParentAndBase(tt.path)
		if parent != tt.wantParent || base != tt.wantBase {
			t.Fatalf("remoteParentAndBase(%q) = (%q, %q), want (%q, %q)", tt.path, parent, base, tt.wantParent, tt.wantBase)
		}
	}
}

func TestFilePropertiesViewPreservesReadOnlyMetadata(t *testing.T) {
	entry := FileEntry{Name: "report.txt", IsDir: false, Size: 42, Mode: "-rw-r--r--", ModTime: 1710000000}
	got := filePropertiesView("/tmp/report.txt", entry)
	if got.Path != "/tmp/report.txt" || got.Name != entry.Name || got.Type != "文件" || got.IsDir {
		t.Fatalf("file identity was not preserved: %#v", got)
	}
	if got.Size != entry.Size || got.Mode != entry.Mode || got.ModTime != entry.ModTime {
		t.Fatalf("file metadata was not preserved: %#v", got)
	}
	if got.CreatedAt != 0 || got.AccessedAt != 0 || got.Owner != "" {
		t.Fatalf("unsupported fields should remain empty for UI fallback: %#v", got)
	}

	dir := filePropertiesView("/tmp/logs", FileEntry{Name: "logs", IsDir: true})
	if dir.Type != "文件夹" || !dir.IsDir {
		t.Fatalf("directory type was not preserved: %#v", dir)
	}
}

func TestChtimesRequestPreservesTargetAndTimes(t *testing.T) {
	request, err := chtimesRequest("session-test", `/tmp/evidence.log`, 1710000000, 1710000100)
	if err != nil {
		t.Fatalf("chtimesRequest returned an unexpected error: %v", err)
	}
	if request.Path != `/tmp/evidence.log` || request.ATime != 1710000000 || request.MTime != 1710000100 {
		t.Fatalf("target or timestamps were not preserved: %#v", request)
	}
	if request.Request == nil || request.Request.SessionID != "session-test" {
		t.Fatalf("session target was not preserved: %#v", request.Request)
	}
}

func TestChtimesRequestRejectsMissingTargetAndUnsupportedRange(t *testing.T) {
	tests := []struct {
		name      string
		sessionID string
		path      string
		atime     int64
		mtime     int64
	}{
		{name: "missing session", path: "/tmp/evidence.log", atime: 1, mtime: 1},
		{name: "missing path", sessionID: "session-test", atime: 1, mtime: 1},
		{name: "access time too early", sessionID: "session-test", path: "/tmp/evidence.log", atime: minEditableUnixSeconds - 1, mtime: 1},
		{name: "modification time too late", sessionID: "session-test", path: "/tmp/evidence.log", atime: 1, mtime: maxEditableUnixSeconds + 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := chtimesRequest(tt.sessionID, tt.path, tt.atime, tt.mtime); err == nil {
				t.Fatal("chtimesRequest accepted invalid input")
			}
		})
	}
}

func TestSessionReconnectRequestTargetsSessionAndConvertsSeconds(t *testing.T) {
	request, err := sessionReconnectRequest("session-test", 90)
	if err != nil {
		t.Fatalf("sessionReconnectRequest returned an unexpected error: %v", err)
	}
	if request.ReconnectInterval != int64(90*time.Second) {
		t.Fatalf("reconnect interval was not converted to nanoseconds: %d", request.ReconnectInterval)
	}
	if request.Request == nil || request.Request.SessionID != "session-test" || request.Request.BeaconID != "" {
		t.Fatalf("request was not targeted to the Session: %#v", request.Request)
	}
}

func TestSessionReconnectRequestRejectsInvalidInput(t *testing.T) {
	tests := []struct {
		name      string
		sessionID string
		seconds   int64
	}{
		{name: "missing session", seconds: 60},
		{name: "zero interval", sessionID: "session-test"},
		{name: "negative interval", sessionID: "session-test", seconds: -1},
		{name: "interval too large", sessionID: "session-test", seconds: maxSessionReconnectSeconds + 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := sessionReconnectRequest(tt.sessionID, tt.seconds); err == nil {
				t.Fatal("sessionReconnectRequest accepted invalid input")
			}
		})
	}
}

func TestFullProcessListRequestRequestsMetadata(t *testing.T) {
	request := fullProcessListRequest("session-test")
	if !request.FullInfo {
		t.Fatal("process browser must request full metadata")
	}
	if request.Request == nil || request.Request.SessionID != "session-test" {
		t.Fatalf("session target was not preserved: %#v", request.Request)
	}
}

func TestProcessEntryViewPreservesOwnerAndArchitecture(t *testing.T) {
	process := &commonpb.Process{
		Pid:          120,
		Ppid:         44,
		Executable:   "example.exe",
		Owner:        `DOMAIN\\operator`,
		Architecture: "x86_64",
	}
	got := processEntryView(process, "session-test")
	if got.Owner != process.Owner || got.Arch != process.Architecture {
		t.Fatalf("process metadata was not preserved: %#v", got)
	}
	if got.PID != process.Pid || got.PPID != process.Ppid || got.SessionID != "session-test" {
		t.Fatalf("process identity fields were not preserved: %#v", got)
	}
}
