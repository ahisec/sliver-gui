package main

import (
	"errors"
	"net"
	"reflect"
	"testing"
	"time"
)

func TestRunInfrastructureQueryTimesOut(t *testing.T) {
	started := time.Now()
	value, err := runInfrastructureQuery(25*time.Millisecond, func() (string, error) {
		time.Sleep(150 * time.Millisecond)
		return "late", nil
	})
	if err == nil || value != "" {
		t.Fatalf("slow query = %q, %v; want zero value and timeout", value, err)
	}
	if elapsed := time.Since(started); elapsed > 100*time.Millisecond {
		t.Fatalf("timeout returned too slowly: %s", elapsed)
	}
}

func TestRunInfrastructureQueryPreservesResult(t *testing.T) {
	value, err := runInfrastructureQuery(time.Second, func() (string, error) { return "ready", nil })
	if err != nil || value != "ready" {
		t.Fatalf("query = %q, %v", value, err)
	}
	wantErr := errors.New("unsupported")
	if _, err := runInfrastructureQuery(time.Second, func() (string, error) { return "", wantErr }); !errors.Is(err, wantErr) {
		t.Fatalf("query error = %v, want %v", err, wantErr)
	}
}

func TestShouldQueryWireGuard(t *testing.T) {
	if shouldQueryWireGuard(SessionView{Transport: "mtls"}) {
		t.Fatal("mTLS session must not trigger WireGuard status RPCs")
	}
	if !shouldQueryWireGuard(SessionView{Transport: "wireguard"}) || !shouldQueryWireGuard(SessionView{Transport: "wg"}) {
		t.Fatal("WireGuard sessions must query WireGuard status")
	}
}

func TestFlattenPivotGraph(t *testing.T) {
	nodes := []PivotNodeView{{SessionID: "root", Children: []PivotNodeView{{SessionID: "child", Children: []PivotNodeView{{SessionID: "leaf"}}}}}}
	parents, downstream := flattenPivotGraph(nodes)
	if parents["child"] != "root" || parents["leaf"] != "child" {
		t.Fatalf("unexpected parents: %#v", parents)
	}
	if !reflect.DeepEqual(downstream["root"], []string{"child", "leaf"}) {
		t.Fatalf("unexpected descendants: %#v", downstream["root"])
	}
}

func TestPreflightNetworkRouteDetectsLocalPortConflict(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	result := (&App{}).PreflightNetworkRoute("socks", listener.Addr().String(), "")
	if result.Valid || len(result.Errors) == 0 {
		t.Fatalf("expected occupied local port to fail: %#v", result)
	}
}

func TestValidateNetworkRoute(t *testing.T) {
	tests := []struct {
		name   string
		kind   string
		listen string
		target string
		valid  bool
	}{
		{"tcp pivot", "pivot-tcp", "0.0.0.0:9898", "", true},
		{"named pipe", "pivot-pipe", `\\.\pipe\pivot`, "", true},
		{"empty named pipe", "pivot-pipe", "", "", false},
		{"missing listen port", "forward", "127.0.0.1", "host:80", false},
		{"invalid target port", "forward", "127.0.0.1:8080", "host:99999", false},
		{"ipv6", "reverse-forward", "[::]:8080", "[2001:db8::1]:443", true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			result := validateNetworkRoute(test.kind, test.listen, test.target)
			if result.Valid != test.valid {
				t.Fatalf("Valid = %v, errors = %#v", result.Valid, result.Errors)
			}
			if test.target != "" && len(result.Warnings) == 0 {
				t.Fatal("target route should include reachability warning")
			}
		})
	}
}

func TestSplitAddress(t *testing.T) {
	host, port, err := splitAddress(":1080", "127.0.0.1")
	if err != nil || host != "127.0.0.1" || port != 1080 {
		t.Fatalf("splitAddress = %q, %d, %v", host, port, err)
	}
	if _, _, err := splitAddress("localhost", ""); err == nil {
		t.Fatal("expected malformed address to fail")
	}
}
