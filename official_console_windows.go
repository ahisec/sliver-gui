//go:build windows

package main

import (
	"os"
	"syscall"

	"github.com/UserExistsError/conpty"
)

func officialConsoleSupported() bool {
	return conpty.IsConPtyAvailable()
}

func startOfficialConsoleProcess(path, root string, cols, rows int) (officialConsoleProcess, error) {
	commandLine := syscall.EscapeArg(path)
	environment := append(os.Environ(), "SLIVER_CLIENT_ROOT_DIR="+root, "SLIVER_NO_UPDATE_CHECK=1")
	return conpty.Start(
		commandLine,
		conpty.ConPtyDimensions(cols, rows),
		conpty.ConPtyWorkDir(root),
		conpty.ConPtyEnv(environment),
	)
}
