//go:build !windows

package main

import "errors"

func officialConsoleSupported() bool { return false }

func startOfficialConsoleProcess(path, root string, cols, rows int) (officialConsoleProcess, error) {
	return nil, errors.New("官方控制台桥接当前仅支持 Windows ConPTY")
}
