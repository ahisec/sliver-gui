//go:build !windows

package main

func protectLocalSecret(plain []byte) ([]byte, error) {
	return append([]byte(nil), plain...), nil
}

func unprotectLocalSecret(ciphertext []byte) ([]byte, error) {
	return append([]byte(nil), ciphertext...), nil
}
