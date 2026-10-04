package main

import (
	"fmt"
	"regexp"
	"strconv"
	"time"
)

const (
	capabilityAvailable   = "available"
	capabilityEmpty       = "empty"
	capabilityUnavailable = "unavailable"

	versionModeMatched      = "matched"
	versionModeForward      = "forward"
	versionModeBackward     = "backward"
	versionModeIncompatible = "incompatible"
	versionModeUnknown      = "unknown"
)

var semanticVersionPattern = regexp.MustCompile(`^v?(\d+)\.(\d+)\.(\d+)`)

// CompatibilityItem is one independently probed Teamserver capability. A
// failed optional RPC is reported on its own item and does not hide the rest of
// the compatibility snapshot.
type CompatibilityItem struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Status  string   `json:"status"`
	Summary string   `json:"summary"`
	Details []string `json:"details,omitempty"`
	Error   string   `json:"error,omitempty"`
}

// ServerCompatibility is a read-only snapshot of the connected Teamserver and
// the capabilities exposed by its current Sliver RPC API.
type ServerCompatibility struct {
	GeneratedAt string              `json:"generatedAt"`
	Operator    string              `json:"operator"`
	Teamserver  string              `json:"teamserver"`
	GUI         BuildInfo           `json:"gui"`
	Server      VersionInfo         `json:"server"`
	Negotiation VersionNegotiation  `json:"negotiation"`
	Items       []CompatibilityItem `json:"items"`
}

// VersionNegotiation describes how the compiled Sliver client baseline relates
// to the connected Teamserver. Feature availability still depends on each RPC;
// this result never turns a version comparison into an execution capability.
type VersionNegotiation struct {
	Mode              string `json:"mode"`
	Label             string `json:"label"`
	Summary           string `json:"summary"`
	ClientBaseline    string `json:"clientBaseline"`
	ServerVersion     string `json:"serverVersion"`
	ContinueKnownRPCs bool   `json:"continueKnownRpcs"`
}

type semanticVersion struct {
	major int
	minor int
	patch int
}

func parseSemanticVersion(value string) (semanticVersion, bool) {
	matches := semanticVersionPattern.FindStringSubmatch(value)
	if len(matches) != 4 {
		return semanticVersion{}, false
	}
	parts := [3]int{}
	for index := range parts {
		parsed, err := strconv.Atoi(matches[index+1])
		if err != nil {
			return semanticVersion{}, false
		}
		parts[index] = parsed
	}
	return semanticVersion{major: parts[0], minor: parts[1], patch: parts[2]}, true
}

func compareSemanticVersions(left, right semanticVersion) int {
	leftParts := [3]int{left.major, left.minor, left.patch}
	rightParts := [3]int{right.major, right.minor, right.patch}
	for index := range leftParts {
		if leftParts[index] < rightParts[index] {
			return -1
		}
		if leftParts[index] > rightParts[index] {
			return 1
		}
	}
	return 0
}

func negotiateServerVersion(clientDependency string, server VersionInfo, serverKnown bool) VersionNegotiation {
	result := VersionNegotiation{
		Mode:              versionModeUnknown,
		Label:             "版本关系未知",
		Summary:           "无法比较协议基线；客户端仍按逐项 RPC 结果判断能力。",
		ClientBaseline:    clientDependency,
		ContinueKnownRPCs: true,
	}
	if serverKnown {
		result.ServerVersion = fmt.Sprintf("v%d.%d.%d", server.Major, server.Minor, server.Patch)
	}
	clientVersion, clientOK := parseSemanticVersion(clientDependency)
	if !serverKnown || !clientOK {
		return result
	}
	serverVersion := semanticVersion{major: int(server.Major), minor: int(server.Minor), patch: int(server.Patch)}
	if clientVersion.major != serverVersion.major {
		result.Mode = versionModeIncompatible
		result.Label = "主版本不兼容"
		result.Summary = "Server 与客户端协议基线的主版本不同；仅保留连接和逐项探测，不保证现有 RPC 可用。"
		return result
	}
	switch compareSemanticVersions(serverVersion, clientVersion) {
	case 1:
		result.Mode = versionModeForward
		result.Label = "前向兼容模式"
		result.Summary = "Server 较新；继续启用客户端已知 RPC，新命令和新字段需显式适配后才能使用。"
	case -1:
		result.Mode = versionModeBackward
		result.Label = "旧版 Server 兼容模式"
		result.Summary = "Server 较旧；已有功能按 RPC 可用性自动降级。"
	default:
		result.Mode = versionModeMatched
		result.Label = "协议基线一致"
		result.Summary = "Server 与客户端 Sliver 语义版本一致，功能仍按逐项 RPC 结果确认。"
	}
	return result
}

func unavailableCapability(id, label string, err error) CompatibilityItem {
	return CompatibilityItem{
		ID: id, Label: label, Status: capabilityUnavailable,
		Summary: "当前 Teamserver 未提供此信息",
		Error:   err.Error(),
	}
}

// GetServerCompatibility probes read-only RPCs used by the compatibility
// centre. It deliberately avoids changing Teamserver state.
func (a *App) GetServerCompatibility() (ServerCompatibility, error) {
	client, err := a.requireClient()
	if err != nil {
		return ServerCompatibility{}, err
	}

	snapshot := ServerCompatibility{
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Operator:    client.Config.Operator,
		Teamserver:  fmt.Sprintf("%s:%d", client.Config.LHost, client.Config.LPort),
		GUI:         a.AppVersion(),
		Items:       make([]CompatibilityItem, 0, 5),
	}
	snapshot.Negotiation = negotiateServerVersion(snapshot.GUI.Dependencies.Sliver, VersionInfo{}, false)

	if version, probeErr := a.GetVersion(); probeErr != nil {
		snapshot.Items = append(snapshot.Items, unavailableCapability("version", "Teamserver 版本", probeErr))
	} else {
		snapshot.Server = version
		snapshot.Negotiation = negotiateServerVersion(snapshot.GUI.Dependencies.Sliver, version, true)
		snapshot.Items = append(snapshot.Items, CompatibilityItem{
			ID: "version", Label: "Teamserver 版本", Status: capabilityAvailable,
			Summary: fmt.Sprintf("Sliver v%d.%d.%d · %s/%s", version.Major, version.Minor, version.Patch, version.OS, version.Arch),
			Details: []string{"提交: " + version.Commit, "编译日期: " + version.Compiled},
		})
	}

	if compiler, probeErr := a.GetCompilerInfo(); probeErr != nil {
		snapshot.Items = append(snapshot.Items, unavailableCapability("compiler", "内置编译器", probeErr))
	} else {
		details := make([]string, 0, len(compiler.Targets)+len(compiler.CrossCompilers))
		for _, target := range compiler.Targets {
			details = append(details, fmt.Sprintf("%s/%s · %s", target.GOOS, target.GOARCH, target.Format))
		}
		for _, crossCompiler := range compiler.CrossCompilers {
			details = append(details, "交叉编译器: "+crossCompiler)
		}
		snapshot.Items = append(snapshot.Items, CompatibilityItem{
			ID: "compiler", Label: "内置编译器", Status: capabilityAvailable,
			Summary: fmt.Sprintf("运行于 %s/%s · %d 个目标", compiler.GOOS, compiler.GOARCH, len(compiler.Targets)),
			Details: details,
		})
	}

	if builders, probeErr := a.ListBuilders(); probeErr != nil {
		snapshot.Items = append(snapshot.Items, unavailableCapability("builders", "外部 Builder", probeErr))
	} else {
		item := CompatibilityItem{ID: "builders", Label: "外部 Builder", Status: capabilityAvailable}
		if len(builders) == 0 {
			item.Status = capabilityEmpty
			item.Summary = "未注册外部 Builder"
		} else {
			item.Summary = fmt.Sprintf("已注册 %d 个 Builder", len(builders))
			for _, builder := range builders {
				item.Details = append(item.Details, fmt.Sprintf("%s · %s/%s · %s", builder.Name, builder.GOOS, builder.GOARCH, builder.Templates))
			}
		}
		snapshot.Items = append(snapshot.Items, item)
	}

	if encoders, probeErr := a.ListTrafficEncoders(); probeErr != nil {
		snapshot.Items = append(snapshot.Items, unavailableCapability("traffic-encoders", "流量编码器", probeErr))
	} else {
		item := CompatibilityItem{ID: "traffic-encoders", Label: "流量编码器", Status: capabilityAvailable, Details: encoders}
		if len(encoders) == 0 {
			item.Status = capabilityEmpty
			item.Summary = "未安装流量编码器"
		} else {
			item.Summary = fmt.Sprintf("可用 %d 个流量编码器", len(encoders))
		}
		snapshot.Items = append(snapshot.Items, item)
	}

	if encoders, probeErr := a.ListShellcodeEncoders(); probeErr != nil {
		snapshot.Items = append(snapshot.Items, unavailableCapability("shellcode-encoders", "Shellcode 编码器", probeErr))
	} else {
		item := CompatibilityItem{ID: "shellcode-encoders", Label: "Shellcode 编码器", Status: capabilityAvailable, Details: encoders}
		if len(encoders) == 0 {
			item.Status = capabilityEmpty
			item.Summary = "未安装 Shellcode 编码器"
		} else {
			item.Summary = fmt.Sprintf("可用 %d 个 Shellcode 编码器", len(encoders))
		}
		snapshot.Items = append(snapshot.Items, item)
	}

	return snapshot, nil
}
