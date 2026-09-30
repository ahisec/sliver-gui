package main

import (
	"testing"

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
