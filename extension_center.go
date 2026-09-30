package main

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type ExtensionArgumentView struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Help     string `json:"help"`
	Required bool   `json:"required"`
}

type ExtensionCommandDetail struct {
	Command      string                  `json:"command"`
	Extension    string                  `json:"extension"`
	Version      string                  `json:"version"`
	Kind         string                  `json:"kind"`
	Help         string                  `json:"help"`
	Arguments    []ExtensionArgumentView `json:"arguments"`
	Platforms    []string                `json:"platforms"`
	Integrity    string                  `json:"integrity"`
	IntegritySHA string                  `json:"integritySha"`
	Source       string                  `json:"source"`
	Risk         string                  `json:"risk"`
}

type ExtensionExecutionRecord struct {
	ID         string `json:"id"`
	Kind       string `json:"kind"`
	Command    string `json:"command"`
	Target     string `json:"target"`
	Status     string `json:"status"`
	StartedAt  int64  `json:"startedAt"`
	FinishedAt int64  `json:"finishedAt"`
	Summary    string `json:"summary"`
}

type ExtensionCenterSnapshot struct {
	Commands []ExtensionCommandDetail   `json:"commands"`
	Builders []BuilderView              `json:"builders"`
	Records  []ExtensionExecutionRecord `json:"records"`
	Warnings []string                   `json:"warnings"`
}

func commandDigest(root string, files []extFile) string {
	h := sha256.New()
	wrote := false
	for _, file := range files {
		data, err := os.ReadFile(filepath.Join(root, file.Path))
		if err != nil {
			continue
		}
		_, _ = h.Write(data)
		wrote = true
	}
	if !wrote {
		return ""
	}
	return hex.EncodeToString(h.Sum(nil))
}

func installedExtensionDetails(dir string) []ExtensionCommandDetail {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return []ExtensionCommandDetail{}
	}
	result := []ExtensionCommandDetail{}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		manifest, err := loadManifest(filepath.Join(dir, entry.Name(), "extension.json"))
		if err != nil {
			continue
		}
		for _, command := range manifest.commands() {
			kind := "extension"
			platformSet := map[string]bool{}
			for _, file := range command.Files {
				platformSet[file.OS+"/"+file.Arch] = true
				if strings.HasSuffix(strings.ToLower(file.Path), ".o") {
					kind = "bof"
				}
			}
			platforms := make([]string, 0, len(platformSet))
			for platform := range platformSet {
				platforms = append(platforms, platform)
			}
			sort.Strings(platforms)
			arguments := make([]ExtensionArgumentView, 0, len(command.Arguments))
			for _, argument := range command.Arguments {
				arguments = append(arguments, ExtensionArgumentView{Name: argument.Name, Type: argument.Type, Help: argument.Desc, Required: !argument.Optional})
			}
			digest := commandDigest(manifest.rootPath, command.Files)
			integrity := "本地 SHA-256"
			if digest == "" {
				integrity = "无法计算"
			}
			result = append(result, ExtensionCommandDetail{
				Command: command.CommandName, Extension: manifest.Name, Version: manifest.Version,
				Kind: kind, Help: command.Help, Arguments: arguments, Platforms: platforms,
				Integrity: integrity, IntegritySHA: digest, Source: "本地已安装",
				Risk: "第三方代码；执行前请核对来源和本地哈希。Armory minisign 尚未验证。",
			})
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Command < result[j].Command })
	return result
}

func (a *App) GetExtensionCenterSnapshot() ExtensionCenterSnapshot {
	result := ExtensionCenterSnapshot{Commands: installedExtensionDetails(extensionsDir())}
	builders, err := a.ListBuilders()
	if err != nil {
		result.Warnings = append(result.Warnings, "External Builder 状态暂不可用")
	} else {
		result.Builders = builders
	}
	a.extensionMu.Lock()
	result.Records = append([]ExtensionExecutionRecord(nil), a.extensionRecords...)
	a.extensionMu.Unlock()
	result.Warnings = append(result.Warnings, "Armory 包当前通过 HTTPS 获取，但客户端尚未实现 minisign 签名验证")
	result.Warnings = append(result.Warnings, "上游 RPC 未提供 External Builder 实时日志；可从构建记录查看已完成产物")
	return result
}

func (a *App) recordExtensionExecution(kind, command, target, status, summary string, started time.Time) {
	record := ExtensionExecutionRecord{
		ID: kind + "-" + started.UTC().Format("20060102T150405.000000000"), Kind: kind,
		Command: command, Target: target, Status: status, StartedAt: started.UnixMilli(),
		FinishedAt: time.Now().UnixMilli(), Summary: summary,
	}
	a.extensionMu.Lock()
	a.extensionRecords = append(a.extensionRecords, record)
	if len(a.extensionRecords) > 100 {
		a.extensionRecords = append([]ExtensionExecutionRecord(nil), a.extensionRecords[len(a.extensionRecords)-100:]...)
	}
	a.extensionMu.Unlock()
}
