//go:build windows

package main

import (
	"errors"
	"unsafe"

	"golang.org/x/sys/windows"
)

const cryptProtectUIForbidden = 0x1

func protectLocalSecret(plain []byte) ([]byte, error) {
	if len(plain) == 0 {
		return nil, errors.New("cannot protect empty data")
	}
	in := windows.DataBlob{Size: uint32(len(plain)), Data: &plain[0]}
	var out windows.DataBlob
	if err := windows.CryptProtectData(&in, nil, nil, 0, nil, cryptProtectUIForbidden, &out); err != nil {
		return nil, err
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(out.Data)))
	return append([]byte(nil), unsafe.Slice(out.Data, out.Size)...), nil
}

func unprotectLocalSecret(ciphertext []byte) ([]byte, error) {
	if len(ciphertext) == 0 {
		return nil, errors.New("cannot unprotect empty data")
	}
	in := windows.DataBlob{Size: uint32(len(ciphertext)), Data: &ciphertext[0]}
	var out windows.DataBlob
	if err := windows.CryptUnprotectData(&in, nil, nil, 0, nil, cryptProtectUIForbidden, &out); err != nil {
		return nil, err
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(out.Data)))
	return append([]byte(nil), unsafe.Slice(out.Data, out.Size)...), nil
}
