# kHub V1.2 任务对接分类（现在能做 / 该等碰面）

> **基于：** `kapibala-kHub/docs/v1/kHub_plan_v1-2.md` v1.2.2（2026-04-30）+ docs/screenshots 三张截图
> **目的：** 在双方碰面对接前，明确哪些任务可以独立推进、哪些需要先对齐再动，最大化阿楚的有效产出、最小化返工面。
> **整理日期：** 2026-05-01

---

## 0. 核心结论

- plan 里 **约 65-70% 的后端工作**（Phase 1-2 大部分、Phase 3 协议层、Phase 4 内部逻辑）**契约清晰，可立刻推进**。
- **销售工作台 Web UI（§6.7，~8,000 行 TSX）整节先冻结**，核心决策悬空：工作台是独立 Web SPA、客户端，还是其它形态？这一点不定下来，三栏布局/登录态/多账号切换/顶部状态条等全部存在高返工风险。
- 关键风险点 **TDLib 兼容性验证（1.3）** 应作为 Phase 1 第一优先级，独立于一切 UI 决策。

---

## 1. ✅ 现在能做（独立 + 低返工）

这些任务有清晰契约（要么对接 Tracy 已有 API，要么是 kHub 内部逻辑），与客户端/壳形态无关。建议阿楚按下表的优先级直接推进。

### 1.1 后端基建（Phase 1-2 主体）

| Plan 编号 | 任务 | 独立性理由 |
|---|---|---|
| 1.1.1-1.1.5 | Node.js 20 + TS strict、Vitest、Fastify 入口、config、shared | 纯工程脚手架 |
| 1.2.1-1.2.4 | Docker Compose（PG + Redis + MinIO + TDLib + kHub 本体） | 基础设施编排 |
| **1.3.1-1.3.5** | **TDLib 兼容性验证（最高优先）** | 技术风险点，必须最先打掉 |
| 1.4.1-1.4.4 | ConnectorAdapter 接口 + Registry + 类型体系 + 单测 | 内部抽象 |
| 1.5.1-1.5.5 | TG Adapter 实现（HTTP 调 TDLib Service） | 协议已定 |
| 1.6.1-1.6.4 | Tracy 本地化 + contracts 类型提取 | 等 CTO 推代码即可，独立工作 |
| 2.1.1-2.1.5 | Drizzle + khub_raw_events / khub_accounts / khub_visibility_* 表 | schema 已在 data_model_v1 定 |
| 2.2.1-2.2.4 | typed EventEmitter + BullMQ Event Bus + 单测 | 内部 |
| 2.3.1-2.3.5 | Tracy Client 封装（5 个 endpoint） | Tracy API 已生产级 |
| 2.4.1-2.4.6 | 入站链路：Adapter → khub_raw_events → Tracy ingest → 翻译 | 后端管道 |
| 2.5.1-2.5.5 | 出站链路 + 状态机 + 重试策略 | 后端管道 |
| 2.6.1-2.6.4 | WA Adapter（HTTP 调 Go:9800） | 协议已定 |
| 2.7.1-2.7.3 | TG/WA 端到端联调 + testcontainers 集成测试 | 后端验证 |
| 3.5.1-3.5.3 | Plugin Config 拉取（30s 轮询 khub.* 命名空间） | 接口已定 |
| 4.1.1-4.1.5 | Visibility Control 完整实现（CRUD + 定时回收 + 审计 + E2E） | 内部逻辑 |
| 4.4.1-4.4.4 | 单测、集成测试、压测、安全审查 | 独立 |

### 1.2 后台管理页（Tracy Admin SPA D-08，对应已交付的截图）

| 截图 | 对应任务 | 备注 |
|---|---|---|
| `admin_dashboard_visibility_control.png` | Tracy Admin SPA 加 Visibility 管理 Page | 沿用 Tracy 现有 32K 行代码风格；CTO 推完 RBAC 改造（D-03）后即可做 |
| `admin_dashboard_account_health.png` | Tracy Admin SPA 加 Account Health Page | 同上，靠 kHub 的 Account Core API |

> 这两个管理端页面**与销售工作台的客户端形态决策无关**，是 boss/supervisor/lead 用 Tracy Admin（Web）操作的。可以放心推进。

### 1.3 部分协议层（接口可定，前端形态不影响）

| Plan 编号 | 任务 | 备注 |
|---|---|---|
| 3.1.1-3.1.5 | WS Gateway 核心：连接、JWT 鉴权、心跳、推送/命令协议 | 协议本身可定；**鉴权流细节**等碰面 |
| 3.2.1-3.2.5 | 推送管道 + 断线缓冲 + 增量同步 + Pub/Sub fan-out | 后端机制 |
| 3.3.1-3.3.4 | ViewProjector（策略读取 + 字段过滤 + 缓存失效） | 后端逻辑；**脱敏的展示形式**是 UI 决策 |

---

## 2. ⚠️ 该等碰面（高返工风险，先冻结）

### 2.1 销售工作台 Web UI（§6.7 整节）

**冻结理由：** 客户端形态未定。截图 `sales_workbench.png` 画的是三栏 Web SPA，但实际可能走客户端方向（见 §4 备注）。

**冻结的具体任务：**
- §6.7 全节：布局、虚拟滚动消息列表、翻译预览、AI 分析侧栏、会话切换不重连 WS、入站默认未读、Connector 断连提示、数据脱敏显示、会话内搜索、原文/译文切换、输入框/发送/预览交互
- 估算冻结代码量：~8,000 行 TSX

### 2.2 涉及前端形态的协议细节

| Plan 编号 | 待碰面对齐的细节 |
|---|---|
| 3.1.2 | WS 鉴权流：客户端是预先持有 JWT 直连 WS，还是先走 HTTP 登录拿 token？取决于客户端形态 |
| 3.4.4 | CORS 白名单：是否还需要 `workbench.huidu.ai` 域名？如果走客户端可能不需要 |
| 4.2.1-4.2.7 | Account Core API 能定，但**多账号管理 UI 的交互流**（添加账号、扫码登录、断连恢复提示、切换账号）在客户端 vs Web 里完全两套 |

### 2.3 跨方依赖（等 CTO）

| Plan 编号 | 任务 | 阻塞方 |
|---|---|---|
| 4.3.1-4.3.4 | 验证 D-03 RBAC + D-08 两个 Admin Page 的端到端 | 等 CTO 推代码 |
| D-01 | message_raw 增强方案 C | 阻塞 Phase 2 数据层最后一步 |
| D-02 | Ingest 路由增强（conversation_seq + 强去重） | 阻塞 Phase 2 入站联调 |
| D-06 | Plugin Config 加 khub.* 命名空间 | 阻塞 Phase 3.5 |
| D-07 | trace_id 透传 | 阻塞 Phase 1 |

---

## 3. 🚧 待对齐事项（碰面前请先给答案）

按风险从高到低排序，明天发壳代码时建议附上这些答案，能消掉一大半返工面：

| # | 待决议事项 | 影响范围 |
|---|---|---|
| 1 | **销售工作台客户端形态**：独立 Web SPA / Electron 壳 / 自研客户端 / Matrix 体系（见 §4）/ 多形态都做？ | §6.7 整节、3.4 CORS、域名规划 |
| 2 | **登录架构**：客户端/壳负责登录后注入 JWT，还是 SPA 自己跳 Tracy /auth/login？ | 3.1.2 鉴权流、Store 设计 |
| 3 | **多账号管理归属**：账号增删/切换 UI 放在客户端还是 SPA？ | 4.2 Account Core 的 UI 流形态 |
| 4 | **桌面级能力 V1 范围**：托盘、原生通知、全局快捷键、自动更新——哪些 V1 必须？哪些 V2？ | 直接决定客户端选型边界 |
| 5 | **多开/多窗口需求**：参考 Electron 的对话多开形态，是否 V1 必须？多开是同一进程多窗口、还是多账号多实例？ | UI 框架选型、状态管理拆分 |
| 6 | **plan §13 待对齐第 7 条**：kHub 和 Tracy 各自独立 BullMQ，需 CTO 确认无冲突 | 部署架构 |
| 7 | **域名规划**：`workbench.huidu.ai` 是否仍保留？如果走客户端则可能不需要 | 部署、CORS |

---

## 4. 备注：客户端形态——后续讨论方向

> 给阿楚的思考题：从用户场景出发，客户端形态可能不锁定 Electron。

- **稳定性顾虑**：Electron 后续可能不再用——局限和 bug 太多。原本提 Electron 只是想**借鉴它的界面思路**（例如对话多开等交互形态），不是绑定它的技术架构。
- **可选方向：参考 Matrix 生态**
  - Matrix 是否有现成的、完善的前端框架或客户端可以借鉴？
  - 它的客户端形态是怎样的（Web / Desktop / Mobile / 多端同步）？
  - 如果借鉴 Matrix 的协议或客户端实现，与 kHub 当前的 WS + REST 架构如何融合？需要哪些改造？
- **决策原则**：从用户场景反推（销售员的实际工作流：多账号、多对话、长时间挂机、桌面通知、跨设备），选择最稳的客户端形态，再决定 plan §6.7 的实施方式。
- **当前阶段**：这是**后续讨论项**，不阻塞 §1 列出的所有"现在能做"的后端任务。阿楚可以在推进后端的同时**预研** Matrix 客户端形态，碰面时一起讨论。

---

## 5. 推进顺序建议（阿楚视角）

```
本周（碰面前）:
  ▸ Phase 1.3  TDLib 兼容性验证       ★ 最高优先（技术风险）
  ▸ Phase 1.1  项目骨架
  ▸ Phase 1.2  Docker Compose
  ▸ Phase 1.4  ConnectorAdapter 接口
  ▸ 预研 Matrix 客户端形态（§4）       ☆ 碰面带方案讨论

碰面对齐后:
  ▸ Phase 1.5  TG Adapter
  ▸ Phase 1.6  Tracy 本地化（CTO 推代码后）
  ▸ Phase 2 全部（数据层、Tracy Client、入出站链路、WA Adapter、E2E）
  ▸ Phase 3.1-3.3, 3.5（WS/ViewProjector/Plugin Config 后端）
  ▸ Phase 4.1, 4.2 后端 API 部分
  ▸ Tracy Admin D-08 两个管理页（截图已交付，可启动）

碰面后才解锁:
  ▸ §6.7 销售工作台前端（取决于客户端形态决策）
  ▸ Phase 4.2 多账号管理 UI 流
  ▸ Phase 4.3 Tracy 端到端验证
```

---

**文档结束**
