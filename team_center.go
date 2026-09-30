package main

import (
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"
)

type AuditFilter struct {
	Operator string `json:"operator"`
	Action   string `json:"action"`
	Target   string `json:"target"`
	Since    string `json:"since"`
	Until    string `json:"until"`
	Limit    int    `json:"limit"`
}

type AuditTimelineEntry struct {
	Time     string `json:"time"`
	Operator string `json:"operator"`
	Action   string `json:"action"`
	Target   string `json:"target"`
	Outcome  string `json:"outcome"`
	Summary  string `json:"summary"`
}

type TeamCenterSnapshot struct {
	Connected bool           `json:"connected"`
	Operator  string         `json:"operator"`
	Operators []OperatorView `json:"operators"`
	Warnings  []string       `json:"warnings"`
}

type ReportTaskInput struct {
	Type       string `json:"type"`
	Title      string `json:"title"`
	Target     string `json:"target"`
	Status     string `json:"status"`
	StartedAt  int64  `json:"startedAt"`
	FinishedAt int64  `json:"finishedAt"`
	Summary    string `json:"summary"`
}

type ReportEventInput struct {
	Time string `json:"time"`
	Type string `json:"type"`
}

type ActionReportRequest struct {
	Tasks             []ReportTaskInput  `json:"tasks"`
	Events            []ReportEventInput `json:"events"`
	RedactOperational bool               `json:"redactOperational"`
}

type SensitiveFinding struct {
	Kind  string `json:"kind"`
	Count int    `json:"count"`
	Note  string `json:"note"`
}

type ActionReportPreview struct {
	Markdown string             `json:"markdown"`
	Findings []SensitiveFinding `json:"findings"`
	Tasks    int                `json:"tasks"`
	IOCs     int                `json:"iocs"`
	Loot     int                `json:"loot"`
	Hosts    int                `json:"hosts"`
	Timeline int                `json:"timeline"`
	Warnings []string           `json:"warnings"`
}

var (
	secretAssignmentPattern = regexp.MustCompile(`(?i)(password|passwd|token|secret|private[_ -]?key|authorization)\s*[:=]\s*\S+`)
	urlPattern              = regexp.MustCompile(`(?i)\b(?:https?|mtls|wg|dns)://[^\s]+`)
	windowsPathPattern      = regexp.MustCompile(`(?i)\b[A-Z]:\\[^\s|]+`)
	unixPathPattern         = regexp.MustCompile(`(?:^|\s)/(?:home|root|tmp|var|opt|etc)/[^\s|]+`)
)

func auditOutcome(detail string) string {
	switch strings.ToLower(strings.TrimSpace(detail)) {
	case "success":
		return "成功"
	case "failed":
		return "失败"
	case "cancelled", "canceled":
		return "已取消"
	default:
		return "已记录"
	}
}

func safeAuditSummary(detail string) string {
	if outcome := auditOutcome(detail); outcome != "已记录" {
		return outcome
	}
	if strings.TrimSpace(detail) == "" {
		return "无附加详情"
	}
	return "详情已隐藏"
}

func safeAuditStorageDetail(detail string) string {
	switch strings.ToLower(strings.TrimSpace(detail)) {
	case "success", "failed", "cancelled", "canceled":
		return strings.ToLower(strings.TrimSpace(detail))
	case "":
		return ""
	default:
		return "recorded"
	}
}

func safeAuditStorageTarget(target string) string {
	target = strings.TrimSpace(target)
	if target == "" {
		return ""
	}
	if len(target) > 128 || strings.ContainsAny(target, "\r\n\t") || strings.Contains(target, " ") ||
		secretAssignmentPattern.MatchString(target) || urlPattern.MatchString(target) ||
		windowsPathPattern.MatchString(target) || unixPathPattern.MatchString(target) {
		return "[已隐藏]"
	}
	if _, _, err := net.SplitHostPort(target); err == nil {
		return "[地址已隐藏]"
	}
	return target
}

func safeTarget(target string, redact bool) string {
	target = strings.TrimSpace(target)
	if target == "" {
		return "-"
	}
	if _, _, err := net.SplitHostPort(target); err == nil {
		return "[地址已隐藏]"
	}
	if redact {
		if len(target) > 8 {
			return target[:8] + "..."
		}
		return "已脱敏"
	}
	return sanitizeReportText(target)
}

func sanitizeReportText(value string) string {
	value = secretAssignmentPattern.ReplaceAllString(value, "$1=[已隐藏]")
	value = urlPattern.ReplaceAllString(value, "[地址已隐藏]")
	value = windowsPathPattern.ReplaceAllString(value, "[路径已隐藏]")
	value = unixPathPattern.ReplaceAllString(value, " [路径已隐藏]")
	value = strings.ReplaceAll(value, "|", "\\|")
	value = strings.ReplaceAll(value, "\r", " ")
	value = strings.ReplaceAll(value, "\n", " ")
	return strings.TrimSpace(value)
}

func parseAuditBoundary(value string, end bool) time.Time {
	if value == "" {
		return time.Time{}
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}
	}
	if end {
		return parsed.Add(24*time.Hour - time.Nanosecond)
	}
	return parsed
}

func (a *App) QueryAuditTimeline(filter AuditFilter) ([]AuditTimelineEntry, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 1000 {
		limit = 250
	}
	entries, err := a.RecentAudit(5000)
	if err != nil {
		return nil, err
	}
	since, until := parseAuditBoundary(filter.Since, false), parseAuditBoundary(filter.Until, true)
	result := make([]AuditTimelineEntry, 0, limit)
	for _, entry := range entries {
		when, _ := time.Parse(time.RFC3339, entry.Time)
		if filter.Operator != "" && !strings.Contains(strings.ToLower(entry.Operator), strings.ToLower(filter.Operator)) {
			continue
		}
		if filter.Action != "" && !strings.Contains(strings.ToLower(entry.Action), strings.ToLower(filter.Action)) {
			continue
		}
		if filter.Target != "" && !strings.Contains(strings.ToLower(entry.Target), strings.ToLower(filter.Target)) {
			continue
		}
		if !since.IsZero() && when.Before(since) || !until.IsZero() && when.After(until) {
			continue
		}
		result = append(result, AuditTimelineEntry{Time: entry.Time, Operator: entry.Operator, Action: entry.Action, Target: safeTarget(entry.Target, false), Outcome: auditOutcome(entry.Detail), Summary: safeAuditSummary(entry.Detail)})
	}
	if len(result) > limit {
		result = result[len(result)-limit:]
	}
	return result, nil
}

func (a *App) GetTeamCenterSnapshot() TeamCenterSnapshot {
	result := TeamCenterSnapshot{}
	a.mu.Lock()
	result.Connected = a.client != nil
	if a.client != nil {
		result.Operator = a.client.Config.Operator
	}
	a.mu.Unlock()
	if result.Connected {
		operators, err := a.ListOperators()
		if err != nil {
			result.Warnings = append(result.Warnings, "暂时无法读取在线操作员")
		} else {
			result.Operators = operators
		}
	}
	return result
}

func reportFindings(entries []auditEntry, iocs []IOCEntry) []SensitiveFinding {
	counts := map[string]int{}
	for _, entry := range entries {
		text := entry.Server + " " + entry.Detail
		if urlPattern.MatchString(text) || entry.Server != "" {
			counts["连接地址"]++
		}
		if secretAssignmentPattern.MatchString(text) {
			counts["凭据或密钥"]++
		}
		if windowsPathPattern.MatchString(text) || unixPathPattern.MatchString(text) {
			counts["完整路径"]++
		}
		if strings.TrimSpace(entry.Detail) != "" && auditOutcome(entry.Detail) == "已记录" {
			counts["操作详情"]++
		}
	}
	for _, ioc := range iocs {
		if ioc.Path != "" {
			counts["IOC 路径"]++
		}
	}
	order := []string{"连接地址", "凭据或密钥", "完整路径", "操作详情", "IOC 路径"}
	result := []SensitiveFinding{}
	for _, kind := range order {
		if counts[kind] > 0 {
			result = append(result, SensitiveFinding{Kind: kind, Count: counts[kind], Note: "导出内容将按所选脱敏级别处理"})
		}
	}
	return result
}

func (a *App) BuildActionReport(request ActionReportRequest) ActionReportPreview {
	auditEntries, _ := a.RecentAudit(250)
	timeline, _ := a.QueryAuditTimeline(AuditFilter{Limit: 250})
	iocs := a.GetIOCs()
	loot, lootErr := a.GetLoot()
	hosts, hostErr := a.ListHosts()
	preview := ActionReportPreview{Tasks: len(request.Tasks), IOCs: len(iocs), Loot: len(loot), Hosts: len(hosts), Timeline: len(timeline) + len(request.Events)}
	preview.Findings = reportFindings(auditEntries, iocs)
	if lootErr != nil {
		preview.Warnings = append(preview.Warnings, "Loot 数据暂不可用")
	}
	if hostErr != nil {
		preview.Warnings = append(preview.Warnings, "Host 数据暂不可用")
	}

	var report strings.Builder
	report.WriteString("# 参与行动报告\n\n")
	report.WriteString("**生成时间：** " + time.Now().Format(time.RFC3339) + "\n\n")
	report.WriteString("**脱敏级别：** 凭据、连接地址、命令详情和原始错误始终隐藏")
	if request.RedactOperational {
		report.WriteString("；目标标识与 IOC 路径已额外脱敏")
	}
	report.WriteString("\n\n")
	report.WriteString("## 数据摘要\n\n")
	fmt.Fprintf(&report, "- 任务：%d\n- IOC：%d\n- Loot：%d\n- Host：%d\n- 时间线：%d\n\n", preview.Tasks, preview.IOCs, preview.Loot, preview.Hosts, preview.Timeline)

	report.WriteString("## 任务\n\n| 时间 | 任务 | 目标 | 状态 | 结果 |\n|---|---|---|---|---|\n")
	for _, task := range request.Tasks {
		when := "-"
		if task.StartedAt > 0 {
			when = time.UnixMilli(task.StartedAt).Format("2006-01-02 15:04:05")
		}
		fmt.Fprintf(&report, "| %s | %s | %s | %s | %s |\n", when, reportTaskTitle(task.Type), safeTarget(task.Target, request.RedactOperational), sanitizeReportText(task.Status), reportTaskResult(task.Status))
	}
	if len(request.Tasks) == 0 {
		report.WriteString("| - | 暂无任务 | - | - | - |\n")
	}

	report.WriteString("\n## IOC\n\n| 时间 | 主机 | 类型 | 路径 |\n|---|---|---|---|\n")
	for _, ioc := range iocs {
		path := sanitizeReportText(ioc.Path)
		if request.RedactOperational && path != "" {
			path = "[已脱敏]"
		}
		fmt.Fprintf(&report, "| %s | %s | %s | %s |\n", sanitizeReportText(ioc.Timestamp), safeTarget(ioc.Host, request.RedactOperational), sanitizeReportText(ioc.Type), path)
	}
	if len(iocs) == 0 {
		report.WriteString("| - | 暂无 IOC | - | - |\n")
	}

	report.WriteString("\n## Loot 与 Host\n\n")
	for _, item := range loot {
		fmt.Fprintf(&report, "- Loot `%s`：%s（%s）\n", safeTarget(item.ID, request.RedactOperational), sanitizeReportText(item.Name), sanitizeReportText(item.Type))
	}
	for _, host := range hosts {
		fmt.Fprintf(&report, "- Host `%s`：%s（%s）\n", safeTarget(host.ID, request.RedactOperational), sanitizeReportText(host.Hostname), sanitizeReportText(host.OS))
	}
	if len(loot)+len(hosts) == 0 {
		report.WriteString("- 暂无可关联数据\n")
	}

	report.WriteString("\n## 审计时间线\n\n| 时间 | 操作员 | 操作 | 目标 | 结果 |\n|---|---|---|---|---|\n")
	for _, entry := range timeline {
		fmt.Fprintf(&report, "| %s | %s | %s | %s | %s |\n", sanitizeReportText(entry.Time), sanitizeReportText(entry.Operator), sanitizeReportText(entry.Action), safeTarget(entry.Target, request.RedactOperational), sanitizeReportText(entry.Outcome))
	}
	for _, event := range request.Events {
		fmt.Fprintf(&report, "| %s | 客户端事件 | %s | - | 已观察 |\n", sanitizeReportText(event.Time), sanitizeReportText(event.Type))
	}
	if len(timeline)+len(request.Events) == 0 {
		report.WriteString("| - | - | 暂无时间线 | - | - |\n")
	}
	preview.Markdown = report.String()
	return preview
}

func reportTaskResult(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "success":
		return "已完成"
	case "failed":
		return "失败"
	case "cancelled", "canceled":
		return "已取消"
	case "running":
		return "执行中"
	case "waiting":
		return "等待回连"
	default:
		return "已记录"
	}
}

func reportTaskTitle(taskType string) string {
	switch strings.ToLower(strings.TrimSpace(taskType)) {
	case "beacon-command":
		return "Beacon 命令"
	case "file-download":
		return "下载文件"
	case "file-upload":
		return "上传文件"
	case "implant-generate":
		return "生成植入体"
	case "armory-install":
		return "安装 Armory 包"
	default:
		return "客户端任务"
	}
}
