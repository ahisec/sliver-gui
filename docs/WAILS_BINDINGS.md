# Wails 绑定方法清单

> 由 `go run ./cmd/binding-inventory` 从 `App` 的导出方法生成。此清单描述客户端绑定，不代表每个方法都直接对应一个 Sliver RPC。

共 **231** 个导出方法。分类为静态启发式结果，审查具体行为时应以源码为准。

| 方法 | 分类 | 源码 | 签名 |
|---|---|---|---|
| `AddCred` | Sliver RPC/客户端封装 | `app.go:1507` | `(username, plaintext, hash string) error` |
| `AddIOC` | 客户端本地辅助 | `panels.go:450` | `(host, iocType, path, detail string) IOCEntry` |
| `AddMonitorConfig` | Sliver RPC/客户端封装 | `features.go:806` | `(providerType, apiKey, apiPassword string) error` |
| `AddPortForward` | Sliver RPC/客户端封装 | `app.go:2449` | `(sessionID string, localPort int, remoteHost string, remotePort int) error` |
| `AddWebsiteContent` | Sliver RPC/客户端封装 | `features.go:578` | `(website, webPath, localFile string) error` |
| `AppVersion` | 客户端本地辅助 | `version.go:67` | `() BuildInfo` |
| `ArmoryInstall` | 外部内容/本地安装 | `armory.go:128` | `(packageName string) error` |
| `ArmoryList` | 外部内容/本地安装 | `armory.go:72` | `() ([]ArmoryPackage, error)` |
| `ArmoryRemove` | 外部内容/本地安装 | `armory.go:212` | `(packageName string) error` |
| `AuditLogPath` | 客户端本地辅助 | `audit.go:79` | `() string` |
| `Backdoor` | Sliver RPC/客户端封装 | `app.go:1607` | `(sessionID, remoteFilePath, profileName string) error` |
| `CancelBeaconTask` | Sliver RPC/客户端封装 | `features.go:631` | `(taskID string) error` |
| `CancelTransfer` | Sliver RPC/客户端封装 | `app.go:1057` | `(transferID string) bool` |
| `ChangeDir` | Sliver RPC/客户端封装 | `app.go:749` | `(sessionID, path string) (string, error)` |
| `Chmod` | Sliver RPC/客户端封装 | `app.go:1247` | `(sessionID, path, mode string) error` |
| `Chown` | Sliver RPC/客户端封装 | `app.go:1260` | `(sessionID, path, uid, gid string) error` |
| `Chtimes` | Sliver RPC/客户端封装 | `app.go:1275` | `(sessionID, path string, atime, mtime int64) error` |
| `ClearIOCs` | 客户端本地辅助 | `panels.go:477` | `()` |
| `CloseSessionGraceful` | Sliver RPC/客户端封装 | `features.go:618` | `(sessionID string) error` |
| `ConfirmAndStoreCredentials` | 客户端本地辅助 | `panels.go:228` | `(creds []ParsedCredential) error` |
| `Connect` | Sliver RPC/客户端封装 | `app.go:112` | `(configPath string) ConnectResult` |
| `ConvertDLLToShellcode` | Sliver RPC/客户端封装 | `features.go:945` | `(dllPath, functionName, args string) (string, error)` |
| `CopyFile` | Sliver RPC/客户端封装 | `app.go:792` | `(sessionID, src, dst string) (int64, error)` |
| `CurrentTokenOwner` | Sliver RPC/客户端封装 | `app.go:2569` | `(sessionID string) (string, error)` |
| `DelMonitorConfig` | Sliver RPC/客户端封装 | `features.go:825` | `(id string) error` |
| `DeleteBuild` | Sliver RPC/客户端封装 | `app.go:1851` | `(name string) error` |
| `DeleteCred` | Sliver RPC/客户端封装 | `app.go:1518` | `(id string) error` |
| `DeleteHost` | Sliver RPC/客户端封装 | `app.go:1474` | `(hostID string) error` |
| `DeleteImplantProfile` | Sliver RPC/客户端封装 | `app.go:2997` | `(name string) error` |
| `DeleteLoot` | Sliver RPC/客户端封装 | `app.go:1743` | `(lootID string) error` |
| `Disconnect` | Sliver RPC/客户端封装 | `app.go:144` | `()` |
| `DllHijack` | Sliver RPC/客户端封装 | `app.go:1622` | `(sessionID, referenceDLLPath, targetLocation, profileName string) error` |
| `DownloadFile` | RPC 与本地文件系统 | `app.go:935` | `(sessionID, remotePath string) TransferResult` |
| `DownloadFileTo` | RPC 与本地文件系统 | `app.go:1096` | `(sessionID, remotePath, localPath string) TransferResult` |
| `DownloadFileTracked` | RPC 与本地文件系统 | `app.go:940` | `(transferID, sessionID, remotePath string) TransferResult` |
| `DownloadLoot` | RPC 与本地文件系统 | `app.go:1785` | `(lootID string) TransferResult` |
| `EncodeShellcode` | Sliver RPC/客户端封装 | `features.go:978` | `(inPath, architecture string, iterations int) (string, error)` |
| `ExecWasmExtension` | Sliver RPC/客户端封装 | `features.go:1045` | `(sessionID, name string, args []string) ExecResult` |
| `ExecuteAssembly` | Sliver RPC/客户端封装 | `app.go:2672` | `(sessionID, localPath, args string) AssemblyResult` |
| `ExecuteBeaconCommand` | Sliver RPC/客户端封装 | `app.go:3021` | `(beaconID, command string) BeaconTaskResult` |
| `ExecuteBeaconCommandAsync` | Sliver RPC/客户端封装 | `app.go:3141` | `(beaconID, command string) BeaconTaskResult` |
| `ExecuteCommand` | Sliver RPC/客户端封装 | `app.go:327` | `(sessionID, command string) ExecResult` |
| `ExecuteShellcode` | Sliver RPC/客户端封装 | `app.go:1199` | `(sessionID, localPath string, pid uint32) AssemblyResult` |
| `ExecuteWindowsAdvanced` | Sliver RPC/客户端封装 | `features.go:920` | `(sessionID, path string, args []string, useToken, hideWindow bool, ppid int) ExecResult` |
| `FileBrowserDelete` | 客户端本地辅助 | `panels.go:67` | `(sessionID, path string) error` |
| `FileBrowserList` | 客户端本地辅助 | `panels.go:36` | `(sessionID, path string) FileBrowserResult` |
| `GenerateCleanupScript` | 客户端本地辅助 | `panels.go:485` | `() string` |
| `GenerateImplant` | Sliver RPC/客户端封装 | `app.go:2143` | `(req GenerateRequest) GenerateResult` |
| `GenerateReport` | 客户端本地辅助 | `panels.go:535` | `() string` |
| `GenerateUniqueWGIP` | Sliver RPC/客户端封装 | `features.go:864` | `() (string, error)` |
| `GenerateWGClientConfig` | Sliver RPC/客户端封装 | `features.go:846` | `() (WGClientConfigView, error)` |
| `GetAgentIPs` | 客户端本地辅助 | `panels.go:150` | `(sessionID string) AgentIPs` |
| `GetBeaconTaskResult` | Sliver RPC/客户端封装 | `app.go:3256` | `(taskID string) (BeaconTaskView, error)` |
| `GetBeaconTasks` | Sliver RPC/客户端封装 | `app.go:3211` | `(beaconID string) ([]BeaconTaskView, error)` |
| `GetBuildHistory` | Sliver RPC/客户端封装 | `app.go:1821` | `() ([]BuildView, error)` |
| `GetBuilders` | 客户端本地辅助 | `panels.go:415` | `() ([]map[string]interface{}, error)` |
| `GetCompilerInfo` | Sliver RPC/客户端封装 | `features.go:314` | `() (CompilerView, error)` |
| `GetCredential` | Sliver RPC/客户端封装 | `features.go:672` | `(id string) (CredView, error)` |
| `GetEngagementElapsed` | 客户端本地辅助 | `panels.go:403` | `() int64` |
| `GetEnvVars` | Sliver RPC/客户端封装 | `app.go:511` | `(sessionID string) ([]EnvVar, error)` |
| `GetHTTPC2Profile` | Sliver RPC/客户端封装 | `features.go:536` | `(name string) (string, error)` |
| `GetIOCs` | 客户端本地辅助 | `panels.go:468` | `() []IOCEntry` |
| `GetKillChain` | 客户端本地辅助 | `panels.go:342` | `() KillChainState` |
| `GetLoot` | Sliver RPC/客户端封装 | `app.go:1726` | `() ([]LootView, error)` |
| `GetNetstat` | Sliver RPC/客户端封装 | `app.go:461` | `(sessionID string) ([]NetstatEntry, error)` |
| `GetPivotGraph` | Sliver RPC/客户端封装 | `features.go:900` | `() ([]PivotNodeView, error)` |
| `GetPrivs` | Sliver RPC/客户端封装 | `app.go:870` | `(sessionID string) (PrivsResult, error)` |
| `GetProcessList` | Sliver RPC/客户端封装 | `app.go:412` | `(sessionID string) ([]ProcessView, error)` |
| `GetServerCompatibility` | 兼容性聚合 | `compatibility.go:47` | `() (ServerCompatibility, error)` |
| `GetSystem` | Sliver RPC/客户端封装 | `app.go:2625` | `(sessionID, hostingProcess, profileName string) error` |
| `GetVersion` | Sliver RPC/客户端封装 | `app.go:230` | `() (VersionInfo, error)` |
| `GrepFiles` | Sliver RPC/客户端封装 | `features.go:29` | `(sessionID, pattern, path string, recursive bool) (string, error)` |
| `Ifconfig` | Sliver RPC/客户端封装 | `app.go:840` | `(sessionID string) ([]NetInterfaceView, error)` |
| `ImpersonateUser` | Sliver RPC/客户端封装 | `app.go:2600` | `(sessionID, username string) error` |
| `ImportConfig` | 客户端本地辅助 | `config_store.go:101` | `(srcPath string) (SavedConfig, error)` |
| `InteractiveBeacon` | Sliver RPC/客户端封装 | `app.go:1402` | `(beaconID string) error` |
| `KillBeacon` | Sliver RPC/客户端封装 | `app.go:1910` | `(beaconID string) error` |
| `KillJob` | Sliver RPC/客户端封装 | `app.go:1967` | `(jobID uint32) error` |
| `KillRemoteProcess` | Sliver RPC/客户端封装 | `app.go:437` | `(sessionID string, pid uint32) error` |
| `KillSession` | Sliver RPC/客户端封装 | `app.go:306` | `(sessionID string) error` |
| `ListBeacons` | Sliver RPC/客户端封装 | `app.go:1879` | `() ([]BeaconView, error)` |
| `ListBuilders` | Sliver RPC/客户端封装 | `features.go:345` | `() ([]BuilderView, error)` |
| `ListC2Profiles` | Sliver RPC/客户端封装 | `app.go:2043` | `() ([]C2ProfileView, error)` |
| `ListCAInfo` | Sliver RPC/客户端封装 | `features.go:443` | `() ([]CertView, error)` |
| `ListCanaries` | Sliver RPC/客户端封装 | `app.go:1570` | `() ([]CanaryView, error)` |
| `ListCertificates` | Sliver RPC/客户端封装 | `features.go:274` | `() ([]CertView, error)` |
| `ListCreds` | Sliver RPC/客户端封装 | `app.go:1491` | `() ([]CredView, error)` |
| `ListFiles` | Sliver RPC/客户端封装 | `app.go:713` | `(sessionID, path string) LsResult` |
| `ListHTTPC2Profiles` | Sliver RPC/客户端封装 | `features.go:375` | `() ([]HTTPC2View, error)` |
| `ListHosts` | Sliver RPC/客户端封装 | `app.go:1454` | `() ([]HostView, error)` |
| `ListImplantExtensions` | Sliver RPC/客户端封装 | `extensions.go:179` | `(sessionID string) ([]string, error)` |
| `ListImplantProfiles` | Sliver RPC/客户端封装 | `app.go:2884` | `() ([]ProfileView, error)` |
| `ListInstalledExtensions` | Sliver RPC/客户端封装 | `extensions.go:133` | `() ([]ExtCommandView, error)` |
| `ListJobs` | Sliver RPC/客户端封装 | `app.go:1951` | `() ([]JobView, error)` |
| `ListMonitorConfig` | Sliver RPC/客户端封装 | `features.go:500` | `() ([]MonitorProviderView, error)` |
| `ListMounts` | Sliver RPC/客户端封装 | `features.go:81` | `(sessionID string) ([]MountView, error)` |
| `ListOperators` | Sliver RPC/客户端封装 | `app.go:1926` | `() ([]OperatorView, error)` |
| `ListPivots` | Sliver RPC/客户端封装 | `app.go:2239` | `(sessionID string) ([]PivotView, error)` |
| `ListPortForwards` | Sliver RPC/客户端封装 | `app.go:2485` | `(sessionID string) ([]PortForwardView, error)` |
| `ListRportFwds` | Sliver RPC/客户端封装 | `app.go:1352` | `(sessionID string) ([]RportFwdView, error)` |
| `ListSavedConfigs` | 客户端本地辅助 | `config_store.go:53` | `() []SavedConfig` |
| `ListScripts` | 客户端工作流编排 | `scripts.go:1053` | `() []ScriptInfo` |
| `ListServices` | Sliver RPC/客户端封装 | `app.go:2785` | `(sessionID string) ([]ServiceView, error)` |
| `ListSessions` | Sliver RPC/客户端封装 | `app.go:266` | `() ([]SessionView, error)` |
| `ListShellcodeEncoders` | Sliver RPC/客户端封装 | `features.go:410` | `() ([]string, error)` |
| `ListTrafficEncoders` | Sliver RPC/客户端封装 | `features.go:392` | `() ([]string, error)` |
| `ListWGForwarders` | Sliver RPC/客户端封装 | `features.go:760` | `(sessionID string) ([]WGForwarderView, error)` |
| `ListWGSocks` | Sliver RPC/客户端封装 | `features.go:785` | `(sessionID string) ([]WGSocksView, error)` |
| `ListWasmExtensions` | Sliver RPC/客户端封装 | `features.go:519` | `(sessionID string) ([]string, error)` |
| `ListWebsites` | Sliver RPC/客户端封装 | `app.go:1537` | `() ([]WebsiteView, error)` |
| `ListenerC2Options` | Sliver RPC/客户端封装 | `app.go:2062` | `() ([]string, error)` |
| `LootFile` | Sliver RPC/客户端封装 | `app.go:1755` | `(sessionID, remotePath string) error` |
| `MakeDirectory` | Sliver RPC/客户端封装 | `app.go:735` | `(sessionID, path string) error` |
| `MakeToken` | Sliver RPC/客户端封装 | `app.go:2585` | `(sessionID, username, domain, password string) error` |
| `MemfilesAdd` | Sliver RPC/客户端封装 | `features.go:131` | `(sessionID string) (int64, error)` |
| `MemfilesList` | Sliver RPC/客户端封装 | `features.go:109` | `(sessionID string) (string, error)` |
| `MemfilesRm` | Sliver RPC/客户端封装 | `features.go:147` | `(sessionID string, fd int64) error` |
| `Migrate` | Sliver RPC/客户端封装 | `app.go:1143` | `(sessionID string, pid uint32, profileName string) error` |
| `MoveFile` | Sliver RPC/客户端封装 | `app.go:779` | `(sessionID, src, dst string) error` |
| `MsfInject` | Sliver RPC/客户端封装 | `app.go:1637` | `(sessionID, payload, lhost string, lport uint32) error` |
| `MsfRemoteInject` | Sliver RPC/客户端封装 | `app.go:1652` | `(sessionID, payload, lhost string, lport, pid uint32) error` |
| `ParseAndStoreCredentials` | 客户端本地辅助 | `panels.go:216` | `(output, source string) []ParsedCredential` |
| `PickConfigFile` | RPC 与本地文件系统 | `app.go:98` | `() (string, error)` |
| `PingSession` | Sliver RPC/客户端封装 | `features.go:687` | `(sessionID string) error` |
| `PrintWorkingDir` | Sliver RPC/客户端封装 | `app.go:765` | `(sessionID string) (string, error)` |
| `ProcessBrowserKill` | 客户端本地辅助 | `panels.go:127` | `(sessionID string, pid int32) error` |
| `ProcessBrowserList` | 客户端本地辅助 | `panels.go:98` | `(sessionID string) ProcessBrowserResult` |
| `ProcessDump` | Sliver RPC/客户端封装 | `app.go:889` | `(sessionID string, pid int32) TransferResult` |
| `ReadRemoteFile` | Sliver RPC/客户端封装 | `app.go:809` | `(sessionID, path string) (string, error)` |
| `RecentAudit` | 客户端本地辅助 | `audit.go:85` | `(limit int) ([]auditEntry, error)` |
| `ReconfigureBeacon` | Sliver RPC/客户端封装 | `app.go:1388` | `(beaconID string, interval, jitter int64) error` |
| `RegenerateBuild` | Sliver RPC/客户端封装 | `app.go:1416` | `(name string) TransferResult` |
| `RegisterWasmExtension` | Sliver RPC/客户端封装 | `features.go:1017` | `(sessionID, name, wasmPath string) error` |
| `RegistryCreateKey` | Sliver RPC/客户端封装 | `app.go:670` | `(sessionID, hive, path, key string) error` |
| `RegistryDeleteKey` | Sliver RPC/客户端封装 | `app.go:684` | `(sessionID, hive, path, key string) error` |
| `RegistryListSubKeys` | Sliver RPC/客户端封装 | `app.go:566` | `(sessionID, hive, path string) ([]string, error)` |
| `RegistryListValues` | Sliver RPC/客户端封装 | `app.go:595` | `(sessionID, hive, path string) ([]RegistryValue, error)` |
| `RegistryReadHiveExport` | Sliver RPC/客户端封装 | `features.go:194` | `(sessionID, rootHive, requestedHive string) (string, error)` |
| `RegistryReadValue` | Sliver RPC/客户端封装 | `app.go:637` | `(sessionID, hive, path, key string) (string, error)` |
| `RegistryWriteValue` | Sliver RPC/客户端封装 | `app.go:654` | `(sessionID, hive, path, key, value string) error` |
| `RemoveFile` | Sliver RPC/客户端封装 | `app.go:915` | `(sessionID, path string) error` |
| `RemoveHostIOC` | Sliver RPC/客户端封装 | `features.go:702` | `(iocID, path, fileHash string) error` |
| `RemovePortForward` | Sliver RPC/客户端封装 | `app.go:2470` | `(sessionID string, localPort int) error` |
| `RemoveSavedConfig` | 客户端本地辅助 | `config_store.go:142` | `(path string) error` |
| `RemoveService` | Sliver RPC/客户端封装 | `app.go:2858` | `(sessionID, hostname, serviceName string) error` |
| `RemoveWebsite` | Sliver RPC/客户端封装 | `app.go:1553` | `(name string) error` |
| `RemoveWebsiteContent` | Sliver RPC/客户端封装 | `features.go:602` | `(website, webPath string) error` |
| `RenameLoot` | Sliver RPC/客户端封装 | `features.go:715` | `(id, name string) error` |
| `RenameSession` | Sliver RPC/客户端封装 | `app.go:298` | `(sessionID, newName string) error` |
| `ResetEngagementState` | 客户端本地辅助 | `panels.go:380` | `()` |
| `ResetKillChain` | 客户端本地辅助 | `panels.go:372` | `() KillChainState` |
| `ResizeShell` | Sliver 隧道/RPC | `shell.go:139` | `(tunnelID string, rows, cols int) error` |
| `RestartJobs` | Sliver RPC/客户端封装 | `features.go:428` | `(ids []int) error` |
| `RevToSelf` | Sliver RPC/客户端封装 | `app.go:2612` | `(sessionID string) error` |
| `RunAs` | Sliver RPC/客户端封装 | `app.go:1122` | `(sessionID, username, domain, password, program, args string) (string, error)` |
| `RunExecute` | Sliver RPC/客户端封装 | `app.go:368` | `(sessionID, path string, args []string) ExecResult` |
| `RunExtension` | Sliver RPC/客户端封装 | `extensions.go:295` | `(sessionID, command string, args []string) (string, error)` |
| `SSHExec` | Sliver RPC/客户端封装 | `features.go:169` | `(sessionID, host string, port int, user, pass, command string) SSHResult` |
| `SaveHTTPC2Profile` | Sliver RPC/客户端封装 | `features.go:555` | `(profileJSON string, overwrite bool) error` |
| `SaveImplantProfile` | Sliver RPC/客户端封装 | `app.go:2915` | `(req GenerateRequest) error` |
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
| `ServiceDetail` | Sliver RPC/客户端封装 | `features.go:231` | `(sessionID, hostname, name string) (ServiceView, error)` |
| `SetEnvVar` | Sliver RPC/客户端封装 | `app.go:530` | `(sessionID, key, value string) error` |
| `Sideload` | Sliver RPC/客户端封装 | `app.go:2694` | `(sessionID, localPath, args, entryPoint string) AssemblyResult` |
| `SniffCredHashType` | Sliver RPC/客户端封装 | `features.go:659` | `(hash string) (string, error)` |
| `SocksProxyStatus` | Sliver RPC/客户端封装 | `app.go:2343` | `(sessionID string) int` |
| `SpawnDll` | Sliver RPC/客户端封装 | `app.go:1221` | `(sessionID, localPath, args, entryPoint string) AssemblyResult` |
| `StartDNSListener` | Sliver RPC/客户端封装 | `app.go:2013` | `(req StartDNSReq) error` |
| `StartEngagementTimer` | 客户端本地辅助 | `panels.go:393` | `() string` |
| `StartHTTPListener` | Sliver RPC/客户端封装 | `app.go:1996` | `(req StartHTTPReq) error` |
| `StartInteractiveShell` | Sliver 隧道/RPC | `shell.go:50` | `(sessionID, shellPath string, enablePTY bool) (string, error)` |
| `StartMTLSListener` | Sliver RPC/客户端封装 | `app.go:1981` | `(req StartMTLSReq) error` |
| `StartMonitor` | Sliver RPC/客户端封装 | `features.go:472` | `() error` |
| `StartPivotListener` | Sliver RPC/客户端封装 | `app.go:2263` | `(sessionID, pivotType, bindAddress string) error` |
| `StartRportFwd` | Sliver RPC/客户端封装 | `app.go:1336` | `(sessionID, bindAddr string, bindPort int, fwdAddr string, fwdPort int) error` |
| `StartService` | Sliver RPC/客户端封装 | `app.go:2832` | `(sessionID, hostname, serviceName, binPath string) error` |
| `StartServiceByName` | Sliver RPC/客户端封装 | `features.go:247` | `(sessionID, hostname, name string) error` |
| `StartSocksProxy` | Sliver RPC/客户端封装 | `app.go:2304` | `(sessionID string, localPort int) error` |
| `StartStagerListener` | Sliver RPC/客户端封装 | `app.go:1588` | `(host string, port uint32, profileName string) (uint32, error)` |
| `StartWGListener` | Sliver RPC/客户端封装 | `app.go:2028` | `(req StartWGReq) error` |
| `StopInteractiveShell` | Sliver 隧道/RPC | `shell.go:160` | `(tunnelID string) error` |
| `StopMonitor` | Sliver RPC/客户端封装 | `features.go:489` | `() error` |
| `StopPivotListener` | Sliver RPC/客户端封装 | `app.go:2280` | `(sessionID string, pivotID uint32) error` |
| `StopRportFwd` | Sliver RPC/客户端封装 | `app.go:1374` | `(sessionID string, id uint32) error` |
| `StopService` | Sliver RPC/客户端封装 | `app.go:2846` | `(sessionID, hostname, serviceName string) error` |
| `StopSocksProxy` | Sliver RPC/客户端封装 | `app.go:2329` | `(sessionID string) error` |
| `TakeScreenshot` | Sliver RPC/客户端封装 | `app.go:387` | `(sessionID string) (string, error)` |
| `UnsetEnvVar` | Sliver RPC/客户端封装 | `app.go:542` | `(sessionID, key string) error` |
| `UpdateCredential` | Sliver RPC/客户端封装 | `features.go:644` | `(id, username, plaintext, hash string, cracked bool) error` |
| `UpdateKillChain` | 客户端本地辅助 | `panels.go:349` | `(stage string) KillChainState` |
| `UpdateWebsiteContent` | Sliver RPC/客户端封装 | `features.go:728` | `(website, webPath, localFile string) error` |
| `UploadFile` | RPC 与本地文件系统 | `app.go:993` | `(sessionID, remotePath string) TransferResult` |
| `UploadFileFrom` | RPC 与本地文件系统 | `app.go:1070` | `(sessionID, localPath, remotePath string) TransferResult` |
| `UploadFileTracked` | RPC 与本地文件系统 | `app.go:998` | `(transferID, sessionID, remotePath string) TransferResult` |
| `WGStartPortForward` | Sliver RPC/客户端封装 | `app.go:1669` | `(sessionID string, localPort int, remoteAddr string) error` |
| `WGStartSocks` | Sliver RPC/客户端封装 | `app.go:1694` | `(sessionID string, port int) error` |
| `WGStopPortForward` | Sliver RPC/客户端封装 | `app.go:1682` | `(sessionID string, id int) error` |
| `WGStopSocks` | Sliver RPC/客户端封装 | `app.go:1706` | `(sessionID string, id int) error` |
