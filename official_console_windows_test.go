//go:build windows

package main

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestOfficialConsoleConPTYRoundTrip(t *testing.T) {
	if !officialConsoleSupported() {
		t.Skip("Windows ConPTY is unavailable")
	}
	command := filepath.Join(os.Getenv("SystemRoot"), "System32", "cmd.exe")
	process, err := startOfficialConsoleProcess(command, t.TempDir(), 80, 24)
	if err != nil {
		t.Fatal(err)
	}
	defer process.Close()

	marker := []byte("SLIVER_GUI_CONPTY_OK")
	output := make(chan []byte, 1)
	readErr := make(chan error, 1)
	go func() {
		var collected bytes.Buffer
		buffer := make([]byte, 4096)
		for {
			count, err := process.Read(buffer)
			if count > 0 {
				collected.Write(buffer[:count])
				if bytes.Contains(collected.Bytes(), marker) {
					output <- collected.Bytes()
					return
				}
			}
			if err != nil {
				readErr <- err
				return
			}
		}
	}()
	if _, err := process.Write([]byte("echo SLIVER_GUI_CONPTY_OK\r\n")); err != nil {
		t.Fatal(err)
	}
	select {
	case got := <-output:
		if !bytes.Contains(got, marker) {
			t.Fatalf("ConPTY output did not contain marker: %q", got)
		}
	case err := <-readErr:
		t.Fatalf("ConPTY read failed: %v", err)
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for ConPTY output")
	}
	if err := process.Resize(100, 30); err != nil {
		t.Fatalf("resize failed: %v", err)
	}
	if _, err := process.Write([]byte("exit\r\n")); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if code, err := process.Wait(ctx); err != nil || code != 0 {
		t.Fatalf("wait returned code %d, error %v", code, err)
	}
}
