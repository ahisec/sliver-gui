package main

import (
	"fmt"
	"net"
	"sort"
	"strconv"
	"strings"
)

type InfrastructureNode struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Kind       string   `json:"kind"`
	Address    string   `json:"address"`
	Transport  string   `json:"transport"`
	Status     string   `json:"status"`
	ParentID   string   `json:"parentId"`
	Downstream []string `json:"downstream"`
}

type InfrastructureRoute struct {
	ID        string `json:"id"`
	SessionID string `json:"sessionId"`
	Session   string `json:"session"`
	Type      string `json:"type"`
	Listen    string `json:"listen"`
	Target    string `json:"target"`
	Status    string `json:"status"`
	Source    string `json:"source"`
}

type InfrastructureSnapshot struct {
	Nodes    []InfrastructureNode  `json:"nodes"`
	Routes   []InfrastructureRoute `json:"routes"`
	Warnings []string              `json:"warnings"`
}

type NetworkPreflight struct {
	Valid    bool     `json:"valid"`
	Errors   []string `json:"errors"`
	Warnings []string `json:"warnings"`
}

func flattenPivotGraph(nodes []PivotNodeView) (map[string]string, map[string][]string) {
	parents := map[string]string{}
	direct := map[string][]string{}
	var walk func(PivotNodeView, string)
	walk = func(node PivotNodeView, parent string) {
		if node.SessionID != "" && parent != "" {
			parents[node.SessionID] = parent
			direct[parent] = append(direct[parent], node.SessionID)
		}
		next := parent
		if node.SessionID != "" {
			next = node.SessionID
		}
		for _, child := range node.Children {
			walk(child, next)
		}
	}
	for _, node := range nodes {
		walk(node, "")
	}

	downstream := map[string][]string{}
	var collect func(string, map[string]bool) []string
	collect = func(id string, seen map[string]bool) []string {
		if seen[id] {
			return nil
		}
		seen[id] = true
		var result []string
		for _, child := range direct[id] {
			result = append(result, child)
			result = append(result, collect(child, seen)...)
		}
		return result
	}
	for parent := range direct {
		downstream[parent] = collect(parent, map[string]bool{})
		sort.Strings(downstream[parent])
	}
	return parents, downstream
}

// GetInfrastructureSnapshot merges Teamserver-backed routes with local client
// relays. Unsupported per-session RPCs become warnings so one older implant
// cannot hide the rest of the infrastructure view.
func (a *App) GetInfrastructureSnapshot() (InfrastructureSnapshot, error) {
	sessions, err := a.ListSessions()
	if err != nil {
		return InfrastructureSnapshot{}, err
	}
	graph, graphErr := a.GetPivotGraph()
	parents, downstream := flattenPivotGraph(graph)
	result := InfrastructureSnapshot{}
	if graphErr != nil {
		result.Warnings = append(result.Warnings, "Pivot 拓扑暂不可用，已继续加载活动转发")
	}

	for _, session := range sessions {
		status := "online"
		if session.IsDead {
			status = "offline"
		}
		result.Nodes = append(result.Nodes, InfrastructureNode{
			ID: session.ID, Name: session.Name, Kind: "session", Address: session.RemoteAddr,
			Transport: session.Transport, Status: status, ParentID: parents[session.ID],
			Downstream: downstream[session.ID],
		})

		pivots, pivotErr := a.ListPivots(session.ID)
		if pivotErr != nil {
			result.Warnings = append(result.Warnings, session.Name+": Pivot 状态不可用")
		}
		for _, pivot := range pivots {
			result.Routes = append(result.Routes, InfrastructureRoute{
				ID: pivot.ID, SessionID: session.ID, Session: session.Name,
				Type: "pivot-" + strings.ToLower(pivot.Type), Listen: pivot.BindAddress,
				Status: status, Source: "teamserver",
			})
		}

		if port := a.SocksProxyStatus(session.ID); port > 0 {
			result.Routes = append(result.Routes, InfrastructureRoute{
				ID: strconv.Itoa(port), SessionID: session.ID, Session: session.Name,
				Type: "socks", Listen: fmt.Sprintf("127.0.0.1:%d", port), Status: status, Source: "client",
			})
		}
		portForwards, portForwardErr := a.ListPortForwards(session.ID)
		if portForwardErr != nil {
			result.Warnings = append(result.Warnings, session.Name+": 本地正向转发状态不可用")
		}
		for _, forward := range portForwards {
			result.Routes = append(result.Routes, InfrastructureRoute{
				ID: strconv.Itoa(forward.LocalPort), SessionID: session.ID, Session: session.Name,
				Type: "forward", Listen: fmt.Sprintf("127.0.0.1:%d", forward.LocalPort),
				Target: forward.Remote, Status: status, Source: "client",
			})
		}

		rports, rportErr := a.ListRportFwds(session.ID)
		if rportErr != nil {
			result.Warnings = append(result.Warnings, session.Name+": 反向转发状态不可用")
		}
		for _, forward := range rports {
			result.Routes = append(result.Routes, InfrastructureRoute{
				ID: strconv.FormatUint(uint64(forward.ID), 10), SessionID: session.ID, Session: session.Name,
				Type: "reverse-forward", Listen: forward.Bind, Target: forward.Forward,
				Status: status, Source: "teamserver",
			})
		}

		wgForwards, wgForwardErr := a.ListWGForwarders(session.ID)
		if wgForwardErr != nil {
			result.Warnings = append(result.Warnings, session.Name+": WireGuard 转发状态不可用")
		}
		for _, forward := range wgForwards {
			result.Routes = append(result.Routes, InfrastructureRoute{
				ID: strconv.Itoa(int(forward.ID)), SessionID: session.ID, Session: session.Name,
				Type: "wireguard-forward", Listen: forward.LocalAddr, Target: forward.RemoteAddr,
				Status: status, Source: "teamserver",
			})
		}

		wgSocks, wgSocksErr := a.ListWGSocks(session.ID)
		if wgSocksErr != nil {
			result.Warnings = append(result.Warnings, session.Name+": WireGuard SOCKS 状态不可用")
		}
		for _, socks := range wgSocks {
			result.Routes = append(result.Routes, InfrastructureRoute{
				ID: strconv.Itoa(int(socks.ID)), SessionID: session.ID, Session: session.Name,
				Type: "wireguard-socks", Listen: socks.LocalAddr, Status: status, Source: "teamserver",
			})
		}
	}

	sort.Slice(result.Routes, func(i, j int) bool {
		if result.Routes[i].Session == result.Routes[j].Session {
			return result.Routes[i].Type < result.Routes[j].Type
		}
		return result.Routes[i].Session < result.Routes[j].Session
	})
	return result, nil
}

func splitAddress(value, defaultHost string) (string, int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", 0, fmt.Errorf("address is required")
	}
	host, portText, err := net.SplitHostPort(value)
	if err != nil {
		return "", 0, fmt.Errorf("invalid host:port address")
	}
	if host == "" {
		host = defaultHost
	}
	if host == "" {
		return "", 0, fmt.Errorf("host is required")
	}
	port, err := strconv.Atoi(portText)
	if err != nil || port < 1 || port > 65535 {
		return "", 0, fmt.Errorf("port must be between 1 and 65535")
	}
	return host, port, nil
}

func validateTCPPort(port int) error {
	if port < 1 || port > 65535 {
		return fmt.Errorf("port must be between 1 and 65535")
	}
	return nil
}

func validateNetworkRoute(kind, listen, target string) NetworkPreflight {
	result := NetworkPreflight{}
	kind = strings.ToLower(strings.TrimSpace(kind))
	if kind == "pivot-pipe" || kind == "pivot-namedpipe" {
		if strings.TrimSpace(listen) == "" {
			result.Errors = append(result.Errors, "named pipe is required")
		}
	} else if _, _, err := splitAddress(listen, "0.0.0.0"); err != nil {
		result.Errors = append(result.Errors, "listen address: "+err.Error())
	}
	if kind == "forward" || kind == "reverse-forward" || kind == "wireguard-forward" {
		if _, _, err := splitAddress(target, ""); err != nil {
			result.Errors = append(result.Errors, "target address: "+err.Error())
		}
		result.Warnings = append(result.Warnings, "目标可达性由植入体所在网络决定，客户端无法在创建前主动探测")
	}
	result.Valid = len(result.Errors) == 0
	return result
}

func (a *App) PreflightNetworkRoute(kind, listen, target string) NetworkPreflight {
	result := validateNetworkRoute(kind, listen, target)
	if !result.Valid {
		return result
	}
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case "socks", "forward", "wireguard-forward", "wireguard-socks":
		host, port, err := splitAddress(listen, "127.0.0.1")
		if err == nil {
			listener, listenErr := net.Listen("tcp", net.JoinHostPort(host, strconv.Itoa(port)))
			if listenErr != nil {
				result.Valid = false
				result.Errors = append(result.Errors, "local listen port is already in use or unavailable")
			} else {
				_ = listener.Close()
			}
		}
	}
	return result
}
