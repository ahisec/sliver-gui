# Sliver GUI 增强开发计划

> 状态：持续维护  
> 基线日期：2026-09-30  
> 上游参考：[Sliver Documentation](https://sliver.sh/docs/)  
> 适用范围：本仓库的 Wails 桌面客户端，不包含 Sliver Teamserver 本体和远程服务器运维。

## 1. 目标

把当前客户端逐步增强为稳定、清晰、可追踪的 Sliver 图形化操作台，而不是简单地把命令行命令堆成按钮。

核心目标：

1. 保持与 Sliver 官方 gRPC API 的兼容性，不复制 Teamserver 的 C2 实现。
2. 以操作流程组织功能，让 Session、Beacon、Listener、Implant、C2 Profile、Pivot 和数据管理彼此衔接。
3. 为异步任务、版本差异、错误、取消和重连提供统一体验。
4. 保留中文界面，并把新增界面默认纳入中文化检查。
5. 默认保护 Token、证书私钥、密码和其他敏感字段，不在普通日志中输出它们。
6. 仅面向获得明确授权的安全测试环境。

## 2. 产品边界

客户端的实际调用链如下：

```text
前端 JavaScript
  -> Wails 绑定的 Go App 方法
  -> Sliver protobuf/gRPC 客户端
  -> 远程 Sliver Teamserver
```

计划中的功能分为三类：

| 分类 | 含义 | 实现策略 |
|---|---|---|
| RPC 功能 | Sliver gRPC API 已暴露的能力 | 可以在客户端内完整实现 |
| 客户端辅助 | 本地展示、校验、编排和记录 | 可以实现，但不得伪装成 Teamserver 原生能力 |
| 服务器运维 | 安装、服务、环境变量、防火墙、启动参数等 | 只做检测和文档提示，不通过本客户端隐式修改远程服务器 |

除非未来单独立项，否则不引入 SSH 服务器管理、远程命令部署或 Teamserver 文件系统管理。

## 3. 当前基线

仓库目前已经具备大量 Sliver RPC 接入，主要问题是入口分散、状态表达不统一，以及前后端文件体积过大。

### 已有主要能力

- 操作员 `.cfg` 导入、保存、连接、断开和自动重连
- Session 与 Beacon 列表、控制台和事件流
- Listener、Job、Implant、Profile 和 Build 管理
- HTTP C2 Profile 编辑
- Loot、Credential、Host、Operator 和审计日志
- 文件、进程、服务、网络、注册表和环境变量面板
- Pivot、SOCKS、端口转发和拓扑图
- Armory、Extension、BOF、WASM 和外部 Builder 的部分能力
- 行动计时、IOC、清理脚本和行动报告

### 当前技术债

- `frontend/dist/main.js` 集中了大部分界面和行为，继续扩展容易产生回归。
- `app.go` 同时承担连接、Session、Listener、Implant、数据和隧道等多个领域。
- 异步 Beacon Task、生成任务和扩展安装缺少统一任务视图。
- RPC 错误直接暴露的情况较多，缺少分类、中文说明和恢复建议。
- 对 Teamserver 版本及能力的判断不够系统。
- 部分功能只有命令入口，缺少可发现、可复查的图形工作流。

## 4. 设计原则

### 4.1 工作流优先

同一目标所需的功能应放在一个工作流中。例如 Implant 生成需要串联 C2 Profile、Listener、平台参数、生成进度和构建历史，而不是分散到多个无关联弹窗。

### 4.2 渐进式拆分

不进行一次性前端框架重写。新增功能先建立模块边界，再逐步迁移现有代码，保证每一阶段都能运行和回退。

建议前端领域模块：

```text
frontend/dist/js/
  core/          Wails 调用、事件、错误、状态和通用工具
  sessions/      Session 与 Beacon 工作区
  tasks/         统一任务中心
  listeners/     Listener 与 Job
  implants/      Profile、Generate 和 Build
  c2/            C2 Profile 与传输选项
  pivots/        Pivot、SOCKS 和端口转发
  data/          Loot、Credential 和 Host
  extensions/    Armory、Alias、BOF 和 WASM
  team/          Operator、通知、审计和报告
```

Go 端按领域拆分 `App` 方法，但保持 Wails 对外方法名兼容，避免同时重写前后端。

### 4.3 能力驱动界面

连接成功后建立 `ServerCapabilities` 快照，至少包含：

- Teamserver 版本、平台和编译时间
- 客户端所针对的 Sliver protobuf 版本
- 编译器、外部 Builder、Encoder 和 C2 类型
- 关键 RPC 是否可用或是否返回未实现
- 功能不可用的原因和建议

界面根据能力启用、禁用或隐藏功能，不能等到提交后才显示原始 gRPC 错误。

### 4.4 安全与可追溯性

- 密码、Token、私钥默认遮盖，不进入审计详情和普通错误日志。
- 删除、终止、覆盖等操作显示目标摘要并二次确认。
- 任务记录包含操作员、目标、开始时间、结束时间、结果和可安全展示的参数。
- 不在客户端加入绕过授权边界或静默修改远程服务器配置的能力。

## 5. 目标信息架构

```text
总览
会话与信标
  - 概览
  - 终端
  - 文件
  - 进程
  - 网络
  - 服务
  - 环境变量
  - 任务历史
  - Loot
  - Pivot
任务中心
监听器
植入物
  - 生成工作台
  - 配置档案
  - 构建历史
C2 配置
基础设施
  - Pivot 拓扑
  - SOCKS
  - 端口转发
数据
  - Loot
  - 凭据
  - 主机
扩展中心
团队与审计
设置与兼容性
```

## 6. 分阶段路线图

### M0：工程基线与功能盘点

目标：在继续增加功能前建立可验证的基线。

任务：

- [ ] 建立官网功能矩阵，并在每次 Sliver 依赖升级时复核。
- [ ] 记录当前所有 Wails 绑定方法及其对应 RPC。
- [x] 建立统一的前端错误对象和中文错误映射。
- [ ] 增加连接、断开、取消文件选择器和基础 RPC 的冒烟测试清单。
- [ ] 明确受支持的 Windows、Linux、macOS 和 Teamserver 版本范围。
- [ ] 为新增界面建立中文化、加载态、空态、错误态和窄窗口检查项。

完成标准：

- 功能矩阵可以回答“已支持、部分支持、不支持以及为什么”。
- 基础测试命令有固定入口，现有功能无回归。

### M1：兼容性中心与统一任务中心

目标：先解决后续所有功能共同依赖的状态和版本问题。

任务：

- [x] 新增 `ServerCapabilities` 后端接口和兼容性页面。
- [x] 显示 Teamserver、GUI、Wails 和 protobuf/Sliver 依赖版本。
- [x] 将 Beacon Task、Implant Generate、Armory 安装等统一为任务模型。
- [x] 支持任务状态：排队、运行、等待回连、成功、失败、取消。
- [x] 展示开始时间、持续时间、目标、结果摘要和安全过滤后的错误。
- [x] 统一超时、取消和重试策略。

完成标准：

- 用户能够在一个页面查看长期任务及其最终结果。
- 不兼容功能在执行前即可被识别。

### M2：Session 与 Beacon 工作区

目标：把已有的控制台和操作面板整理成稳定的单目标工作区。

任务：

- [ ] 统一 Session/Beacon 详情头部和在线状态。
- [ ] 建立概览、终端、文件、进程、网络、服务、环境、任务和 Loot 标签页。
- [ ] Beacon 操作明确显示排队、最近签到和预计反馈窗口。
- [ ] 文件传输显示进度、取消、目标路径和结果。
- [ ] 统一危险操作确认及审计记录。
- [ ] 保存每个目标的工作区状态，但不持久化敏感输入。

完成标准：

- 常用操作无需依赖记忆命令名称即可完成。
- Session 与 Beacon 的实时/异步差异清楚可见。

### M3：Listener、C2 Profile 与 Implant Studio

目标：形成从传输配置到生成产物的完整流程。

任务：

- [ ] Listener 列表提供状态、协议、地址、端口、Job 和关联 C2 信息。
- [ ] 完善 mTLS、HTTP(S)、DNS 和 WireGuard 的分类型表单。
- [ ] C2 Profile 编辑器提供结构化表单、JSON 高级模式和保存前校验。
- [ ] Implant Studio 串联 Profile、Listener、平台、架构、格式、Beacon 参数和 Encoder。
- [ ] 支持 Executable Metadata、生成摘要和构建历史关联。
- [ ] 生成前执行依赖、Listener 和 Builder 预检。

完成标准：

- 用户可以从创建 Listener 到生成产物完整走通一次流程。
- 提交前能够看见最终配置摘要和明确的校验错误。

### M4：Pivot 与网络基础设施

目标：把当前已有能力整合为可操作、可诊断的网络视图。

任务：

- [ ] 完善 Teamserver、Session、Beacon、Pivot 的拓扑表达。
- [ ] 在拓扑中显示 Pivot 类型、监听地址、在线状态和影响范围。
- [ ] 集中管理 SOCKS、正向转发、反向转发和 WireGuard 转发。
- [ ] 增加端口冲突、地址格式和目标可达性的前置校验。
- [ ] 节点失联时标记受影响的下游路径。

完成标准：

- 所有活动转发均可在一个视图中定位、检查和停止。
- 拓扑状态与 Teamserver 返回结果一致。

### M5：扩展中心

目标：统一 Armory、Alias、Extension、BOF/COFF 和 WASM 的发现与执行体验。

任务：

- [ ] 展示已安装、可安装、版本、来源、平台和架构支持。
- [ ] 支持安装、更新、卸载及进度展示。
- [ ] 根据 Manifest 生成参数表单和命令预览。
- [ ] 统一 Extension、BOF/COFF 和 WASM 执行记录。
- [ ] 标记第三方来源、完整性信息和兼容性风险。
- [ ] 增加 External Builder 状态和构建日志入口。

完成标准：

- 扩展的发现、安装和执行不再依赖手工记忆命令。
- 第三方内容的来源和风险在执行前可见。

### M6：团队协作、通知和报告

目标：提高多人操作时的可见性和行动复盘能力。

任务：

- [ ] 在线操作员与连接状态页面。
- [ ] 可筛选的统一审计时间线。
- [ ] Session/Beacon 上线、任务失败和 Listener 异常通知。
- [ ] 通知级别、静默规则和本地桌面通知设置。
- [ ] 行动报告关联任务、IOC、Loot、Host 和时间线。
- [ ] 报告导出前提供敏感信息检查和脱敏选项。

完成标准：

- 能够回答某项操作由谁、何时、对哪个目标执行以及结果如何。
- 报告数据可以追溯到客户端记录或 Teamserver 返回值。

## 7. 官网手册功能矩阵

状态说明：

- `已有`：存在主要 RPC 或界面实现，后续以体验完善为主。
- `部分`：具备底层能力，但入口、状态或流程不完整。
- `待评估`：需要核对当前 Sliver protobuf/RPC 和版本兼容性。
- `文档`：主要属于部署、原理或外部工具，不应伪装成客户端功能。

| 官网主题 | 当前判断 | 计划归属 | 说明 |
|---|---|---|---|
| Aliases and Extensions | 部分 | M5 | 已有扩展执行，需统一发现、参数和版本管理 |
| Anti-virus Evasion | 文档 | M3 | 只呈现上游已暴露的构建选项和风险说明 |
| Architecture | 文档 | M0 | 作为兼容性和架构说明 |
| Armory | 部分 | M5 | 已有安装/移除，缺少完整状态和更新体验 |
| Audit Log | 部分 | M6 | 已有本地审计日志，需统一时间线和脱敏 |
| BOF and COFF Support | 部分 | M5 | 已有扩展通路，需核对参数、平台和结果展示 |
| C2 Advanced Options | 部分 | M3 | 纳入结构化 C2 编辑器 |
| Community Guides | 文档 | M0 | 维护外部链接，不复制内容 |
| Compile from Source | 文档 | - | 属于安装/构建文档 |
| Configuration Files | 部分 | M0 | 已支持操作员配置，需补充校验与安全说明 |
| Cross-compiling Implants | 部分 | M3 | 与编译器、Builder 和平台预检整合 |
| Cross-platform BOFs | 待评估 | M5 | 依赖上游版本和扩展 Manifest |
| Cursed | 待评估 | M5 | 先核对 RPC 和上游客户端依赖，不单独复刻协议 |
| Custom Clients | 文档 | M0 | 本项目本身即自定义客户端，记录接口约束 |
| DNS C2 | 部分 | M3 | 已能启动 Listener/生成，需补齐高级配置与校验 |
| Daemon Mode | 文档 | - | 属于 Teamserver 运行方式 |
| Debugging | 文档 | M0 | 增加诊断包和安全过滤后的日志入口 |
| Environment Variables | 文档 | - | Teamserver 启动环境不由 GUI 修改 |
| Executable Metadata | 待评估 | M3 | 检查 protobuf 支持后加入 Implant Studio |
| External Builders | 部分 | M5 | 已能列出，需状态、日志和构建关联 |
| GPG Public Key | 文档 | - | 上游发布验证信息 |
| Getting Started | 部分 | M3 | 以首次连接、Listener、Generate 工作流呈现 |
| Go Archive Output | 待评估 | M3 | 根据生成格式和上游版本决定 |
| HTTPS C2 | 部分 | M3 | 已支持 Listener 与 Profile，需形成完整流程 |
| Linux Install Script | 文档 | - | 属于服务器/客户端安装 |
| Loot | 已有 | M2/M6 | 强化来源、预览、筛选、下载和报告关联 |
| MCP | 待评估 | 后续 | 先确认上游安全模型、接口稳定性和实际用途 |
| Minisign Public Key | 文档 | - | 上游发布验证信息 |
| Multi-player Mode | 部分 | M6 | 已使用操作员配置，需在线状态和协作可见性 |
| Notifications | 部分 | M6 | 已有事件提示，需规则、级别和桌面通知 |
| OPFOR | 待评估 | 后续 | 先确认是否有稳定 RPC 和适合 GUI 的流程 |
| Payload Compatibility | 文档 | M3 | 在生成前展示兼容性提示 |
| Pivots | 已有 | M4 | 强化拓扑状态、诊断和下游影响 |
| Port Forwarding | 已有 | M4 | 集中管理和校验 |
| Reverse SOCKS | 部分 | M4 | 统一状态与生命周期管理 |
| Stagers | 部分 | M3 | 已有 Stager Listener，需生成流程和兼容性检查 |
| Themes | 部分 | 后续 | 在核心工作流稳定后完善外观设置 |
| Third Party Tools | 文档 | M5 | 仅展示集成边界和外部链接 |
| Traffic Encoders | 部分 | M3/M5 | 已能列出，需生成配置和兼容性校验 |
| Transport Encryption | 文档 | M0 | 展示连接安全信息，不重新实现协议 |
| Troubleshooting | 部分 | M0 | 建立诊断页面、错误分类和处理建议 |
| Watchtower | 待评估 | M6 | 核对当前 RPC、通知来源和版本支持 |
| Wireguard C2 | 部分 | M3/M4 | 已有 Listener 和转发，需配置与状态整合 |
| mTLS C2 | 部分 | M3 | 已有 Listener/生成，需完整工作流 |

## 8. 每个功能的完成定义

任何新增功能只有同时满足以下条件才视为完成：

- [ ] 使用真实 Sliver RPC 或明确标注为客户端本地辅助功能。
- [ ] 有加载态、空态、成功态、失败态和取消路径。
- [ ] RPC 错误有可理解的中文说明，原始错误可在详情中查看。
- [ ] 不记录 Token、私钥、密码等敏感值。
- [ ] Windows 原生对话框打开和取消不会导致进程退出。
- [ ] 窄窗口和常规桌面窗口下无文本遮挡或控件溢出。
- [ ] 为新增 Go 逻辑补充聚焦测试，前端至少通过语法检查和冒烟验证。
- [ ] 更新本文件中的矩阵、阶段清单或相关说明。

基础验证命令：

```powershell
go test ./...
go vet ./...
node --check frontend/dist/main.js
```

随着前端模块拆分，应将所有 JavaScript 文件纳入统一检查命令。

## 9. 近期开发队列

按“小步、可验证、低回归风险”的顺序，优先处理：

1. [已完成] 建立 `ServerCapabilities` 数据结构和只读兼容性弹窗。
2. [已完成] 统一前端 RPC 错误格式及中文错误展示。
3. 建立最小任务中心，先接入 Beacon Task 和 Implant Generate。
4. 将 Session/Beacon 详情逐步整理为标签式工作区。
5. 再进入 Listener、C2 Profile 和 Implant Studio 的流程整合。

第一项只读取远程 Teamserver 已公开的信息，不修改远程配置，适合作为增强工作的起点。

## 10. 计划维护规则

- 每完成一个阶段任务，立即更新对应复选框，不集中到版本末尾补记。
- Sliver 依赖、Wails 或 Go 工具链升级时，更新基线日期和兼容性结论。
- 新需求先归入阶段和官网功能矩阵，再进入实现。
- 若某项能力没有稳定 RPC，记录为“客户端辅助”或“文档”，不得通过脆弱的服务端文件修改模拟支持。
- 每个里程碑完成后保留一份简短变更记录和已知限制。
