package main

import (
	"errors"
	"fmt"
	"net"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	infrastructureQueryTimeout    = 3 * time.Second
	infrastructureSnapshotTimeout = 6 * time.Second
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

type infrastructureQueryResult struct {
	routes  []InfrastructureRoute
	warning string
}

func runInfrastructureQuery[T any](timeout time.Duration, query func() (T, error)) (T, error) {
	type result struct {
		value T
		err   error
	}
	resultCh := make(chan result, 1)
	go func() {
		value, err := query()
		resultCh <- result{value: value, err: err}
	}()
	if timeout <= 0 {
		var zero T
		return zero, errors.New("query deadline exceeded")
	}
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case result := <-resultCh:
		return result.value, result.err
	case <-timer.C:
		var zero T
		return zero, fmt.Errorf("query timed out after %s", timeout.Round(time.Millisecond))
	}
}

func infrastructureSessionName(session SessionView) string {
	if name := strings.TrimSpace(session.Name); name != "" {
		return name
	}
	if hostname := strings.TrimSpace(session.Hostname); hostname != "" {
		return hostname
	}
	if len(session.ID) > 8 {
		return session.ID[:8]
	}
	return session.ID
}

func shouldQueryWireGuard(session SessionView) bool {
	transport := strings.ToLower(session.Transport)
	return strings.Contains(transport, "wireguard") || transport == "wg"
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
	deadline := time.Now().Add(infrastructureSnapshotTimeout)
	type baseResult struct {
		kind     string
		sessions []SessionView
		graph    []PivotNodeView
		err      error
	}
	baseCh := make(chan baseResult, 2)
	go func() {
		sessions, err := runInfrastructureQuery(infrastructureQueryTimeout, a.ListSessions)
		baseCh <- baseResult{kind: "sessions", sessions: sessions, err: err}
	}()
	go func() {
		graph, err := runInfrastructureQuery(infrastructureQueryTimeout, a.GetPivotGraph)
		baseCh <- baseResult{kind: "graph", graph: graph, err: err}
	}()

	var sessions []SessionView
	var graph []PivotNodeView
	var graphErr error
	for range 2 {
		remaining := time.Until(deadline)
		if remaining <= 0 {
			return InfrastructureSnapshot{}, errors.New("infrastructure snapshot timed out while loading sessions")
		}
		timer := time.NewTimer(remaining)
		select {
		case base := <-baseCh:
			if !timer.Stop() {
				<-timer.C
			}
			if base.kind == "sessions" {
				if base.err != nil {
					return InfrastructureSnapshot{}, fmt.Errorf("list sessions: %w", base.err)
				}
				sessions = base.sessions
			} else {
				graph, graphErr = base.graph, base.err
			}
		case <-timer.C:
			return InfrastructureSnapshot{}, errors.New("infrastructure snapshot timed out while loading sessions")
		}
	}
	parents, downstream := flattenPivotGraph(graph)
	result := InfrastructureSnapshot{}
	if graphErr != nil {
		result.Warnings = append(result.Warnings, "Pivot 拓扑暂不可用，已继续加载活动转发")
	}

	for _, session := range sessions {
		sessionName := infrastructureSessionName(session)
		status := "online"
		if session.IsDead {
			status = "offline"
		}
		result.Nodes = append(result.Nodes, InfrastructureNode{
			ID: session.ID, Name: sessionName, Kind: "session", Address: session.RemoteAddr,
			Transport: session.Transport, Status: status, ParentID: parents[session.ID],
			Downstream: downstream[session.ID],
		})

		if port := a.SocksProxyStatus(session.ID); port > 0 {
			result.Routes = append(result.Routes, InfrastructureRoute{
				ID: strconv.Itoa(port), SessionID: session.ID, Session: sessionName,
				Type: "socks", Listen: fmt.Sprintf("127.0.0.1:%d", port), Status: status, Source: "client",
			})
		}
		portForwards, portForwardErr := a.ListPortForwards(session.ID)
		if portForwardErr != nil {
			result.Warnings = append(result.Warnings, session.Name+": 本地正向转发状态不可用")
		}
		for _, forward := range portForwards {
			result.Routes = append(result.Routes, InfrastructureRoute{
				ID: strconv.Itoa(forward.LocalPort), SessionID: session.ID, Session: sessionName,
				Type: "forward", Listen: fmt.Sprintf("127.0.0.1:%d", forward.LocalPort),
				Target: forward.Remote, Status: status, Source: "client",
			})
		}

	}

	queryCh := make(chan infrastructureQueryResult, len(sessions)*4)
	queryCount := 0
	launch := func(session SessionView, label string, query func() ([]InfrastructureRoute, error)) {
		queryCount++
		go func() {
			timeout := min(infrastructureQueryTimeout, time.Until(deadline))
			routes, err := runInfrastructureQuery(timeout, query)
			result := infrastructureQueryResult{routes: routes}
			if err != nil {
				result.warning = infrastructureSessionName(session) + ": " + label + "状态查询超时或不可用"
			}
			queryCh <- result
		}()
	}
	for _, session := range sessions {
		if session.IsDead {
			continue
		}
		session := session
		name := infrastructureSessionName(session)
		launch(session, "Pivot ", func() ([]InfrastructureRoute, error) {
			items, err := a.ListPivots(session.ID)
			routes := make([]InfrastructureRoute, 0, len(items))
			for _, item := range items {
				routes = append(routes, InfrastructureRoute{ID: item.ID, SessionID: session.ID, Session: name, Type: "pivot-" + strings.ToLower(item.Type), Listen: item.BindAddress, Status: "online", Source: "teamserver"})
			}
			return routes, err
		})
		launch(session, "反向转发", func() ([]InfrastructureRoute, error) {
			items, err := a.ListRportFwds(session.ID)
			routes := make([]InfrastructureRoute, 0, len(items))
			for _, item := range items {
				routes = append(routes, InfrastructureRoute{ID: strconv.FormatUint(uint64(item.ID), 10), SessionID: session.ID, Session: name, Type: "reverse-forward", Listen: item.Bind, Target: item.Forward, Status: "online", Source: "teamserver"})
			}
			return routes, err
		})
		if shouldQueryWireGuard(session) {
			launch(session, "WireGuard 转发", func() ([]InfrastructureRoute, error) {
				items, err := a.ListWGForwarders(session.ID)
				routes := make([]InfrastructureRoute, 0, len(items))
				for _, item := range items {
					routes = append(routes, InfrastructureRoute{ID: strconv.Itoa(int(item.ID)), SessionID: session.ID, Session: name, Type: "wireguard-forward", Listen: item.LocalAddr, Target: item.RemoteAddr, Status: "online", Source: "teamserver"})
				}
				return routes, err
			})
			launch(session, "WireGuard SOCKS ", func() ([]InfrastructureRoute, error) {
				items, err := a.ListWGSocks(session.ID)
				routes := make([]InfrastructureRoute, 0, len(items))
				for _, item := range items {
					routes = append(routes, InfrastructureRoute{ID: strconv.Itoa(int(item.ID)), SessionID: session.ID, Session: name, Type: "wireguard-socks", Listen: item.LocalAddr, Status: "online", Source: "teamserver"})
				}
				return routes, err
			})
		}
	}
	for range queryCount {
		remaining := time.Until(deadline)
		if remaining <= 0 {
			result.Warnings = append(result.Warnings, "部分活动转发查询超过 6 秒，已显示当前可用结果")
			break
		}
		timer := time.NewTimer(remaining)
		select {
		case query := <-queryCh:
			if !timer.Stop() {
				<-timer.C
			}
			result.Routes = append(result.Routes, query.routes...)
			if query.warning != "" {
				result.Warnings = append(result.Warnings, query.warning)
			}
		case <-timer.C:
			result.Warnings = append(result.Warnings, "部分活动转发查询超过 6 秒，已显示当前可用结果")
			queryCount = 0
		}
		if queryCount == 0 {
			break
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
