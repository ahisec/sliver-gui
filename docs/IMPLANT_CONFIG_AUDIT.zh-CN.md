# ImplantConfig 字段审计

> 审计日期：2026-09-30
> Sliver 依赖：`github.com/bishopfox/sliver v1.7.4-0.20260715053412-e53f66de72b9`
> 审计对象：该依赖中 `clientpb.ImplantConfig`

## 结论

植入体配置档案编辑器已经覆盖适合跨格式复用的目标、模式、连接、C2、流量编码、执行限制和常用构建字段。传输包含标志和输出格式布尔值由结构化输入推导，避免同一配置出现互相冲突的状态。

下列字段不作为普通档案输入开放：Teamserver 生成的标识与构建关联、只对特定输出格式有效的 Shellcode/共享库细项、Builder 内部调试文件和嵌入资产。它们不是被遗漏，而是需要由专用生成流程、上游 Builder 或服务器生命周期管理。

状态含义：

| 状态 | 含义 |
|---|---|
| 可编辑 | 档案编辑器可读、可写并能覆盖保存 |
| 推导 | 根据 C2 或输出格式自动生成，不接受矛盾的独立输入 |
| 服务器只读 | 由 Teamserver 分配或维护，客户端只消费结果 |
| 格式专用 | 只属于特定构建链路，不在通用档案表单开放 |

## 字段清单

| 字段 | 状态 | 客户端行为与边界 |
|---|---|---|
| `ID` | 服务器只读 | 配置对象标识由 Teamserver 管理 |
| `ImplantBuilds` | 服务器只读 | 构建历史通过“构建记录”读取，不写回档案表单 |
| `ImplantProfileID` | 服务器只读 | 档案关联标识由 Teamserver 管理 |
| `IsBeacon` | 可编辑 | “异步信标”开关 |
| `BeaconInterval` | 可编辑 | 信标间隔，界面使用秒并在 Go 层转换为纳秒 |
| `BeaconJitter` | 可编辑 | 信标抖动，界面使用秒并在 Go 层转换为纳秒 |
| `GOOS` | 可编辑 | 目标操作系统 |
| `GOARCH` | 可编辑 | 目标架构 |
| `Debug` | 可编辑 | 调试构建开关 |
| `Evasion` | 可编辑 | 仅传递上游已公开的构建开关，不在客户端扩展实现 |
| `ObfuscateSymbols` | 可编辑 | 符号混淆开关 |
| `TemplateName` | 可编辑 | 构建模板名称 |
| `SGNEnabled` | 格式专用 | 与特定 Shellcode 编码链路相关；普通档案不提供无约束开关 |
| `GoPackage` | 可编辑 | 可留空使用 Teamserver 默认包路径 |
| `IncludeMTLS` | 推导 | 当前 Builder 兼容基线始终编译 mTLS transport，避免仅 Pivot 等配置触发上游未使用导入构建失败；实际拨号目标仍完全由 `C2` 列表决定 |
| `IncludeHTTP` | 推导 | 从 `C2` URL 的 `http`/`https` 协议推导 |
| `IncludeWG` | 推导 | 从 `C2` URL 的 `wg`/`wireguard` 协议推导 |
| `IncludeDNS` | 推导 | 从 `C2` URL 的 `dns` 协议推导 |
| `IncludeNamePipe` | 推导 | 从 `C2` URL 的命名管道协议推导 |
| `IncludeTCP` | 推导 | 从 `C2` URL 的 TCP Pivot 协议推导 |
| `WGPeerTunIP` | 可编辑 | 仅 C2 包含 WireGuard 时启用；提交前校验 IP |
| `WGKeyExchangePort` | 可编辑 | 仅 C2 包含 WireGuard 时启用；范围为 `0..65535`，`0` 表示采用上游默认语义 |
| `WGTcpCommsPort` | 可编辑 | 仅 C2 包含 WireGuard 时启用；范围与默认语义同上 |
| `ReconnectInterval` | 可编辑 | 重连间隔，界面使用秒 |
| `MaxConnectionErrors` | 可编辑 | 最大连接错误数 |
| `PollTimeout` | 可编辑 | 轮询超时，界面使用秒 |
| `C2` | 可编辑 | 每行保存优先级、URL 和可选协议参数；支持 mTLS、HTTP(S)、DNS、WireGuard、TCP Pivot 和 Named Pipe Pivot |
| `CanaryDomains` | 可编辑 | 逗号或换行分隔，保存前去重并规范化域名后缀 |
| `ConnectionStrategy` | 可编辑 | 连接策略 |
| `LimitDomainJoined` | 可编辑 | 域加入限制 |
| `LimitDatetime` | 可编辑 | 时间限制 |
| `LimitHostname` | 可编辑 | 主机名限制 |
| `LimitUsername` | 可编辑 | 用户名限制 |
| `LimitFileExists` | 可编辑 | 文件存在限制 |
| `LimitLocale` | 可编辑 | 区域设置限制 |
| `Format` | 可编辑 | 结构化输出格式选择 |
| `IsSharedLib` | 推导 | 客户端提交结构化 `Format`，具体构建路径由当前 Teamserver 根据输出格式处理；不提供第二个可能冲突的开关 |
| `IsService` | 推导 | 客户端提交结构化 `Format`，具体构建路径由当前 Teamserver 根据输出格式处理；不提供第二个可能冲突的开关 |
| `IsShellcode` | 推导 | 客户端提交结构化 `Format`，具体构建路径由当前 Teamserver 根据输出格式处理；不提供第二个可能冲突的开关 |
| `RunAtLoad` | 可编辑 | 由目标格式和上游 Builder 决定最终是否生效 |
| `DebugFile` | 格式专用 | Builder 调试输出路径，不作为可复用档案参数 |
| `Exports` | 格式专用 | 共享库导出符号需要对应格式的专用校验与工作流 |
| `ShellcodeConfig` | 格式专用 | Shellcode 架构细项由专用生成链路管理 |
| `ShellcodeEncoder` | 格式专用 | 编码器选择受格式和上游 Builder 能力约束 |
| `HTTPC2ConfigName` | 可编辑 | 从 Teamserver 档案下拉选择；支持查看、新建、导入、编辑、验证和刷新；非 HTTP(S) C2 自动清空 |
| `NetGoEnabled` | 可编辑 | Go 网络栈开关 |
| `TrafficEncodersEnabled` | 推导 | 由 `TrafficEncoders` 是否非空推导 |
| `TrafficEncoders` | 可编辑 | 从 Teamserver 可用编码器中选择或维护 |
| `Extension` | 可编辑 | 自定义输出扩展名，保存时去掉前导点 |
| `Assets` | 格式专用 | 嵌入资产涉及文件内容、大小和 Builder 行为，不在普通档案中隐式上传 |

## 映射与验证证据

- 表单与编辑回填：`frontend/dist/main.js` 中的 `profilesContent`、`wireProfileForm` 和 `editImplantProfile`。
- 请求与回读模型：`app.go` 中的 `GenerateRequest`、`ProfileView` 和 `profileViewFromConfig`。
- 配置构造：`app.go` 中的 `buildImplantConfig`。
- C2、格式、时间和 WireGuard 校验：`implant_studio.go` 中的 `validateGenerateRequest`。
- 聚焦测试：`implant_studio_test.go` 覆盖构造、档案回读、协议包含标志和 WireGuard 非法输入。

依赖升级后必须重新运行 `go doc -all github.com/bishopfox/sliver/protobuf/clientpb.ImplantConfig`，将新增或变化字段纳入本表，并同步更新表单、推导规则或边界说明。
