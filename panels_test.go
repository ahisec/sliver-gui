package main

import (
	"testing"

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
