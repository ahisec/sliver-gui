<h1 align="center">Sliver GUI 增强版</h1>

<p align="center">面向中文操作员的 Sliver 桌面客户端增强版本</p>

<p align="center">
  <img alt="Go" src="https://img.shields.io/badge/Go-1.25%2B-00ADD8?logo=go&logoColor=white">
  <img alt="Wails" src="https://img.shields.io/badge/Wails-v2-d32f2f">
  <img alt="Sliver" src="https://img.shields.io/badge/Sliver-1.7%20development%20line-e23c4e">
  <img alt="License" src="https://img.shields.io/badge/License-GPLv3-blue">
</p>

本项目基于 [Mr-In4inci3le/sliver-gui](https://github.com/Mr-In4inci3le/sliver-gui) 进行二次开发。在保留原有 Wails 桌面客户端和 Sliver gRPC 集成方式的基础上，重点增强了中文操作体验、常用工作流、任务状态、兼容性诊断和 Windows 平台稳定性。

特别感谢原作者 **[Raj Kumar Mullapudi（Mr-In4inci3le）](https://github.com/Mr-In4inci3le)**。原项目完成了 Wails 后端、前端界面、Session/Beacon 控制台、拓扑视图以及大量 Sliver RPC 的基础接入，为本增强版提供了完整而重要的基础。

> [!IMPORTANT]
> 本项目是社区维护的非官方客户端，不隶属于 Bishop Fox，也不代表 Sliver 官方。仅可用于已获得明确授权的安全测试、教学、研究和自有设备管理。使用者应自行遵守所在地法律法规并承担相应责任。

## 项目定位

Sliver GUI 增强版是 [Sliver](https://github.com/BishopFox/sliver) 的桌面操作端，而不是独立 Teamserver。客户端读取官方 Sliver 操作员 `.cfg`，通过 Sliver Go protobuf/gRPC 接口连接远程 Teamserver；Listener、植入体生成、Session、Beacon 和扩展执行等核心能力仍由 Sliver 提供。

项目采用：

- **Go + Wails v2**：桌面应用、RPC 封装和本地能力。
- **原生 HTML/CSS/JavaScript**：中文界面和操作工作区。
- **Sliver Go 客户端依赖**：直接使用官方 protobuf/gRPC 类型，不引入 grpc-web 中转层。
- **可选官方控制台桥接**：在 Windows 上通过 ConPTY 嵌入与 Teamserver 匹配的官方 `sliver-client.exe`。

## 主要增强

### 中文化与稳定性

- 主要菜单、弹窗、任务状态、错误提示和常用控制台帮助已中文化。
- Windows 目标输出支持 UTF-8 与 GB18030 回退解码，降低中文命令结果乱码概率。
- 修复 Windows 原生文件选择器取消时的崩溃问题。
- 普通弹窗仅通过关闭、取消或确认按钮退出，避免误点遮罩导致内容丢失。
- 数据密集窗口采用更宽且可响应的布局，减少横向滚动。

### Session 与 Beacon

- Session、Beacon 使用独立视图和符合各自同步/异步语义的操作入口。
- 展示主机、内网地址、Teamserver 所见连接来源、传输协议、PID、进程名和权限级别。
- 新上线目标自动进行完整性级别探测；高权限状态在用户列中明确标记。
- 支持定时刷新、离线主机隐藏与持久化、重新上线自动恢复。
- 提供目标概览、重命名、终止/删除、交互、任务和常用右键操作。
- Session 支持交互式 Shell；Beacon 命令以任务形式提交并等待后续签到返回。

### 文件与进程工作区

- 文件浏览器支持磁盘/挂载点、目录导航、修改时间展示、上传、下载、目录归档下载、删除和重命名。
- Windows 文件可填写参数运行，并支持后台隐藏启动。
- 屏幕截图直接以原始 PNG 保存到程序运行目录。
- 进程浏览器展示 PID、PPID、所有者、架构和可用元数据。
- 进程右键支持刷新、终止、转储和迁移等已映射操作。

### Listener、C2 档案与植入体

- 管理 mTLS、HTTP/HTTPS、DNS、WireGuard Listener 和当前 RPC 支持的 TCP Stager Listener。
- HTTP C2 档案支持从 Teamserver 读取、查看、创建、导入、编辑和验证。
- 植入体配置档案支持创建、载入、编辑和覆盖保存，并可配置多个 C2。
- 提供构建预检、生成记录、产物保存、Windows `.exe` 后缀补全和实验性体积优化选项。
- 配置界面按 C2 类型启用相关字段，避免提交无效的 HTTP C2 或 WireGuard 参数。

### 控制台与官方客户端

- 内置服务器及 Session/Beacon 文本控制台，保留简洁的 GUI RPC 路由。
- 提供命令帮助、参数校验和 Tab 补全；命令元数据来自锁定版本的 Sliver Cobra 命令树。
- 未映射的官方命令或参数会明确拒绝，不会被静默过滤，也不会误当作目标系统命令执行。
- 可从“工具 → 官方控制台”启动独立的官方 Sliver Client，获得对应版本原生的命令、参数、上下文、历史记录和补全能力。
- 关闭官方控制台窗口不会退出 GUI，也不会意外终止仍在运行的桥接进程。

### 扩展、协作与运维辅助

- Armory 支持浏览、安装、更新和移除，并验证官方索引及软件包签名。
- 扩展中心支持本机目录或 `.tar.gz` 导入、Manifest 兼容、结构化参数和原始参数执行。
- 提供任务中心、Loot、凭据、主机、操作员、本地审计、IOC、报告和网络基础设施视图。
- 提供脚本管理器、Pivot/转发汇总和当前在线 Session 联动。
- 新 Session/Beacon 上线可通过钉钉自定义机器人通知。
- 集成当前 Sliver 依赖提供的客户端侧 MCP HTTP/SSE 服务，并在旧版本缺少能力时显示降级原因。

## 界面预览

以下截图来自原项目，用于展示基础界面设计。增强版的菜单、中文文案和功能布局已有调整，建议后续替换为当前版本截图。

<img width="1912" alt="Sliver GUI overview" src="https://github.com/user-attachments/assets/34de2c40-85d6-4d5f-b985-80f9d335e93d" />

<br>

<img width="1907" alt="Sliver GUI pivot graph" src="https://github.com/user-attachments/assets/913aeb82-36bb-4594-8bf3-9afd440df910" />

## 快速开始

### 运行已编译版本

1. 从项目 Releases 下载适合当前平台的程序。
2. 准备由目标 Teamserver 生成的 Sliver 操作员 `.cfg`。
3. 启动程序，在登录页添加或选择 `.cfg` 后连接。
4. 连接后先打开“兼容性中心”，确认 GUI 依赖与 Teamserver 的版本关系和能力状态。

操作员配置包含 mTLS 私钥和认证信息，请勿提交到 Git、发送到不可信位置或与他人共用。

### 从源码构建

要求：

- Go `1.25.8` 或兼容的更新版本。
- [Wails v2 CLI](https://wails.io/docs/gettingstarted/installation)，当前项目使用 `v2.16.0`。
- Windows 需要 WebView2 Runtime；Linux 需要对应发行版的 GTK/WebKitGTK 开发依赖。

```bash
git clone <your-repository-url>
cd sliver-gui-main
go mod download
go install github.com/wailsapp/wails/v2/cmd/wails@v2.16.0
wails doctor
wails build
```

默认构建产物位于：

```text
build/bin/sliver-gui.exe
```

开发模式：

```bash
wails dev
```

Linux 可继续使用仓库 `Makefile` 中的 `webkit2_41` 构建标签；使用 WebKitGTK 4.0 的系统可执行 `make build TAGS=`。

## 基本使用流程

1. 在 Teamserver 上创建操作员配置，并将 `.cfg` 安全传输到操作员电脑。
2. 在登录页导入 `.cfg` 并连接 Teamserver。
3. 创建或检查 HTTP C2/植入体配置档案。
4. 启动匹配的 Listener。
5. 生成并保存植入体，在明确授权的测试目标运行。
6. 从“会话”或“信标”视图进入目标工作区。
7. 使用任务中心、事件日志和审计视图跟踪长时间操作及错误。

Session 是实时交互连接；Beacon 是按间隔签到的异步连接。同一命令在 Beacon 上通常需要等待一次或多次签到才能领取任务并返回结果。

## 程序配置

程序首次启动时会在可执行文件同目录创建 `config.yaml`。该文件统一保存窗口标题、钉钉机器人和官方客户端路径：

```yaml
version: 1
title: Sliver GUI 增强版
dingtalk:
  enabled: false
  webhook: ""
  secret: ""
official_client:
  path: ""
```

- `title`：原生主窗口标题，修改后重启生效。
- `dingtalk.webhook` / `dingtalk.secret`：钉钉机器人地址和可选加签密钥。
- `official_client.path`：与 Teamserver 版本匹配的官方 Sliver 客户端路径。

> [!WARNING]
> 钉钉 Webhook 和密钥按当前设计以明文保存，便于排错。请限制程序目录访问权限，不要把真实 `config.yaml`、操作员 `.cfg`、私钥、Loot、Dump 或植入体提交到 GitHub。

## 官方控制台桥接

GUI 无法自动理解未来 Sliver 版本新增命令的全部参数和安全语义。为降低版本升级后的使用成本，本项目保留独立官方控制台：

1. 准备与 Teamserver 匹配的官方 `sliver-client`。
2. 在“工具 → 官方控制台”选择客户端程序并保存路径。
3. 点击启动，在嵌入式终端中使用官方命令、帮助、上下文和 Tab 补全。

内置 GUI 文本控制台与官方控制台相互独立。GUI 已映射命令继续使用结构化 RPC；未映射能力应在官方控制台中使用。

## 兼容性与已知边界

- 当前依赖基线为 `github.com/bishopfox/sliver` 1.7 开发线提交 `e53f66de72b9`，详见 `go.mod`。
- 同主版本的新 Teamserver 会进入前向兼容模式，既有 RPC 可继续尝试；未来新增 RPC、字段和命令语义仍需客户端适配。
- Windows 10/11 是主要开发和回归平台；Linux/macOS 构建依赖 Wails 支持情况，发布前应在目标系统人工验证。
- GUI 显示的连接来源是 Teamserver RPC 提供的地址。经过 CDN 或反向代理时，客户端无法凭空还原代理前真实公网 IP。
- 文件时间戳修改已撤下：当前 Sliver 链路无法稳定应用并回读验证，客户端不会伪报成功。
- 当前依赖只提供可稳定映射的 TCP Stager Listener RPC；其他 Stager 组合以官方客户端和实际 Teamserver 能力为准。
- 外部 Builder 实时日志、Go Archive、Cursed、OPFOR 等能力没有稳定 GUI RPC 时，会明确标记为部分支持或上游限制。
- “清空离线主机”只隐藏本客户端中的历史记录，不删除 Teamserver 数据。

完整的自动验证方法、人工冒烟项目和支持边界见 [测试与支持基线](docs/TESTING_AND_SUPPORT.zh-CN.md)。

## 测试与验证

Windows PowerShell 下执行统一验证：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify.ps1
```

脚本会执行：

- Go 单元测试。
- `go vet` 静态检查。
- 前端 JavaScript 语法检查和 Node 测试。
- Wails 绑定清单临时生成检查。

自动验证不会连接 Teamserver，也不会向远程目标发送命令。真实连接、Listener、植入体生成、文件传输、隧道和扩展执行应按照 [人工冒烟清单](docs/TESTING_AND_SUPPORT.zh-CN.md) 在隔离且已授权的环境中完成。

## 路线图

后续计划主要包括：

- RPC 能力快照、缓存和界面自动降级。
- Sliver 依赖升级时的命令树与 protobuf 差异报告。
- 当前上游 RPC 能力范围内的 Stager/Stage Listener 工作流完善。
- 更多真实 Teamserver、Session、Beacon 和跨平台发布验证。

## 贡献

欢迎提交 Issue 和 Pull Request。提交代码前请：

1. 不提交操作员 `.cfg`、Token、私钥、真实 C2 地址、Webhook、Loot 或植入体。
2. 新功能优先复用 Sliver 已有 RPC，并在界面中准确说明 Session/Beacon 和版本能力边界。
3. 为关键逻辑增加测试，并确保 `scripts/verify.ps1` 通过。
4. 对用户可见内容优先提供清晰中文，同时避免隐藏上游错误中的关键诊断信息。

## 致谢

- **[Raj Kumar Mullapudi / Mr-In4inci3le](https://github.com/Mr-In4inci3le)**：原始 [sliver-gui](https://github.com/Mr-In4inci3le/sliver-gui) 的设计与开发者。本项目的 Wails 架构、基础界面、拓扑、控制台和大量 RPC 接入均建立在其工作之上，再次表示诚挚感谢。
- **[Bishop Fox Sliver](https://github.com/BishopFox/sliver)**：提供 Sliver C2 框架、客户端库、protobuf/gRPC 接口及官方文档。
- **[Wails](https://wails.io/)**：提供 Go 与 Web 前端结合的跨平台桌面应用框架。
- Sliver、Armory 和安全研究社区的贡献者：感谢持续维护文档、扩展、兼容性信息和测试反馈。

## 许可证

本仓库沿用 [GNU General Public License v3.0](LICENSE)。分发修改版本时，请同时遵守 GPLv3、保留原项目及相关第三方项目的版权和许可证声明，并明确说明本仓库属于修改版本。
