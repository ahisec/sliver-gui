package main

import (
	"bytes"
	"encoding/binary"
	"errors"
	"io"
	"net"
	"os"
	"testing"
	"time"
)

func TestFetchStageReadsLittleEndianPrefix(t *testing.T) {
	stage := []byte{0xfc, 0x48, 0x83, 0xe4, 0xf0}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer listener.Close()

	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		payload := make([]byte, lengthPrefix+len(stage))
		binary.LittleEndian.PutUint32(payload, uint32(len(stage)))
		copy(payload[lengthPrefix:], stage)
		_, _ = conn.Write(payload)
	}()

	got, err := fetchStage(listener.Addr().String(), time.Second)
	if err != nil {
		t.Fatalf("fetchStage: %v", err)
	}
	if !bytes.Equal(got, stage) {
		t.Fatalf("stage mismatch: got %#x, want %#x", got, stage)
	}
}

func TestFetchStageRejectsInvalidLength(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer listener.Close()

	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		_, _ = conn.Write([]byte{0, 0, 0, 0})
	}()

	if _, err := fetchStage(listener.Addr().String(), time.Second); err == nil {
		t.Fatal("fetchStage accepted zero-length stage")
	}
}

func TestFetchStageRejectsTruncatedStage(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer listener.Close()

	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		_, _ = conn.Write([]byte{4, 0, 0, 0, 0xfc})
	}()

	_, err = fetchStage(listener.Addr().String(), 200*time.Millisecond)
	if err == nil {
		t.Fatal("fetchStage accepted truncated stage")
	}
	if !errors.Is(err, io.ErrUnexpectedEOF) {
		t.Fatalf("expected EOF error, got: %v", err)
	}
}

func TestRunRejectsInvalidAddress(t *testing.T) {
	oldArgs := os.Args
	defer func() { os.Args = oldArgs }()
	os.Args = []string{"tcp-stager-loader", "not-a-listener-address"}
	if err := run(); err == nil {
		t.Fatal("run accepted invalid address")
	}
}
