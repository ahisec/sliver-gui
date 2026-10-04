package main

/*
	Extension / BOF support.

	Mirrors the load+call flow from Sliver's own client
	(client/command/extensions): parse an extension.json manifest, register the
	target binary with the implant, pack typed arguments into a BOF buffer, and
	CallExtension. For BOFs (.o files) the coff-loader dependency is registered
	and the BOF is passed to it as data. We reuse core.BOFArgsBuffer so the
	binary arg format matches the implant exactly.
*/

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/bishopfox/sliver/client/core"
	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/bishopfox/sliver/protobuf/sliverpb"
)

// ─── Manifest structs (extension.json) ──────────────────────────────────────────

type extFile struct {
	OS   string `json:"os"`
	Arch string `json:"arch"`
	Path string `json:"path"`
}

type extArg struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Desc     string `json:"desc"`
	Optional bool   `json:"optional"`
}

// extCommand is one runnable command inside a manifest.
type extCommand struct {
	CommandName string    `json:"command_name"`
	LegacyName  string    `json:"name"`
	Help        string    `json:"help"`
	Entrypoint  string    `json:"entrypoint"`
	DependsOn   string    `json:"depends_on"`
	Init        string    `json:"init"`
	Files       []extFile `json:"files"`
	Arguments   []extArg  `json:"arguments"`
}

// extManifest supports both the v2 (commands array) and v1 (single command at
// the top level) manifest layouts.
type extManifest struct {
	Name        string       `json:"name"`
	PackageName string       `json:"package_name"`
	Version     string       `json:"version"`
	Commands    []extCommand `json:"commands"`
	// v1 single-command fields:
	CommandName string    `json:"command_name"`
	Help        string    `json:"help"`
	Entrypoint  string    `json:"entrypoint"`
	DependsOn   string    `json:"depends_on"`
	Init        string    `json:"init"`
	Files       []extFile `json:"files"`
	Arguments   []extArg  `json:"arguments"`

	rootPath string
}

// commands returns the manifest's commands normalized (v1 → single command).
func (m *extManifest) commands() []extCommand {
	if len(m.Commands) > 0 {
		return m.Commands
	}
	return []extCommand{{
		CommandName: m.CommandName,
		Help:        m.Help,
		Entrypoint:  m.Entrypoint,
		DependsOn:   m.DependsOn,
		Init:        m.Init,
		Files:       m.Files,
		Arguments:   m.Arguments,
	}}
}

const localExtensionMaxArchiveSize = 256 * 1024 * 1024

// InstallLocalExtension installs an extension from the operator computer. It
// intentionally does not read paths on the Teamserver or an implant.
func (a *App) InstallLocalExtension(sourcePath string) error {
	sourcePath = strings.TrimSpace(sourcePath)
	if sourcePath == "" {
		return fmt.Errorf("请输入 GUI 客户端本机的扩展目录或 .tar.gz 路径")
	}
	if runtime.GOOS == "windows" && strings.HasPrefix(filepath.ToSlash(sourcePath), "/") {
		return fmt.Errorf("路径 %q 位于 Linux/Teamserver，而 GUI 运行在 Windows，无法直接读取；请先将安装包下载到 Windows，再执行 extensions install \"C:\\path\\package.tar.gz\"", sourcePath)
	}
	info, err := os.Stat(sourcePath)
	if err != nil {
		return fmt.Errorf("无法读取 GUI 客户端本机路径 %q：%w；Teamserver 上的文件需先下载到本机", sourcePath, err)
	}

	root := extensionsDir()
	if root == "" {
		return fmt.Errorf("无法确定本机扩展安装目录")
	}
	if err := os.MkdirAll(root, 0700); err != nil {
		return fmt.Errorf("创建扩展安装目录：%w", err)
	}
	stage, err := os.MkdirTemp(root, ".extension-install-")
	if err != nil {
		return fmt.Errorf("创建扩展暂存目录：%w", err)
	}
	defer os.RemoveAll(stage)

	if info.IsDir() {
		err = copyLocalExtensionDirectory(sourcePath, stage)
	} else {
		lower := strings.ToLower(sourcePath)
		if !strings.HasSuffix(lower, ".tar.gz") && !strings.HasSuffix(lower, ".tgz") {
			return fmt.Errorf("扩展包必须是目录、.tar.gz 或 .tgz 文件")
		}
		if info.Size() > localExtensionMaxArchiveSize {
			return fmt.Errorf("扩展包超过 %d MiB 大小限制", localExtensionMaxArchiveSize/(1024*1024))
		}
		file, openErr := os.Open(sourcePath)
		if openErr != nil {
			return fmt.Errorf("打开扩展包：%w", openErr)
		}
		err = extractLocalExtensionArchive(file, stage)
		file.Close()
	}
	if err != nil {
		return err
	}

	manifest, err := loadManifest(filepath.Join(stage, "extension.json"))
	if err != nil {
		return fmt.Errorf("读取 extension.json：%w", err)
	}
	installName, err := validateLocalExtension(stage, manifest)
	if err != nil {
		return err
	}
	destination := filepath.Join(root, installName)
	if _, err := os.Stat(destination); err == nil {
		return fmt.Errorf("扩展 %q 已安装；为避免覆盖，请先在扩展中心移除旧版本", installName)
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("检查扩展安装目录：%w", err)
	}
	if err := os.Rename(stage, destination); err != nil {
		return fmt.Errorf("启用扩展：%w", err)
	}
	return nil
}

func validateLocalExtension(root string, manifest *extManifest) (string, error) {
	name := strings.TrimSpace(manifest.PackageName)
	if name == "" {
		name = strings.TrimSpace(manifest.Name)
	}
	if err := validateArmoryInstallName(name); err != nil {
		return "", fmt.Errorf("extension.json 包名无效：%w", err)
	}
	commands := manifest.commands()
	if len(commands) == 0 {
		return "", fmt.Errorf("extension.json 未定义命令")
	}
	for _, command := range commands {
		if strings.TrimSpace(command.CommandName) == "" {
			return "", fmt.Errorf("extension.json 存在缺少 command_name 的命令")
		}
		if len(command.Files) == 0 {
			return "", fmt.Errorf("命令 %q 未定义 files", command.CommandName)
		}
		for _, file := range command.Files {
			candidate, err := localExtensionPath(root, file.Path)
			if err != nil {
				return "", fmt.Errorf("命令 %q 的文件路径无效：%w", command.CommandName, err)
			}
			info, err := os.Stat(candidate)
			if err != nil || !info.Mode().IsRegular() {
				return "", fmt.Errorf("命令 %q 引用的文件不存在或不是普通文件：%s", command.CommandName, file.Path)
			}
		}
	}
	return name, nil
}

func localExtensionPath(root, relative string) (string, error) {
	relative = filepath.FromSlash(strings.TrimSpace(relative))
	if relative == "" || filepath.IsAbs(relative) {
		return "", fmt.Errorf("路径为空或为绝对路径 %q", relative)
	}
	clean := filepath.Clean(relative)
	if clean == "." || clean == ".." || strings.HasPrefix(clean, ".."+string(os.PathSeparator)) {
		return "", fmt.Errorf("路径越界 %q", relative)
	}
	return filepath.Join(root, clean), nil
}

func copyLocalExtensionDirectory(source, destination string) error {
	return filepath.WalkDir(source, func(path string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.Type()&os.ModeSymlink != 0 {
			return fmt.Errorf("扩展目录不能包含符号链接：%s", path)
		}
		relative, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}
		target := filepath.Join(destination, relative)
		if entry.IsDir() {
			return os.MkdirAll(target, 0700)
		}
		if !entry.Type().IsRegular() {
			return fmt.Errorf("扩展目录包含不支持的文件类型：%s", path)
		}
		input, err := os.Open(path)
		if err != nil {
			return err
		}
		output, err := os.OpenFile(target, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if err != nil {
			input.Close()
			return err
		}
		_, copyErr := io.Copy(output, input)
		inputCloseErr := input.Close()
		closeErr := output.Close()
		if copyErr != nil {
			return copyErr
		}
		if inputCloseErr != nil {
			return inputCloseErr
		}
		return closeErr
	})
}

func extractLocalExtensionArchive(input io.Reader, destination string) error {
	gz, err := gzip.NewReader(input)
	if err != nil {
		return fmt.Errorf("读取 gzip：%w", err)
	}
	defer gz.Close()
	reader := tar.NewReader(gz)
	var total int64
	for {
		header, err := reader.Next()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return fmt.Errorf("读取 tar：%w", err)
		}
		target, err := localExtensionPath(destination, strings.TrimPrefix(filepath.ToSlash(header.Name), "./"))
		if err != nil {
			return fmt.Errorf("归档包含不安全路径 %q：%w", header.Name, err)
		}
		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0700); err != nil {
				return err
			}
		case tar.TypeReg, tar.TypeRegA:
			total += header.Size
			if header.Size < 0 || total > localExtensionMaxArchiveSize {
				return fmt.Errorf("扩展包解压后超过 %d MiB 大小限制", localExtensionMaxArchiveSize/(1024*1024))
			}
			if err := os.MkdirAll(filepath.Dir(target), 0700); err != nil {
				return err
			}
			output, err := os.OpenFile(target, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
			if err != nil {
				return err
			}
			_, copyErr := io.CopyN(output, reader, header.Size)
			closeErr := output.Close()
			if copyErr != nil {
				return copyErr
			}
			if closeErr != nil {
				return closeErr
			}
		default:
			return fmt.Errorf("扩展包包含不支持的链接或文件类型：%s", header.Name)
		}
	}
}

func (c *extCommand) fileFor(goos, goarch string) string {
	for _, f := range c.Files {
		if f.OS == goos && f.Arch == goarch {
			return f.Path
		}
	}
	return ""
}

// ─── Public views ───────────────────────────────────────────────────────────────

type ExtCommandView struct {
	Command      string `json:"command"`
	Extension    string `json:"extension"`
	Help         string `json:"help"`
	IsBOF        bool   `json:"isBof"`
	Args         string `json:"args"`
	ManifestPath string `json:"manifestPath"`
}

// extensionsDir returns the operator's installed-extensions directory
// (~/.sliver-client/extensions), the same location the official client uses.
func extensionsDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".sliver-client", "extensions")
}

func loadManifest(path string) (*extManifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var m extManifest
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, fmt.Errorf("parse manifest: %w", err)
	}
	for i := range m.Commands {
		if strings.TrimSpace(m.Commands[i].CommandName) == "" {
			m.Commands[i].CommandName = strings.TrimSpace(m.Commands[i].LegacyName)
		}
	}
	m.rootPath = filepath.Dir(path)
	return &m, nil
}

func installedExtensionManifestPath(name string) string {
	dir := extensionsDir()
	direct := filepath.Join(dir, name, "extension.json")
	if _, err := os.Stat(direct); err == nil {
		return direct
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return direct
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		candidate := filepath.Join(dir, entry.Name(), "extension.json")
		manifest, err := loadManifest(candidate)
		if err != nil {
			continue
		}
		if strings.EqualFold(manifest.Name, name) || strings.EqualFold(manifest.PackageName, name) {
			return candidate
		}
		for _, command := range manifest.commands() {
			if strings.EqualFold(command.CommandName, name) {
				return candidate
			}
		}
	}
	return direct
}

// ListInstalledExtensions scans ~/.sliver-client/extensions and returns every
// runnable command it finds — what the operator can `ext` in the GUI.
func (a *App) ListInstalledExtensions() ([]ExtCommandView, error) {
	dir := extensionsDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return []ExtCommandView{}, nil // no extensions installed yet — not an error
	}
	out := []ExtCommandView{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		mp := filepath.Join(dir, e.Name(), "extension.json")
		m, err := loadManifest(mp)
		if err != nil {
			continue
		}
		for _, c := range m.commands() {
			argNames := make([]string, 0, len(c.Arguments))
			isBOF := false
			for _, f := range c.Files {
				if strings.HasSuffix(f.Path, ".o") {
					isBOF = true
					break
				}
			}
			for _, ar := range c.Arguments {
				n := ar.Name + ":" + ar.Type
				if ar.Optional {
					n = "[" + n + "]"
				}
				argNames = append(argNames, n)
			}
			out = append(out, ExtCommandView{
				Command:      c.CommandName,
				Extension:    m.Name,
				Help:         c.Help,
				IsBOF:        isBOF,
				Args:         strings.Join(argNames, " "),
				ManifestPath: mp,
			})
		}
	}
	return out, nil
}

// ListImplantExtensions lists extensions currently registered in the implant.
func (a *App) ListImplantExtensions(sessionID string) ([]string, error) {
	client, err := a.requireClient()
	if err != nil {
		return nil, err
	}
	resp, err := client.RPC.ListExtensions(a.ctx, &sliverpb.ListExtensionsReq{
		Request: &commonpb.Request{SessionID: sessionID},
	})
	if err != nil {
		return nil, err
	}
	return resp.Names, nil
}

// registerExtBinary reads an extension binary for the target and registers it
// with the implant, returning the sha256 name it was registered under.
func (a *App) registerExtBinary(sessionID, binPath, goos, initFn string) (string, []byte, error) {
	data, err := os.ReadFile(binPath)
	if err != nil {
		return "", nil, fmt.Errorf("read %s: %w", binPath, err)
	}
	if len(data) == 0 {
		return "", nil, fmt.Errorf("extension file is empty: %s", binPath)
	}
	sum := sha256.Sum256(data)
	name := hex.EncodeToString(sum[:])
	client, err := a.requireClient()
	if err != nil {
		return "", nil, err
	}
	_, err = client.RPC.RegisterExtension(a.ctx, &sliverpb.RegisterExtensionReq{
		Name:    name,
		Data:    data,
		OS:      goos,
		Init:    initFn,
		Request: &commonpb.Request{SessionID: sessionID},
	})
	if err != nil {
		return "", nil, err
	}
	return name, data, nil
}

// findCommand locates a command by name across all installed extensions.
func findCommand(command string) (*extManifest, *extCommand, error) {
	dir := extensionsDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, nil, fmt.Errorf("no extensions installed (%s)", dir)
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		m, err := loadManifest(filepath.Join(dir, e.Name(), "extension.json"))
		if err != nil {
			continue
		}
		for i := range m.commands() {
			c := m.commands()[i]
			if c.CommandName == command {
				return m, &c, nil
			}
		}
	}
	return nil, nil, fmt.Errorf("extension command %q not found in %s", command, dir)
}

// packArgs packs positional args into a BOF buffer according to the command's
// declared argument types (string/wstring/int/short/file).
func packArgs(c *extCommand, args []string) ([]byte, error) {
	buf := core.BOFArgsBuffer{Buffer: new(bytes.Buffer)}
	for i, def := range c.Arguments {
		if i >= len(args) {
			if def.Optional {
				continue
			}
			return nil, fmt.Errorf("missing required argument %q (%s)", def.Name, def.Type)
		}
		v := args[i]
		var err error
		switch def.Type {
		case "string":
			err = buf.AddString(v)
		case "wstring":
			err = buf.AddWString(v)
		case "int", "integer":
			n, e := strconv.Atoi(v)
			if e != nil {
				return nil, fmt.Errorf("arg %q must be an integer", def.Name)
			}
			err = buf.AddInt(uint32(n))
		case "short":
			n, e := strconv.Atoi(v)
			if e != nil {
				return nil, fmt.Errorf("arg %q must be an integer", def.Name)
			}
			err = buf.AddShort(uint16(n))
		case "file":
			fdata, e := os.ReadFile(v)
			if e != nil {
				return nil, fmt.Errorf("arg %q: read file %s: %w", def.Name, v, e)
			}
			err = buf.AddData(fdata)
		default:
			return nil, fmt.Errorf("unsupported argument type %q", def.Type)
		}
		if err != nil {
			return nil, err
		}
	}
	return buf.GetBuffer()
}

// RunExtension loads (if needed) and executes an installed extension command on
// a session, returning its output. args are positional, in manifest order.
func (a *App) RunExtension(sessionID, command string, args []string) (string, error) {
	started := time.Now()
	status := "failed"
	defer func() {
		summary := "执行失败"
		if status == "success" {
			summary = "执行完成"
		}
		a.recordExtensionExecution("extension", command, sessionID, status, summary, started)
	}()
	client, err := a.requireClient()
	if err != nil {
		return "", err
	}
	m, c, err := findCommand(command)
	if err != nil {
		return "", err
	}
	goos, goarch, err := a.sessionPlatform(sessionID)
	if err != nil {
		return "", err
	}

	relFile := c.fileFor(goos, goarch)
	if relFile == "" {
		return "", fmt.Errorf("extension %q has no binary for %s/%s", command, goos, goarch)
	}
	binPath := filepath.Join(m.rootPath, relFile)

	// Register the extension binary.
	extName, binData, err := a.registerExtBinary(sessionID, binPath, goos, c.Init)
	if err != nil {
		return "", fmt.Errorf("register extension: %w", err)
	}

	isBOF := strings.HasSuffix(binPath, ".o")
	var callName, export string
	var callArgs []byte

	if isBOF {
		// BOFs run via the coff-loader dependency. Register the dep, then pack
		// [entrypoint][bof bytes][typed args] and call the dep.
		if c.DependsOn == "" {
			return "", fmt.Errorf("BOF %q has no depends_on (coff-loader) in its manifest", command)
		}
		depName, depEntry, err := a.registerDependency(sessionID, c.DependsOn, goos, goarch)
		if err != nil {
			return "", fmt.Errorf("load dependency %q: %w", c.DependsOn, err)
		}
		packed, err := packArgs(c, args)
		if err != nil {
			return "", err
		}
		buf := core.BOFArgsBuffer{Buffer: new(bytes.Buffer)}
		if err := buf.AddString(c.Entrypoint); err != nil {
			return "", err
		}
		if err := buf.AddData(binData); err != nil {
			return "", err
		}
		if err := buf.AddData(packed); err != nil {
			return "", err
		}
		callArgs, err = buf.GetBuffer()
		if err != nil {
			return "", err
		}
		callName = depName
		export = depEntry
	} else {
		// Regular DLL/.so extension — args are space-joined raw.
		callName = extName
		export = c.Entrypoint
		callArgs = []byte(strings.Join(args, " "))
	}

	resp, err := client.RPC.CallExtension(a.ctx, &sliverpb.CallExtensionReq{
		Name:    callName,
		Export:  export,
		Args:    callArgs,
		Request: &commonpb.Request{SessionID: sessionID},
	})
	if err != nil {
		return "", err
	}
	if resp.Response != nil && resp.Response.Err != "" {
		return "", fmt.Errorf("%s", resp.Response.Err)
	}
	status = "success"
	return decodeCommandOutput(resp.Output, goos), nil
}

// registerDependency registers a dependency extension (e.g. coff-loader) and
// returns the sha256 name it was registered under plus its entrypoint.
func (a *App) registerDependency(sessionID, depName, goos, goarch string) (string, string, error) {
	mp := installedExtensionManifestPath(depName)
	m, err := loadManifest(mp)
	if err != nil {
		return "", "", fmt.Errorf("dependency %q not installed (%s)", depName, mp)
	}
	cmds := m.commands()
	if len(cmds) == 0 {
		return "", "", fmt.Errorf("dependency %q has no commands", depName)
	}
	c := cmds[0]
	rel := c.fileFor(goos, goarch)
	if rel == "" {
		return "", "", fmt.Errorf("dependency %q has no binary for %s/%s", depName, goos, goarch)
	}
	name, _, err := a.registerExtBinary(sessionID, filepath.Join(m.rootPath, rel), goos, c.Init)
	if err != nil {
		return "", "", err
	}
	return name, c.Entrypoint, nil
}

// sessionPlatform returns a session's GOOS/GOARCH.
func (a *App) sessionPlatform(sessionID string) (string, string, error) {
	client, err := a.requireClient()
	if err != nil {
		return "", "", err
	}
	sessions, err := client.ListSessions(a.ctx)
	if err != nil {
		return "", "", err
	}
	for _, s := range sessions {
		if s.ID == sessionID {
			return s.OS, s.Arch, nil
		}
	}
	return "", "", fmt.Errorf("session not found")
}
