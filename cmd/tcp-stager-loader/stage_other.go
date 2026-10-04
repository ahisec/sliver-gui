//go:build !windows

package main

import "errors"

func executeStage([]byte) error {
	return errors.New("memory execution is implemented only for Windows targets")
}
