package main

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	officialConsoleOutputEvent = "official-console:output"
	officialConsoleExitEvent   = "official-console:exit"
)

type officialConsoleProcess interface {
	io.Reader
	io.Writer
	Resize(width, height int) error
	Wait(context.Context) (uint32, error)
	Close() error
	Pid() int
}

type OfficialConsoleStatus struct {
	Running    bool   `json:"running"`
	PID        int    `json:"pid,omitempty"`
	ClientPath string `json:"clientPath"`
	ConfigPath string `json:"configPath"`
	Configured bool   `json:"configured"`
	Supported  bool   `json:"supported"`
	Message    string `json:"message,omitempty"`
}

func officialClientDataRoot() string {
	executable, err := os.Executable()
	if err != nil {
		return "official-client-data"
	}
	return filepath.Join(filepath.Dir(executable), "official-client-data")
}

func validateOfficialClientPath(value string) (string, error) {
	path := strings.TrimSpace(value)
	if path == "" {
		return "", errors.New("请先选择官方 Sliver Client 可执行文件")
	}
	absolute, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("官方客户端路径无效: %w", err)
	}
	info, err := os.Stat(absolute)
	if err != nil {
		return "", fmt.Errorf("无法访问官方客户端: %w", err)
	}
	if info.IsDir() {
		return "", errors.New("官方客户端路径不能是目录")
	}
	return absolute, nil
}

func syncOfficialOperatorConfig(source, root string) error {
	data, err := os.ReadFile(source)
	if err != nil {
		return fmt.Errorf("读取当前操作员配置失败: %w", err)
	}
	configs := filepath.Join(root, "configs")
	if err := os.MkdirAll(configs, 0o700); err != nil {
		return fmt.Errorf("创建官方客户端配置目录失败: %w", err)
	}
	entries, err := os.ReadDir(configs)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.EqualFold(filepath.Ext(entry.Name()), ".cfg") {
			continue
		}
		if err := os.Remove(filepath.Join(configs, entry.Name())); err != nil {
			return fmt.Errorf("清理旧桥接配置失败: %w", err)
		}
	}
	target := filepath.Join(configs, "current.cfg")
	if err := os.WriteFile(target, data, 0o600); err != nil {
		return fmt.Errorf("同步操作员配置失败: %w", err)
	}
	return nil
}

func removeOfficialOperatorConfig(root string) error {
	path := filepath.Join(root, "configs", "current.cfg")
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("清理官方控制台操作员配置失败: %w", err)
	}
	return nil
}

func (a *App) PickOfficialClient() (string, error) {
	return a.safeOpenFileDialog(runtime.OpenDialogOptions{
		Title: "选择官方 Sliver Client",
		Filters: []runtime.FileFilter{
			{DisplayName: "可执行文件 (*.exe)", Pattern: "*.exe"},
			{DisplayName: "所有文件 (*.*)", Pattern: "*.*"},
		},
	})
}

func (a *App) SetOfficialClientPath(value string) (OfficialConsoleStatus, error) {
	if strings.TrimSpace(value) != "" {
		if _, err := validateOfficialClientPath(value); err != nil {
			return OfficialConsoleStatus{}, err
		}
	}
	if err := updateOfficialClientPath(appConfigPath(), value); err != nil {
		return OfficialConsoleStatus{}, err
	}
	return a.GetOfficialConsoleStatus()
}

func (a *App) GetOfficialConsoleStatus() (OfficialConsoleStatus, error) {
	path, err := loadOfficialClientPath(appConfigPath())
	if err != nil {
		return OfficialConsoleStatus{}, err
	}
	a.mu.Lock()
	configPath := a.configPath
	a.mu.Unlock()
	a.officialMu.Lock()
	process := a.official
	a.officialMu.Unlock()
	status := OfficialConsoleStatus{
		Running:    process != nil,
		ClientPath: path,
		ConfigPath: configPath,
		Configured: strings.TrimSpace(path) != "",
		Supported:  officialConsoleSupported(),
	}
	if process != nil {
		status.PID = process.Pid()
	}
	if !status.Supported {
		status.Message = "官方控制台桥接当前仅支持 Windows ConPTY"
	}
	return status, nil
}

func (a *App) StartOfficialConsole(cols, rows int) (OfficialConsoleStatus, error) {
	if !officialConsoleSupported() {
		return OfficialConsoleStatus{}, errors.New("当前系统不支持 Windows ConPTY")
	}
	path, err := loadOfficialClientPath(appConfigPath())
	if err != nil {
		return OfficialConsoleStatus{}, err
	}
	path, err = validateOfficialClientPath(path)
	if err != nil {
		return OfficialConsoleStatus{}, err
	}
	a.mu.Lock()
	configPath := a.configPath
	connected := a.client != nil
	a.mu.Unlock()
	if !connected || strings.TrimSpace(configPath) == "" {
		return OfficialConsoleStatus{}, errors.New("请先连接 Teamserver，再启动官方控制台")
	}
	root := officialClientDataRoot()
	if err := syncOfficialOperatorConfig(configPath, root); err != nil {
		return OfficialConsoleStatus{}, err
	}
	if cols < 20 {
		cols = 120
	}
	if rows < 5 {
		rows = 32
	}
	process, err := startOfficialConsoleProcess(path, root, cols, rows)
	if err != nil {
		_ = removeOfficialOperatorConfig(root)
		return OfficialConsoleStatus{}, fmt.Errorf("启动官方客户端失败: %w", err)
	}
	a.officialMu.Lock()
	if a.official != nil {
		a.officialMu.Unlock()
		_ = process.Close()
		return OfficialConsoleStatus{}, errors.New("官方控制台已经在运行")
	}
	a.officialSeq++
	sequence := a.officialSeq
	a.official = process
	a.officialMu.Unlock()

	go a.streamOfficialConsole(sequence, process)
	status, statusErr := a.GetOfficialConsoleStatus()
	if statusErr != nil {
		_ = a.StopOfficialConsole()
		return OfficialConsoleStatus{}, statusErr
	}
	return status, nil
}

func (a *App) streamOfficialConsole(sequence uint64, process officialConsoleProcess) {
	buffer := make([]byte, 32*1024)
	for {
		count, err := process.Read(buffer)
		if count > 0 && a.ctx != nil {
			runtime.EventsEmit(a.ctx, officialConsoleOutputEvent, base64.StdEncoding.EncodeToString(buffer[:count]))
		}
		if err != nil {
			break
		}
	}
	exitCode, waitErr := process.Wait(context.Background())
	a.officialMu.Lock()
	current := a.officialSeq == sequence && a.official == process
	if current {
		a.official = nil
	}
	a.officialMu.Unlock()
	_ = process.Close()
	if current {
		_ = removeOfficialOperatorConfig(officialClientDataRoot())
	}
	if current && a.ctx != nil {
		payload := map[string]any{"exitCode": exitCode}
		if waitErr != nil {
			payload["error"] = waitErr.Error()
		}
		runtime.EventsEmit(a.ctx, officialConsoleExitEvent, payload)
	}
}

func (a *App) WriteOfficialConsole(encoded string) error {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return errors.New("官方控制台输入编码无效")
	}
	a.officialMu.Lock()
	defer a.officialMu.Unlock()
	process := a.official
	if process == nil {
		return errors.New("官方控制台未运行")
	}
	_, err = process.Write(data)
	return err
}

func (a *App) ResizeOfficialConsole(cols, rows int) error {
	if cols < 2 || rows < 2 || cols > 1000 || rows > 500 {
		return errors.New("终端尺寸无效")
	}
	a.officialMu.Lock()
	defer a.officialMu.Unlock()
	process := a.official
	if process == nil {
		return nil
	}
	return process.Resize(cols, rows)
}

func (a *App) StopOfficialConsole() error {
	a.officialMu.Lock()
	process := a.official
	if process == nil {
		a.officialMu.Unlock()
		return removeOfficialOperatorConfig(officialClientDataRoot())
	}
	a.officialSeq++
	a.official = nil
	a.officialMu.Unlock()
	err := process.Close()
	cleanupErr := removeOfficialOperatorConfig(officialClientDataRoot())
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, officialConsoleExitEvent, map[string]any{"stopped": true})
	}
	if err == nil {
		err = cleanupErr
	}
	return err
}
