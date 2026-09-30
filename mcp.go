package main

import (
	"context"
	"errors"
	"fmt"
	"net"
	"strconv"
	"strings"
	"time"

	slivermcp "github.com/bishopfox/sliver/client/mcp"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var mcpToolNames = []string{
	"list_sessions_and_beacons", "fs_ls", "fs_cd", "fs_cat", "fs_pwd",
	"fs_rm", "fs_mv", "fs_cp", "fs_mkdir", "fs_chmod", "fs_chown",
}

type MCPStartRequest struct {
	Transport        string `json:"transport"`
	ListenAddress    string `json:"listenAddress"`
	AllowNonLoopback bool   `json:"allowNonLoopback"`
}

type MCPStatusView struct {
	Running        bool     `json:"running"`
	Transport      string   `json:"transport"`
	ListenAddress  string   `json:"listenAddress"`
	Endpoint       string   `json:"endpoint"`
	StartedAt      string   `json:"startedAt,omitempty"`
	LastError      string   `json:"lastError,omitempty"`
	AuthHeader     string   `json:"authHeader"`
	MaskedToken    string   `json:"maskedToken,omitempty"`
	AuthConfigPath string   `json:"authConfigPath"`
	Tools          []string `json:"tools"`
	Experimental   bool     `json:"experimental"`
}

func validateMCPListenAddress(address string, allowNonLoopback bool) error {
	host, port, err := net.SplitHostPort(strings.TrimSpace(address))
	if err != nil {
		return fmt.Errorf("监听地址格式无效: %w", err)
	}
	if port == "" {
		return fmt.Errorf("监听端口不能为空")
	}
	portNumber, err := strconv.Atoi(port)
	if err != nil || portNumber < 1 || portNumber > 65535 {
		return fmt.Errorf("监听端口必须是 1-65535 之间的数字")
	}
	loopback := strings.EqualFold(host, "localhost")
	if ip := net.ParseIP(host); ip != nil {
		loopback = ip.IsLoopback()
	}
	if !loopback && !allowNonLoopback {
		return fmt.Errorf("非环回监听需要显式确认")
	}
	return nil
}

func maskMCPToken(token string) string {
	token = strings.TrimSpace(token)
	if token == "" {
		return ""
	}
	if len(token) <= 4 {
		return "****"
	}
	return "****" + token[len(token)-4:]
}

func mcpStatusView(status slivermcp.Status) MCPStatusView {
	endpoint, _ := status.Config.EndpointURL()
	startedAt := ""
	if !status.StartedAt.IsZero() {
		startedAt = status.StartedAt.Local().Format("2006-01-02 15:04:05")
	}
	return MCPStatusView{
		Running: status.Running, Transport: string(status.Config.Transport),
		ListenAddress: status.Config.ListenAddress, Endpoint: endpoint,
		StartedAt: startedAt, LastError: status.LastError,
		AuthHeader: status.AuthHeader, MaskedToken: maskMCPToken(status.AuthToken),
		AuthConfigPath: status.AuthConfigPath, Tools: append([]string(nil), mcpToolNames...),
		Experimental: true,
	}
}

func (a *App) GetMCPStatus() MCPStatusView {
	return mcpStatusView(slivermcp.GetStatus())
}

func (a *App) StartMCP(req MCPStartRequest) (MCPStatusView, error) {
	client, err := a.requireClient()
	if err != nil {
		return a.GetMCPStatus(), err
	}
	transport, err := slivermcp.ParseTransport(req.Transport)
	if err != nil {
		return a.GetMCPStatus(), err
	}
	address := strings.TrimSpace(req.ListenAddress)
	if address == "" {
		address = "127.0.0.1:8080"
	}
	if err := validateMCPListenAddress(address, req.AllowNonLoopback); err != nil {
		return a.GetMCPStatus(), err
	}
	cfg := slivermcp.DefaultConfig()
	cfg.Transport = transport
	cfg.ListenAddress = address
	if err := slivermcp.Start(cfg, client.RPC); err != nil {
		return a.GetMCPStatus(), err
	}
	// Start binds asynchronously; briefly allow immediate bind errors to surface.
	time.Sleep(30 * time.Millisecond)
	status := a.GetMCPStatus()
	if !status.Running && status.LastError != "" {
		return status, errors.New(status.LastError)
	}
	return status, nil
}

func (a *App) StopMCP() error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	err := slivermcp.Stop(ctx)
	if errors.Is(err, slivermcp.ErrNotRunning) {
		return nil
	}
	return err
}

// CopyMCPToken writes the full token directly to the native clipboard. The
// token is never returned through the Wails bridge or stored in frontend state.
func (a *App) CopyMCPToken() error {
	auth, err := slivermcp.LoadAuthInfo()
	if err != nil {
		return err
	}
	if a.ctx == nil {
		return fmt.Errorf("application context not initialized")
	}
	return runtime.ClipboardSetText(a.ctx, auth.Token)
}
