package main

import (
	"net"
	"reflect"
	"testing"
)

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
