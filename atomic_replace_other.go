//go:build !windows

package main

import "os"

func replaceFileAtomically(source, destination string) error {
	return os.Rename(source, destination)
}
