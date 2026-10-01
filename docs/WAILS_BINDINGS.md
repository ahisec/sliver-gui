# Wails 绑定方法清单

> 由 `go run ./cmd/binding-inventory` 从 `App` 的导出方法生成。此清单描述客户端绑定，不代表每个方法都直接对应一个 Sliver RPC。

共 **257** 个导出方法。分类为静态启发式结果，审查具体行为时应以源码为准。

| 方法 | 分类 | 源码 | 签名 |
|---|---|---|---|
| `AddCred` | Sliver RPC/客户端封装 | `app.go:1877` | `(username, plaintext, hash string) error` |
| `AddIOC` | 客户端本地辅助 | `panels.go:719` | `(host, iocType, path, detail string) IOCEntry` |
| `AddMonitorConfig` | Sliver RPC/客户端封装 | `features.go:855` | `(providerType, apiKey, apiPassword string) error` |
| `AddPortForward` | Sliver RPC/客户端封装 | `app.go:2964` | `(sessionID string, localPort int, remoteHost string, remotePort int) error` |
| `AddWebsiteContent` | Sliver RPC/客户端封装 | `features.go:627` | `(website, webPath, localFile string) error` |
| `AppVersion` | 客户端本地辅助 | `version.go:67` | `() BuildInfo` |
| `ArmoryInstall` | 外部内容/本地安装 | `armory.go:106` | `(packageName string) error` |
| `ArmoryList` | 外部内容/本地安装 | `armory.go:76` | `() ([]ArmoryPackage, error)` |
| `ArmoryRemove` | 外部内容/本地安装 | `armory.go:138` | `(packageName string) error` |
| `AuditLogPath` | 客户端本地辅助 | `audit.go:89` | `() string` |
| `Backdoor` | Sliver RPC/客户端封装 | `app.go:1979` | `(sessionID, remoteFilePath, profileName string) error` |
| `BuildActionReport` | Sliver RPC/客户端封装 | `team_center.go:257` | `(request ActionReportRequest) ActionReportPreview` |
| `CancelBeaconTask` | Sliver RPC/客户端封装 | `features.go:680` | `(taskID string) error` |
| `CancelTransfer` | Sliver RPC/客户端封装 | `app.go:1339` | `(transferID string) bool` |
| `ChangeDir` | Sliver RPC/客户端封装 | `app.go:845` | `(sessionID, path string) (string, error)` |
| `Chmod` | Sliver RPC/客户端封装 | `app.go:1532` | `(sessionID, path, mode string) error` |
| `Chown` | Sliver RPC/客户端封装 | `app.go:1545` | `(sessionID, path, uid, gid string) error` |
| `Chtimes` | Sliver RPC/客户端封装 | `app.go:1586` | `(sessionID, path string, atime, mtime int64) error` |
| `ClearIOCs` | 客户端本地辅助 | `panels.go:746` | `()` |
| `CloseSessionGraceful` | Sliver RPC/客户端封装 | `features.go:667` | `(sessionID string) error` |
| `ConfirmAndStoreCredentials` | 客户端本地辅助 | `panels.go:497` | `(creds []ParsedCredential) error` |
| `Connect` | Sliver RPC/客户端封装 | `app.go:142` | `(configPath string) ConnectResult` |
| `ConvertDLLToShellcode` | Sliver RPC/客户端封装 | `features.go:994` | `(dllPath, functionName, args string) (string, error)` |
| `CopyFile` | Sliver RPC/客户端封装 | `app.go:888` | `(sessionID, src, dst string) (int64, error)` |
| `CopyMCPToken` | Sliver RPC/客户端封装 | `mcp.go:137` | `() error` |
| `CurrentTokenOwner` | Sliver RPC/客户端封装 | `app.go:3088` | `(sessionID string) (string, error)` |
| `DelMonitorConfig` | Sliver RPC/客户端封装 | `features.go:874` | `(id string) error` |
| `DeleteBuild` | Sliver RPC/客户端封装 | `app.go:2237` | `(name string) error` |
| `DeleteCred` | Sliver RPC/客户端封装 | `app.go:1888` | `(id string) error` |
| `DeleteHost` | Sliver RPC/客户端封装 | `app.go:1843` | `(hostID string) error` |
| `DeleteImplantProfile` | Sliver RPC/客户端封装 | `app.go:3628` | `(name string) error` |
| `DeleteLoot` | Sliver RPC/客户端封装 | `app.go:2123` | `(lootID string) error` |
| `Disconnect` | Sliver RPC/客户端封装 | `app.go:175` | `()` |
| `DllHijack` | Sliver RPC/客户端封装 | `app.go:1994` | `(sessionID, referenceDLLPath, targetLocation, profileName string) error` |
| `DownloadFile` | RPC 与本地文件系统 | `app.go:1034` | `(sessionID, remotePath string) TransferResult` |
| `DownloadFileTo` | RPC 与本地文件系统 | `app.go:1378` | `(sessionID, remotePath, localPath string) TransferResult` |
| `DownloadFileTracked` | RPC 与本地文件系统 | `app.go:1039` | `(transferID, sessionID, remotePath string) TransferResult` |
| `DownloadLoot` | RPC 与本地文件系统 | `app.go:2166` | `(lootID string) TransferResult` |
| `DownloadPathTracked` | RPC 与本地文件系统 | `app.go:1044` | `(transferID, sessionID, remotePath string, isDirectory bool) TransferResult` |
| `EncodeShellcode` | Sliver RPC/客户端封装 | `features.go:1027` | `(inPath, architecture string, iterations int) (string, error)` |
| `ExecWasmExtension` | Sliver RPC/客户端封装 | `features.go:1094` | `(sessionID, name string, args []string) ExecResult` |
| `ExecuteAssembly` | Sliver RPC/客户端封装 | `app.go:3191` | `(sessionID, localPath, args string) AssemblyResult` |
| `ExecuteBeaconCommand` | Sliver RPC/客户端封装 | `app.go:3653` | `(beaconID, command string) BeaconTaskResult` |
| `ExecuteBeaconCommandAsync` | Sliver RPC/客户端封装 | `app.go:3773` | `(beaconID, command string) BeaconTaskResult` |
| `ExecuteCommand` | Sliver RPC/客户端封装 | `app.go:386` | `(sessionID, command string) ExecResult` |
| `ExecuteShellcode` | Sliver RPC/客户端封装 | `app.go:1484` | `(sessionID, localPath string, pid uint32) AssemblyResult` |
| `ExecuteWindowsAdvanced` | Sliver RPC/客户端封装 | `features.go:969` | `(sessionID, path string, args []string, useToken, hideWindow bool, ppid int) ExecResult` |
| `FileBrowserDelete` | 客户端本地辅助 | `panels.go:252` | `(sessionID, path string) error` |
| `FileBrowserExecute` | 客户端本地辅助 | `panels.go:290` | `(sessionID, path string, args []string, background, hideWindow bool) ExecResult` |
| `FileBrowserHash` | 客户端本地辅助 | `panels.go:217` | `(sessionID, path string) FileHashResult` |
| `FileBrowserList` | 客户端本地辅助 | `panels.go:122` | `(sessionID, path string) FileBrowserResult` |
| `FileBrowserMounts` | 客户端本地辅助 | `panels.go:93` | `(sessionID string) FileSystemMountsResult` |
| `FileBrowserProperties` | 客户端本地辅助 | `panels.go:196` | `(sessionID, path string) FilePropertiesResult` |
| `GenerateCleanupScript` | 客户端本地辅助 | `panels.go:754` | `() string` |
| `GenerateImplant` | Sliver RPC/客户端封装 | `app.go:2620` | `(req GenerateRequest) GenerateResult` |
| `GenerateReport` | 客户端本地辅助 | `panels.go:804` | `() string` |
| `GenerateUniqueWGIP` | Sliver RPC/客户端封装 | `features.go:913` | `() (string, error)` |
| `GenerateWGClientConfig` | Sliver RPC/客户端封装 | `features.go:895` | `() (WGClientConfigView, error)` |
| `GetAgentIPs` | 客户端本地辅助 | `panels.go:419` | `(sessionID string) AgentIPs` |
| `GetBeaconTaskResult` | Sliver RPC/客户端封装 | `app.go:3888` | `(taskID string) (BeaconTaskView, error)` |
| `GetBeaconTasks` | Sliver RPC/客户端封装 | `app.go:3843` | `(beaconID string) ([]BeaconTaskView, error)` |
| `GetBuildHistory` | Sliver RPC/客户端封装 | `app.go:2207` | `() ([]BuildView, error)` |
| `GetBuilders` | 客户端本地辅助 | `panels.go:684` | `() ([]map[string]interface{}, error)` |
| `GetCompilerInfo` | Sliver RPC/客户端封装 | `features.go:315` | `() (CompilerView, error)` |
| `GetCredential` | Sliver RPC/客户端封装 | `features.go:721` | `(id string) (CredView, error)` |
| `GetDingTalkConfig` | Sliver RPC/客户端封装 | `dingtalk.go:276` | `() (DingTalkConfigView, error)` |
| `GetEngagementElapsed` | 客户端本地辅助 | `panels.go:672` | `() int64` |
| `GetEnvVars` | Sliver RPC/客户端封装 | `app.go:606` | `(sessionID string) ([]EnvVar, error)` |
| `GetExtensionCenterSnapshot` | Sliver RPC/客户端封装 | `extension_center.go:118` | `() ExtensionCenterSnapshot` |
| `GetHTTPC2Profile` | Sliver RPC/客户端封装 | `features.go:544` | `(name string) (string, error)` |
| `GetIOCs` | 客户端本地辅助 | `panels.go:737` | `() []IOCEntry` |
| `GetInfrastructureSnapshot` | Sliver RPC/客户端封装 | `infrastructure.go:90` | `() (InfrastructureSnapshot, error)` |
| `GetKillChain` | 客户端本地辅助 | `panels.go:611` | `() KillChainState` |
| `GetLoot` | Sliver RPC/客户端封装 | `app.go:2106` | `() ([]LootView, error)` |
| `GetMCPStatus` | Sliver RPC/客户端封装 | `mcp.go:90` | `() MCPStatusView` |
| `GetNetstat` | Sliver RPC/客户端封装 | `app.go:556` | `(sessionID string) ([]NetstatEntry, error)` |
| `GetPivotGraph` | Sliver RPC/客户端封装 | `features.go:949` | `() ([]PivotNodeView, error)` |
| `GetPrivs` | Sliver RPC/客户端封装 | `app.go:966` | `(sessionID string) (PrivsResult, error)` |
| `GetProcessList` | Sliver RPC/客户端封装 | `app.go:505` | `(sessionID string) ([]ProcessView, error)` |
| `GetServerCompatibility` | 兼容性聚合 | `compatibility.go:47` | `() (ServerCompatibility, error)` |
| `GetSystem` | Sliver RPC/客户端封装 | `app.go:3144` | `(sessionID, hostingProcess, profileName string) error` |
| `GetTeamCenterSnapshot` | Sliver RPC/客户端封装 | `team_center.go:206` | `() TeamCenterSnapshot` |
| `GetVersion` | Sliver RPC/客户端封装 | `app.go:283` | `() (VersionInfo, error)` |
| `GrepFiles` | Sliver RPC/客户端封装 | `features.go:30` | `(sessionID, pattern, path string, recursive bool) (string, error)` |
| `Ifconfig` | Sliver RPC/客户端封装 | `app.go:936` | `(sessionID string) ([]NetInterfaceView, error)` |
| `ImpersonateUser` | Sliver RPC/客户端封装 | `app.go:3119` | `(sessionID, username string) error` |
| `ImportConfig` | 客户端本地辅助 | `config_store.go:101` | `(srcPath string) (SavedConfig, error)` |
| `ImportHTTPC2ProfileFile` | Sliver RPC/客户端封装 | `features.go:583` | `() (string, error)` |
| `InteractiveBeacon` | Sliver RPC/客户端封装 | `app.go:1771` | `(beaconID string) error` |
| `KillBeacon` | Sliver RPC/客户端封装 | `app.go:2301` | `(beaconID string) error` |
| `KillJob` | Sliver RPC/客户端封装 | `app.go:2372` | `(jobID uint32) error` |
| `KillRemoteProcess` | Sliver RPC/客户端封装 | `app.go:531` | `(sessionID string, pid uint32) error` |
| `KillSession` | Sliver RPC/客户端封装 | `app.go:363` | `(sessionID string) error` |
| `ListBeacons` | Sliver RPC/客户端封装 | `app.go:2268` | `() ([]BeaconView, error)` |
| `ListBuilders` | Sliver RPC/客户端封装 | `features.go:346` | `() ([]BuilderView, error)` |
| `ListC2Profiles` | Sliver RPC/客户端封装 | `app.go:2487` | `() ([]C2ProfileView, error)` |
| `ListCAInfo` | Sliver RPC/客户端封装 | `features.go:451` | `() ([]CertView, error)` |
| `ListCanaries` | Sliver RPC/客户端封装 | `app.go:1942` | `() ([]CanaryView, error)` |
| `ListCertificates` | Sliver RPC/客户端封装 | `features.go:275` | `() ([]CertView, error)` |
| `ListCreds` | Sliver RPC/客户端封装 | `app.go:1861` | `() ([]CredView, error)` |
| `ListFiles` | Sliver RPC/客户端封装 | `app.go:809` | `(sessionID, path string) LsResult` |
| `ListHTTPC2Profiles` | Sliver RPC/客户端封装 | `features.go:383` | `() ([]HTTPC2View, error)` |
| `ListHosts` | Sliver RPC/客户端封装 | `app.go:1823` | `() ([]HostView, error)` |
| `ListImplantExtensions` | Sliver RPC/客户端封装 | `extensions.go:212` | `(sessionID string) ([]string, error)` |
| `ListImplantProfiles` | Sliver RPC/客户端封装 | `app.go:3429` | `() ([]ProfileView, error)` |
| `ListInstalledExtensions` | Sliver RPC/客户端封装 | `extensions.go:166` | `() ([]ExtCommandView, error)` |
| `ListJobs` | Sliver RPC/客户端封装 | `app.go:2348` | `() ([]JobView, error)` |
| `ListMonitorConfig` | Sliver RPC/客户端封装 | `features.go:508` | `() ([]MonitorProviderView, error)` |
| `ListMounts` | Sliver RPC/客户端封装 | `features.go:82` | `(sessionID string) ([]MountView, error)` |
| `ListOperators` | Sliver RPC/客户端封装 | `app.go:2318` | `() ([]OperatorView, error)` |
| `ListPivots` | Sliver RPC/客户端封装 | `app.go:2742` | `(sessionID string) ([]PivotView, error)` |
| `ListPortForwards` | Sliver RPC/客户端封装 | `app.go:3004` | `(sessionID string) ([]PortForwardView, error)` |
| `ListRportFwds` | Sliver RPC/客户端封装 | `app.go:1675` | `(sessionID string) ([]RportFwdView, error)` |
| `ListSavedConfigs` | 客户端本地辅助 | `config_store.go:53` | `() []SavedConfig` |
| `ListScripts` | 客户端工作流编排 | `scripts.go:1053` | `() []ScriptInfo` |
| `ListServices` | Sliver RPC/客户端封装 | `app.go:3304` | `(sessionID string) ([]ServiceView, error)` |
| `ListSessions` | Sliver RPC/客户端封装 | `app.go:321` | `() ([]SessionView, error)` |
| `ListShellcodeEncoders` | Sliver RPC/客户端封装 | `features.go:418` | `() ([]string, error)` |
| `ListTrafficEncoders` | Sliver RPC/客户端封装 | `features.go:400` | `() ([]string, error)` |
| `ListWGForwarders` | Sliver RPC/客户端封装 | `features.go:809` | `(sessionID string) ([]WGForwarderView, error)` |
| `ListWGSocks` | Sliver RPC/客户端封装 | `features.go:834` | `(sessionID string) ([]WGSocksView, error)` |
| `ListWasmExtensions` | Sliver RPC/客户端封装 | `features.go:527` | `(sessionID string) ([]string, error)` |
| `ListWebsites` | Sliver RPC/客户端封装 | `app.go:1908` | `() ([]WebsiteView, error)` |
| `ListenerC2Options` | Sliver RPC/客户端封装 | `app.go:2506` | `() ([]string, error)` |
| `LootFile` | Sliver RPC/客户端封装 | `app.go:2136` | `(sessionID, remotePath string) error` |
| `MakeDirectory` | Sliver RPC/客户端封装 | `app.go:831` | `(sessionID, path string) error` |
| `MakeToken` | Sliver RPC/客户端封装 | `app.go:3104` | `(sessionID, username, domain, password string) error` |
| `MemfilesAdd` | Sliver RPC/客户端封装 | `features.go:132` | `(sessionID string) (int64, error)` |
| `MemfilesList` | Sliver RPC/客户端封装 | `features.go:110` | `(sessionID string) (string, error)` |
| `MemfilesRm` | Sliver RPC/客户端封装 | `features.go:148` | `(sessionID string, fd int64) error` |
| `Migrate` | Sliver RPC/客户端封装 | `app.go:1428` | `(sessionID string, pid uint32, profileName string) error` |
| `MoveFile` | Sliver RPC/客户端封装 | `app.go:875` | `(sessionID, src, dst string) error` |
| `MsfInject` | Sliver RPC/客户端封装 | `app.go:2009` | `(sessionID, payload, lhost string, lport uint32) error` |
| `MsfRemoteInject` | Sliver RPC/客户端封装 | `app.go:2024` | `(sessionID, payload, lhost string, lport, pid uint32) error` |
| `NotifyDingTalkAgentOnline` | Sliver RPC/客户端封装 | `dingtalk.go:312` | `(notice DingTalkAgentNotice) error` |
| `ParseAndStoreCredentials` | 客户端本地辅助 | `panels.go:485` | `(output, source string) []ParsedCredential` |
| `PickConfigFile` | RPC 与本地文件系统 | `app.go:106` | `() (string, error)` |
| `PickPEMetadataFile` | RPC 与本地文件系统 | `app.go:116` | `() (string, error)` |
| `PickWasmFile` | RPC 与本地文件系统 | `app.go:128` | `() (string, error)` |
| `PingSession` | Sliver RPC/客户端封装 | `features.go:736` | `(sessionID string) error` |
| `PreflightImplant` | Sliver RPC/客户端封装 | `implant_studio.go:216` | `(req GenerateRequest) (ImplantPreflight, error)` |
| `PreflightNetworkRoute` | Sliver RPC/客户端封装 | `infrastructure.go:237` | `(kind, listen, target string) NetworkPreflight` |
| `PrintWorkingDir` | Sliver RPC/客户端封装 | `app.go:861` | `(sessionID string) (string, error)` |
| `ProcessBrowserKill` | 客户端本地辅助 | `panels.go:396` | `(sessionID string, pid int32) error` |
| `ProcessBrowserList` | 客户端本地辅助 | `panels.go:373` | `(sessionID string) ProcessBrowserResult` |
| `ProcessDump` | Sliver RPC/客户端封装 | `app.go:985` | `(sessionID string, pid int32) TransferResult` |
| `QueryAuditTimeline` | Sliver RPC/客户端封装 | `team_center.go:173` | `(filter AuditFilter) ([]AuditTimelineEntry, error)` |
| `ReadRemoteFile` | Sliver RPC/客户端封装 | `app.go:905` | `(sessionID, path string) (string, error)` |
| `RecentAudit` | 客户端本地辅助 | `audit.go:95` | `(limit int) ([]auditEntry, error)` |
| `ReconfigureBeacon` | Sliver RPC/客户端封装 | `app.go:1712` | `(beaconID string, interval, jitter int64) error` |
| `ReconfigureSessionReconnect` | Sliver RPC/客户端封装 | `app.go:1742` | `(sessionID string, intervalSeconds int64) error` |
| `RegenerateBuild` | Sliver RPC/客户端封装 | `app.go:1785` | `(name string) TransferResult` |
| `RegisterWasmExtension` | Sliver RPC/客户端封装 | `features.go:1066` | `(sessionID, name, wasmPath string) error` |
| `RegistryCreateKey` | Sliver RPC/客户端封装 | `app.go:765` | `(sessionID, hive, path, key string) error` |
| `RegistryDeleteKey` | Sliver RPC/客户端封装 | `app.go:779` | `(sessionID, hive, path, key string) error` |
| `RegistryListSubKeys` | Sliver RPC/客户端封装 | `app.go:661` | `(sessionID, hive, path string) ([]string, error)` |
| `RegistryListValues` | Sliver RPC/客户端封装 | `app.go:690` | `(sessionID, hive, path string) ([]RegistryValue, error)` |
| `RegistryReadHiveExport` | Sliver RPC/客户端封装 | `features.go:195` | `(sessionID, rootHive, requestedHive string) (string, error)` |
| `RegistryReadValue` | Sliver RPC/客户端封装 | `app.go:732` | `(sessionID, hive, path, key string) (string, error)` |
| `RegistryWriteValue` | Sliver RPC/客户端封装 | `app.go:749` | `(sessionID, hive, path, key, value string) error` |
| `RemoveFile` | Sliver RPC/客户端封装 | `app.go:1011` | `(sessionID, path string) error` |
| `RemoveHostIOC` | Sliver RPC/客户端封装 | `features.go:751` | `(iocID, path, fileHash string) error` |
| `RemovePortForward` | Sliver RPC/客户端封装 | `app.go:2988` | `(sessionID string, localPort int) error` |
| `RemoveSavedConfig` | 客户端本地辅助 | `config_store.go:142` | `(path string) error` |
| `RemoveService` | Sliver RPC/客户端封装 | `app.go:3378` | `(sessionID, hostname, serviceName string) error` |
| `RemoveWebsite` | Sliver RPC/客户端封装 | `app.go:1924` | `(name string) error` |
| `RemoveWebsiteContent` | Sliver RPC/客户端封装 | `features.go:651` | `(website, webPath string) error` |
| `RenameLoot` | Sliver RPC/客户端封装 | `features.go:764` | `(id, name string) error` |
| `RenameSession` | Sliver RPC/客户端封装 | `app.go:355` | `(sessionID, newName string) error` |
| `ResetEngagementState` | 客户端本地辅助 | `panels.go:649` | `()` |
| `ResetKillChain` | 客户端本地辅助 | `panels.go:641` | `() KillChainState` |
| `ResizeShell` | Sliver 隧道/RPC | `shell.go:139` | `(tunnelID string, rows, cols int) error` |
| `RestartJobs` | Sliver RPC/客户端封装 | `features.go:436` | `(ids []int) error` |
| `RevToSelf` | Sliver RPC/客户端封装 | `app.go:3131` | `(sessionID string) error` |
| `RunAs` | Sliver RPC/客户端封装 | `app.go:1407` | `(sessionID, username, domain, password, program, args string) (string, error)` |
| `RunExecute` | Sliver RPC/客户端封装 | `app.go:452` | `(sessionID, path string, args []string) ExecResult` |
| `RunExtension` | Sliver RPC/客户端封装 | `extensions.go:328` | `(sessionID, command string, args []string) (string, error)` |
| `SSHExec` | Sliver RPC/客户端封装 | `features.go:170` | `(sessionID, host string, port int, user, pass, command string) SSHResult` |
| `SaveDingTalkConfig` | Sliver RPC/客户端封装 | `dingtalk.go:286` | `(input DingTalkConfigInput) (DingTalkConfigView, error)` |
| `SaveHTTPC2Profile` | Sliver RPC/客户端封装 | `features.go:607` | `(profileJSON string, overwrite bool) error` |
| `SaveImplantProfile` | Sliver RPC/客户端封装 | `app.go:3480` | `(req GenerateRequest) error` |
| `ScriptADEnum` | 客户端工作流编排 | `scripts.go:754` | `(sessionID string) ScriptResult` |
| `ScriptDCSync` | 客户端工作流编排 | `scripts.go:740` | `(sessionID string) ScriptResult` |
| `ScriptGetSystem` | 客户端工作流编排 | `scripts.go:513` | `(sessionID, profile string) ScriptResult` |
| `ScriptHarvestCreds` | 客户端工作流编排 | `scripts.go:323` | `(sessionID string) ScriptResult` |
| `ScriptKerberoast` | 客户端工作流编排 | `scripts.go:726` | `(sessionID string) ScriptResult` |
| `ScriptNetworkScan` | 客户端工作流编排 | `scripts.go:347` | `(sessionID, subnet string, ports string) ScriptResult` |
| `ScriptPersistCron` | 客户端工作流编排 | `scripts.go:255` | `(sessionID, cronLine string) ScriptResult` |
| `ScriptPersistRegRun` | 客户端工作流编排 | `scripts.go:584` | `(sessionID, beaconPath, name string) ScriptResult` |
| `ScriptPersistSSHKey` | 客户端工作流编排 | `scripts.go:270` | `(sessionID, pubKey, targetUser string) ScriptResult` |
| `ScriptPersistSchedTask` | 客户端工作流编排 | `scripts.go:608` | `(sessionID, beaconPath, taskName string) ScriptResult` |
| `ScriptPersistService` | 客户端工作流编排 | `scripts.go:632` | `(sessionID, beaconPath, svcName string) ScriptResult` |
| `ScriptPersistStartup` | 客户端工作流编排 | `scripts.go:681` | `(sessionID, beaconPath string) ScriptResult` |
| `ScriptPersistSystemd` | 客户端工作流编排 | `scripts.go:289` | `(sessionID, serviceName, execPath string) ScriptResult` |
| `ScriptPersistWMI` | 客户端工作流编排 | `scripts.go:661` | `(sessionID, beaconPath string) ScriptResult` |
| `ScriptPreview` | 客户端工作流编排 | `scripts.go:1317` | `(sessionID, method string, params map[string]string) ScriptResult` |
| `ScriptPrivescCheck` | 客户端工作流编排 | `scripts.go:210` | `(sessionID string) ScriptResult` |
| `ScriptPsExec` | 客户端工作流编排 | `scripts.go:377` | `(sessionID, targetHost string, targetPort int, user, pass, beaconPath string) ScriptResult` |
| `ScriptSCDeploy` | 客户端工作流编排 | `scripts.go:432` | `(sessionID, targetHost string, targetPort int, user, pass, beaconPath string) ScriptResult` |
| `ScriptSMBUploadExec` | 客户端工作流编排 | `scripts.go:448` | `(sessionID, targetHost string, targetPort int, user, pass, beaconPath string) ScriptResult` |
| `ScriptSSHCheck` | 客户端工作流编排 | `scripts.go:175` | `(sessionID, targetHost string, targetPort int, user, pass string) ScriptResult` |
| `ScriptSSHDeploy` | 客户端工作流编排 | `scripts.go:38` | `(sessionID, targetHost string, targetPort int, user, pass, beaconPath string) ScriptResult` |
| `ScriptSSHExecSimple` | 客户端工作流编排 | `scripts.go:146` | `(sessionID, targetHost string, targetPort int, user, pass, command string) ScriptResult` |
| `ScriptSpawnLinux` | 客户端工作流编排 | `scripts.go:1589` | `(sessionID, targetHost string, targetPort int, user, pass, listenerURL string) ScriptResult` |
| `ScriptSpawnLocal` | 客户端工作流编排 | `scripts.go:1837` | `(sessionID, targetOS, arch, profileName string) ScriptResult` |
| `ScriptSpawnWindows` | 客户端工作流编排 | `scripts.go:1656` | `(sessionID, targetHost string, targetPort int, user, pass, listenerURL string) ScriptResult` |
| `ScriptSudoExploit` | 客户端工作流编排 | `scripts.go:230` | `(sessionID, method string) ScriptResult` |
| `ScriptTokenImpersonate` | 客户端工作流编排 | `scripts.go:486` | `(sessionID, targetUser string) ScriptResult` |
| `ScriptUACBypass` | 客户端工作流编排 | `scripts.go:546` | `(sessionID, beaconPath string) ScriptResult` |
| `ScriptWMIExec` | 客户端工作流编排 | `scripts.go:395` | `(sessionID, targetHost string, targetPort int, user, pass, command string) ScriptResult` |
| `ScriptWinHarvestCreds` | 客户端工作流编排 | `scripts.go:704` | `(sessionID string) ScriptResult` |
| `ScriptWinLocalEnum` | 客户端工作流编排 | `scripts.go:774` | `(sessionID string) ScriptResult` |
| `ScriptWinPrivescCheck` | 客户端工作流编排 | `scripts.go:467` | `(sessionID string) ScriptResult` |
| `ScriptWinRMExec` | 客户端工作流编排 | `scripts.go:409` | `(sessionID, targetHost string, targetPort int, user, pass, command string) ScriptResult` |
| `SendShellData` | Sliver 隧道/RPC | `shell.go:124` | `(tunnelID, b64data string) error` |
| `ServiceDetail` | Sliver RPC/客户端封装 | `features.go:232` | `(sessionID, hostname, name string) (ServiceView, error)` |
| `SetEnvVar` | Sliver RPC/客户端封装 | `app.go:625` | `(sessionID, key, value string) error` |
| `Sideload` | Sliver RPC/客户端封装 | `app.go:3213` | `(sessionID, localPath, args, entryPoint string) AssemblyResult` |
| `SniffCredHashType` | Sliver RPC/客户端封装 | `features.go:708` | `(hash string) (string, error)` |
| `SocksProxyStatus` | Sliver RPC/客户端封装 | `app.go:2858` | `(sessionID string) int` |
| `SpawnDll` | Sliver RPC/客户端封装 | `app.go:1506` | `(sessionID, localPath, args, entryPoint string) AssemblyResult` |
| `StartDNSListener` | Sliver RPC/客户端封装 | `app.go:2444` | `(req StartDNSReq) error` |
| `StartEngagementTimer` | 客户端本地辅助 | `panels.go:662` | `() string` |
| `StartHTTPListener` | Sliver RPC/客户端封装 | `app.go:2414` | `(req StartHTTPReq) error` |
| `StartInteractiveShell` | Sliver 隧道/RPC | `shell.go:50` | `(sessionID, shellPath string, enablePTY bool) (string, error)` |
| `StartMCP` | Sliver RPC/客户端封装 | `mcp.go:94` | `(req MCPStartRequest) (MCPStatusView, error)` |
| `StartMTLSListener` | Sliver RPC/客户端封装 | `app.go:2387` | `(req StartMTLSReq) error` |
| `StartMonitor` | Sliver RPC/客户端封装 | `features.go:480` | `() error` |
| `StartPivotListener` | Sliver RPC/客户端封装 | `app.go:2766` | `(sessionID, pivotType, bindAddress string) error` |
| `StartRportFwd` | Sliver RPC/客户端封装 | `app.go:1656` | `(sessionID, bindAddr string, bindPort int, fwdAddr string, fwdPort int) error` |
| `StartService` | Sliver RPC/客户端封装 | `app.go:3351` | `(sessionID, hostname, serviceName, binPath string) error` |
| `StartServiceByName` | Sliver RPC/客户端封装 | `features.go:248` | `(sessionID, hostname, name string) error` |
| `StartSocksProxy` | Sliver RPC/客户端封装 | `app.go:2815` | `(sessionID string, localPort int) error` |
| `StartStagerListener` | Sliver RPC/客户端封装 | `app.go:1960` | `(host string, port uint32, profileName string) (uint32, error)` |
| `StartWGListener` | Sliver RPC/客户端封装 | `app.go:2467` | `(req StartWGReq) error` |
| `StopInteractiveShell` | Sliver 隧道/RPC | `shell.go:160` | `(tunnelID string) error` |
| `StopMCP` | Sliver RPC/客户端封装 | `mcp.go:125` | `() error` |
| `StopMonitor` | Sliver RPC/客户端封装 | `features.go:497` | `() error` |
| `StopPivotListener` | Sliver RPC/客户端封装 | `app.go:2790` | `(sessionID string, pivotID uint32) error` |
| `StopRportFwd` | Sliver RPC/客户端封装 | `app.go:1697` | `(sessionID string, id uint32) error` |
| `StopService` | Sliver RPC/客户端封装 | `app.go:3365` | `(sessionID, hostname, serviceName string) error` |
| `StopSocksProxy` | Sliver RPC/客户端封装 | `app.go:2843` | `(sessionID string) error` |
| `TakeScreenshot` | Sliver RPC/客户端封装 | `app.go:480` | `(sessionID string) (string, error)` |
| `TestDingTalkNotification` | Sliver RPC/客户端封装 | `dingtalk.go:297` | `() error` |
| `UnsetEnvVar` | Sliver RPC/客户端封装 | `app.go:637` | `(sessionID, key string) error` |
| `UpdateCredential` | Sliver RPC/客户端封装 | `features.go:693` | `(id, username, plaintext, hash string, cracked bool) error` |
| `UpdateKillChain` | 客户端本地辅助 | `panels.go:618` | `(stage string) KillChainState` |
| `UpdateWebsiteContent` | Sliver RPC/客户端封装 | `features.go:777` | `(website, webPath, localFile string) error` |
| `UploadFile` | RPC 与本地文件系统 | `app.go:1227` | `(sessionID, remotePath string) TransferResult` |
| `UploadFileFrom` | RPC 与本地文件系统 | `app.go:1352` | `(sessionID, localPath, remotePath string) TransferResult` |
| `UploadFileToDirectoryTracked` | RPC 与本地文件系统 | `app.go:1243` | `(transferID, sessionID, remoteDir string) TransferResult` |
| `UploadFileTracked` | RPC 与本地文件系统 | `app.go:1232` | `(transferID, sessionID, remotePath string) TransferResult` |
| `ValidateHTTPC2Profile` | Sliver RPC/客户端封装 | `features.go:573` | `(profileJSON string) (HTTPC2Validation, error)` |
| `WGStartPortForward` | Sliver RPC/客户端封装 | `app.go:2041` | `(sessionID string, localPort int, remoteAddr string) error` |
| `WGStartSocks` | Sliver RPC/客户端封装 | `app.go:2070` | `(sessionID string, port int) error` |
| `WGStopPortForward` | Sliver RPC/客户端封装 | `app.go:2057` | `(sessionID string, id int) error` |
| `WGStopSocks` | Sliver RPC/客户端封装 | `app.go:2085` | `(sessionID string, id int) error` |
