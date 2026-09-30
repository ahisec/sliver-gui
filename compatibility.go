package main

import (
	"fmt"
	"time"
)

const (
	capabilityAvailable   = "available"
	capabilityEmpty       = "empty"
	capabilityUnavailable = "unavailable"
)

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
	Items       []CompatibilityItem `json:"items"`
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

	if version, probeErr := a.GetVersion(); probeErr != nil {
		snapshot.Items = append(snapshot.Items, unavailableCapability("version", "Teamserver 版本", probeErr))
	} else {
		snapshot.Server = version
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
