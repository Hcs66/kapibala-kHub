# kHub 底座重新评估：Matrix Homeserver vs 自建 IM Core

---

## 0. 文档信息

| 项目 | 内容 |
|------|------|
| 文档标题 | kHub 底座重新评估报告 |
| 版本 | v1.0 |
| 日期 | 2026-04-27 |
| 触发原因 | CTO 反馈（2026-04-25）指出 plan_v1 的 Matrix 底座选型与 6 条核心业务需求存在架构级冲突 |
| 依据文档 | kHub_tdr_v1.md v1.0、kHub_plan_v1.md v1.1、kHub_feedback-2026-04-25.md、requirment.md v1.0 |

---

## 1. 重新评估的背景

### 1.1 为什么需要重新评估

plan_v1（v1.1, 2026-04-24）选择 Matrix Homeserver 作为 IM Core 底座。CTO 反馈（2026-04-25）指出 6 条之前未完整传达的核心业务需求与 Matrix 架构存在结构性冲突。

TDR（v1.0, 2026-04-20）§4.8 的原始结论是：**"不建议直接使用任何框架作为底座……推荐策略：借鉴设计模式，自建轻量中台核心。"** plan_v1 反转了这一结论，但未提供反驳论据。本文档重新对比两条路线，基于完整需求做出最终推荐。

### 1.2 决策原则

1. **需求驱动**：以 6 条核心业务需求为评估权重，不以技术偏好为导向
2. **证据优先**：每条结论必须有具体的技术论据或数据支撑
3. **复用优先**：TDR §5-§16 已有完整的自建 Core 设计，90% 可直接复用
4. **成本诚实**：Matrix 路线的"绕法"成本必须如实计入

---

## 2. 需求补全：§1.1-§1.6 六条核心业务需求

以下需求来自 CTO 反馈，之前未写入需求文档，现显式补入。

### 2.1 [REQ-V1] 业务员视角的客户资料动态可见性控制

**功能描述：**
- 管理台可对每个业务员（或角色）× 每个客户/会话，单独控制是否可见客户的真实姓名/手机号/平台 username/头像等敏感字段
- 关闭时业务员只看到 `Lead-1024` 匿名 ID + 标签 + 阶段 + 翻译后的对话内容
- 开启时业务员看到完整客户资料
- 切换是动态的，管理台改完业务员端立即生效（不能等下次登录）
- 管理台可随时回收已开放的可见性（支持定时自动回收）
- 业务员一旦看到过的资料，前端应立即清掉（缓存失效推送）

**业务目的：** 防飞单。强需求，不是 nice-to-have。

**技术约束：**
- 脱敏必须发生在服务端（客户端脱敏 = 没做脱敏）
- 切换动作要可审计（谁、什么时候、对谁开了多久）

### 2.2 [REQ-V1] 跨平台、跨会话的全文搜索

- 搜所有客户中提到某关键词的对话
- 跨房间、跨平台
- 原文 + 译文都要能搜

### 2.3 [REQ-V1+] 训练数据 / 平行语料导出

- 按时间段/账号/客户/平台多维过滤
- 导出原文 + 译文对齐的平行语料（翻译模型微调）
- 导出结构化对话数据（销售 agent 训练）
- 需要 join：原文 + 译文 + 分析标注 + 客户身份映射

### 2.4 [REQ-V1] 三种部署形态都要支持翻译

- 公有云 / 客户私有云 / 客户本地机房
- 本地机房客户数据不出内网，对外部 LLM API 访问受限
- V1 必须支持，不能推到 V2

### 2.5 [REQ-V1+] 多消费方接入

- V1：销售工作台 + 管理端
- V1+：群聊营销引擎迁移到 Agent Facade
- 未来：私聊客服 Agent、客户运营 Agent、客户画像模块
- 每个消费方对事件订阅 + 命令调用 + 数据视图的需求不同
- 视图要按消费方做投影（同一条消息推给不同消费方，能看到的字段不同）

### 2.6 [REQ-V1] 可见性的撤销路径

- 管理台可随时回收已开放的可见性（定时自动收回）
- 前端缓存失效推送机制
- 与 2.1 一体，单独列出强调撤销路径必须打通

---

## 3. 两条路线定义

### 路线 A：Matrix Homeserver 底座（plan_v1 当前方案）

Matrix Homeserver（Synapse 或 Tuwunel）作为 IM Core，负责消息持久化、事件分发、房间管理。kHub 业务层作为 Matrix 客户端订阅事件流，叠加翻译/分析/业务逻辑。前端同时订阅 Matrix /sync + kHub WebSocket 双数据源。

### 路线 B：自建 IM Core（TDR 原始推荐方案）

自建轻量 IM Core（TypeScript 模块化单体），借鉴 Matrix AS 桥接架构和 OpenIM 消息模型的设计模式，但不引入 Matrix Homeserver。所有数据统一存储在 kHub PostgreSQL 中。前端只对接 kHub 一个数据源（WebSocket + REST API）。

---

## 4. 逐需求对比评估

### 4.1 动态可见性控制（REQ-V1, 权重：Critical）

**Matrix 路线：**

Matrix 的核心数据模型是房间内事件流（Event DAG），房间所有成员通过 `/sync` 拿到的事件 content 是完全相同的。Ghost user 的 displayname / avatar / profile 是 Homeserver 上的全局状态，不存在 per-viewer 投影。

要实现动态可见性，只有一条绕法：**业务员不连 Matrix，所有展示数据走 kHub 业务层做投影。** 但这意味着：

| Matrix 优势（plan_v1 §3.1 列出的 6 项） | 该绕法下是否保留 |
|----------------------------------------|----------------|
| 成熟事件模型 | ❌ 业务层另起事件模型 |
| matrix-js-sdk 生态 | ❌ 前端不连 Matrix |
| AS 桥接架构 | ✅ 仍在用 |
| 多平台扩展 | ✅ 仍在用 |
| 联邦能力 | ❌（plan 也说要关闭） |
| /sync 实时推送 | ❌ 业务员不连 Matrix |
| 消息持久化 | ✅ 仍在用 |

**6 项优势中 3-4 项失效。** Matrix HS 的部署运维成本仍要付，但只换来 AS 桥接借鉴 + 消息存储两个收益。

**自建 Core 路线：**

kHub 业务层是唯一数据出口。ViewProjector 中间件在 API/WebSocket 层做 per-viewer 字段投影，天然支持：
- per-viewer × per-conversation 的字段级可见性控制
- 服务端强制脱敏（客户端永远拿不到未授权字段）
- 动态切换（WebSocket 推送 `visibility.changed` 事件，前端立即清缓存）
- 审计日志（`visibility_audit_log` 表记录每次切换）

**结论：自建 Core 天然支持，Matrix 需要绕法且绕法代价极高。**

### 4.2 跨会话全文搜索（REQ-V1, 权重：Critical）

**Matrix 路线：**

- Matrix `/_matrix/client/v3/rooms/{roomId}/messages` 是单房间分页拉取，不是搜索引擎
- Matrix `/_matrix/client/v3/search` 是 Synapse 的可选实现，Tuwunel 不一定支持
- 跨房间搜索 = 逐房间循环拉数据，N 个房间 N 次请求，性能不可行
- plan_v1 的 pg_trgm 只索引了译文，原文在 Matrix 存储中搜不了
- 要搜原文，必须把消息原文也镜像写到 kHub PG → 双写

**自建 Core 路线：**

所有消息（原文 + 译文）统一存储在 kHub PostgreSQL 的 `messages` 表中。TDR §12 已设计好搜索方案：
- V1：`pg_trgm` + GIN 索引，`raw_text` 和 `translated_text` 都建索引
- V2：Elasticsearch（CDC 同步）
- 跨会话搜索 = 一条 SQL，WHERE 条件加 conversation 过滤即可

**结论：自建 Core 一条 SQL 解决，Matrix 路线要么双写要么做不了。**

### 4.3 训练数据导出（REQ-V1+, 权重：Critical）

**导出需要 join 的数据：**

| 字段 | 自建 Core 位置 | Matrix 路线位置 |
|------|--------------|----------------|
| 原文 / 时间戳 / 发送者 | kHub PG `messages` | Matrix 存储（Synapse PG / Tuwunel RocksDB） |
| 译文 | kHub PG `translation_records` | kHub PG `translation_records` |
| 分析标注 | kHub PG `analysis_results` | kHub PG `analysis_results` |
| 客户身份映射 | kHub PG `conversation_aliases` | kHub PG `conversation_aliases` |

**Matrix 路线：**

- Synapse PG：勉强可以跨 schema join（同一个 PG 实例），但耦合 Synapse 内部 schema，Synapse 升级可能破坏
- Tuwunel RocksDB：完全做不了 SQL join。只能通过 Matrix `/sync` 全量拉一遍再在应用层 join——大客户几百万消息时不可行
- **CTO 反馈明确要求：如果 RocksDB 走不通，直接放弃 Tuwunel**

**自建 Core 路线：**

所有数据在同一个 PostgreSQL 中，标准 SQL JOIN：

```sql
SELECT m.raw_text, m.sent_at, m.source_lang,
       tr.translated_text, tr.target_lang,
       ar.result AS analysis,
       ca.alias_name
FROM messages m
JOIN translation_records tr ON tr.message_id = m.id
LEFT JOIN analysis_results ar ON ar.message_id = m.id
LEFT JOIN conversation_aliases ca ON ca.conversation_id = m.conversation_id
WHERE m.sent_at BETWEEN $1 AND $2
  AND m.account_id = $3;
```

**结论：自建 Core 标准 SQL，Matrix 路线跨数据源 join 要么不可行要么强耦合。**

### 4.4 本地机房翻译（REQ-V1, 权重：High）

**这条与底座选型无关，两条路线面临相同问题。** 但必须在 plan 中明确解决。

plan_v1 将本地翻译引擎标注为"V2 实现"，但本地机房是 V1 必须支持的交付场景。

**建议三选一：**
- (a) 明确"V1 本地机房客户接受 LLM 出网"，写进客户合规要求
- (b) V1 就提供 NLLB-200 / Marian NMT 本地翻译引擎方案
- (c) 显式标注"V1 不支持纯离线本地机房部署"

**本文档建议选 (b)**：NLLB-200 支持 200+ 语言，包括 PT-BR 和 VI，Docker 部署，GPU 推理单条 <100ms，CPU 推理 <500ms。资源需求：~4GB 显存（GPU）或 ~8GB 内存（CPU）。质量不如 LLM 但可用，作为降级方案合理。

### 4.5 多消费方统一接口（REQ-V1+, 权重：High）

**Matrix 路线：**

plan_v1 架构：前端同时订阅 Matrix `/sync` + kHub WebSocket。每个消费方都要自己实现：
1. Matrix /sync 订阅
2. kHub WS 订阅
3. 双 channel 合并
4. 视图投影逻辑

群聊营销引擎（Node.js 后端服务）也要做 Matrix client 集成。这违反 Agent Facade "统一标准事件，屏蔽底层差异"的初衷。

**自建 Core 路线：**

Agent Facade 是唯一事件出口。所有消费方只对接 kHub 一个数据源：
- WebSocket 订阅标准事件（message.received / message.translated / message.analyzed）
- REST API 调用标准命令（message.send / conversation.get_context）
- 每个消费方的视图投影在 Agent Facade 层完成，消费方无感知

**结论：自建 Core 天然单一数据源，Matrix 路线双数据源增加所有消费方的集成成本。**

### 4.6 Connector Adapter 工作量（权重：High）

**Matrix 路线：**

plan_v1 估算 ~800-1000 行 TS。但实际需要实现：
- 完整 AS 协议（HTTP transaction 接收、事件格式转换、错误处理）
- Ghost user 全生命周期（创建、profile 同步、presence 映射）
- 房间映射（平台会话 → Matrix 房间，创建/查找/状态同步）
- 媒体转存（平台媒体 → mxc:// URI）
- 撤回/编辑/已读三套语义跨平台映射
- 幂等去重
- Capabilities 映射

对标 mautrix 系列（每个 bridge ~50K LOC），生产级 Adapter 至少 6-8 周专人投入。

**自建 Core 路线：**

TDR §10 设计的 ConnectorAdapter 接口直接对接 UnifiedActionAPI v5：
- TG Adapter Shim：封装 TDLib bindings + 事件映射，~300-500 行 TS
- WA Adapter Shim：HTTP/WebSocket 客户端调用 Go 服务，~300-500 行 TS
- 不需要实现 AS 协议、不需要 ghost user、不需要 mxc:// 媒体转存
- 新平台（LINE）只需实现 ConnectorAdapter 接口

**工作量对比：**

| 工作项 | Matrix 路线 | 自建 Core 路线 |
|--------|-----------|--------------|
| AS 协议实现 | ~2000 行 | 不需要 |
| Ghost user 管理 | ~1500 行 | 不需要 |
| 房间映射 | ~1000 行 | 不需要（直接用 conversations 表） |
| 媒体 mxc:// 转存 | ~800 行 | 不需要（直接存 MinIO） |
| 事件格式转换 | ~1000 行 | ~300 行（UnifiedActionAPI → InboundMessageEvent） |
| 撤回/编辑/已读映射 | ~1500 行 | ~500 行（直接映射到 kHub 事件） |
| 去重/幂等 | ~500 行 | ~200 行（platform_msg_id UNIQUE 约束） |
| **合计** | **~8000-10000 行** | **~1000-1500 行** |

**结论：自建 Core 的 Adapter 工作量约为 Matrix 路线的 1/6-1/8。**

---

## 5. 翻译策略重新评估

这条与底座选型独立，但 CTO 反馈明确要求调整。

### 5.1 问题

plan_v1 将 TDR §8 的混合路由（DeepL PT + GPT-4o-mini ZH + Google TH + Azure 系统）改为全 Gemini Flash + Haiku fallback，但：
- 葡语 PT-BR：DeepL BLEU 60.4 → Gemini Flash 无 BLEU 数据
- 越南语 VI：无对照评估
- 入站延迟：90-280ms → 400-600ms TTFT
- 输出确定性：专用 API 稳定 → LLM 同段文本多次翻译可能不同
- 术语一致性：同产品名两条消息翻得不一样，直接影响客户体验

### 5.2 建议

回到 TDR §8 的混合路由决策矩阵，并扩展越南语支持：

| 语言对 | 推荐引擎 | 备选引擎 | 理由 |
|--------|---------|---------|------|
| PT-BR ↔ ZH | DeepL | Gemini Flash | BLEU 60.4，葡语质量无可争议领先 |
| VI ↔ ZH | Google Translate | Gemini Flash | Google 越南语覆盖完整，质量稳定 |
| ZH ↔ EN（口语） | GPT-4o-mini | Gemini Flash | 中文口语翻译自然，成本极低 |
| ZH ↔ EN（正式） | Azure Translator | Gemini Flash | 确定性输出，速度最快 |
| TH ↔ ZH | Google Translate | Gemini Flash | 泰语覆盖最完整 |
| 系统消息 | Azure Translator | Gemini Flash | 成本最低，延迟最小 |
| 语言检测 | Azure Detect（免费） | Gemini 内置 | 不计入字符配额 |
| 本地机房降级 | NLLB-200 | Marian NMT | 离线可用，200+ 语言 |

**月成本估算（日均 100K 条）：**

| 引擎 | 占比 | 月成本 |
|------|------|--------|
| DeepL（PT 路由） | 25% | ~$1,875 |
| Google（TH + VI 路由） | 30% | ~$1,800 |
| GPT-4o-mini（ZH 口语） | 30% | ~$60 |
| Azure（系统/检测） | 15% | ~$450 |
| Redis 缓存 | — | ~$100 |
| **合计** | **100%** | **~$4,285** |

成本比 plan_v1 的 $510 高 ~$3,775/月，但 CTO 反馈明确说"$3700/月的成本节约对销售业务来说不是关键约束"。质量和术语一致性优先。

---

## 6. 综合决策矩阵

| 评估维度 | 权重 | Matrix 路线 | 自建 Core 路线 | 说明 |
|---------|------|-----------|--------------|------|
| 动态可见性控制 | 25% | 2/10 | 9/10 | Matrix event-sourced 模型与 per-viewer 投影互斥 |
| 跨会话全文搜索 | 20% | 3/10 | 9/10 | Matrix 单房间 API 不支持跨房间搜索 |
| 训练数据导出 | 15% | 3/10 | 9/10 | 跨数据源 join 不可行（Tuwunel）或强耦合（Synapse） |
| 多消费方统一接口 | 10% | 4/10 | 9/10 | 双数据源 vs 单一数据源 |
| Adapter 工作量 | 10% | 3/10 | 8/10 | ~8000-10000 行 vs ~1000-1500 行 |
| 本地机房翻译 | 5% | 5/10 | 5/10 | 两条路线面临相同问题 |
| 部署运维成本 | 5% | 3/10 | 8/10 | Matrix HS 额外运维负担 |
| 生态成熟度 | 5% | 7/10 | 6/10 | Matrix 生态成熟但大部分用不上 |
| TDR 设计复用度 | 5% | 3/10 | 9/10 | TDR §5-§16 为自建 Core 设计，90% 可直接复用 |
| **加权总分** | **100%** | **3.15** | **8.55** |  |

---

## 7. 结论与推荐

### 7.1 推荐路线 B：自建 IM Core

Matrix Homeserver 是优秀的开源 IM 基础设施，但它的 event-sourced 联邦模型与我们的核心业务需求（per-viewer 动态可见性、跨会话搜索、训练数据导出、多消费方统一接口）存在架构级冲突。这些冲突不是 Matrix 的缺陷，而是需求侧的不匹配。

自建 Core 路线的核心优势：
1. **TDR §5-§16 已有完整设计**，包括消息模型（§6）、实时推送（§7）、翻译混合路由（§8）、Connector 抽象（§10）、部署架构（§11）、搜索方案（§12）、媒体存储（§13）、回放方案（§14）、术语表（§15），90% 可直接复用
2. **单一数据源**：所有数据在 kHub PostgreSQL 中，搜索/导出/投影都是标准 SQL
3. **Adapter 工作量降低 6-8 倍**：直接对接 UnifiedActionAPI v5，不需要实现 AS 协议
4. **前端只对接 kHub 一个数据源**：WebSocket + REST API，不需要双 channel 合并

### 7.2 从 Matrix 借鉴保留的设计模式

回到 TDR §4.7 的结论——借鉴设计模式，不直接使用：

| 借鉴来源 | 借鉴内容 | 应用位置 |
|---------|---------|---------|
| Matrix AS 架构 | 外部进程注册命名空间 + 批量事件推送 + 虚拟身份管理 | ConnectorAdapter 注册/事件分发机制 |
| Matrix AS Transaction | 批量 + 重试 + 幂等性保证 | Connector 事件投递的可靠性设计 |
| mautrix bridgev2 | Connector 接口定义 + 状态管理 + 消息转换管道 | ConnectorAdapter 接口设计 |
| OpenIM MsgData | ClientMsgID + ServerMsgID 双 ID 去重、Seq 单调递增序号 | messages 表的 platform_msg_id + id + conversation_seq |

### 7.3 需要补充的设计（无论选哪条路线）

| # | 设计项 | 说明 | 建议放在哪个文档 |
|---|--------|------|----------------|
| 1 | 可见性策略数据模型 | `visibility_policies` 表、ViewProjector 中间件、审计日志 schema、缓存失效推送 | plan_v2 §新增章节 |
| 2 | 训练导出链路 | 导出格式（JSON / 平行语料 TSV）、过滤维度、异步任务调度、大文件传输 | plan_v2 §新增章节 |
| 3 | 群聊营销引擎迁移路径 | V1 兼容并存 → V2 切完的具体时间表和接口变更 | plan_v2 §Agent Facade |
| 4 | 移动端规划 | Onboarding 文档里有，plan 里缺失 | plan_v2 §客户端 |
| 5 | 本地机房翻译方案 | NLLB-200 部署方案、质量基线测试、降级切换逻辑 | plan_v2 §翻译 |

### 7.4 建议的下一步

1. **确认本文档结论**：团队对齐"自建 Core"路线
2. **基于 TDR §5-§16 编写 plan_v2**：复用 TDR 的消息模型、存储设计、推送方案、Connector 抽象、部署架构，补充 §7.3 列出的 5 项新设计
3. **翻译策略回退到 TDR §8 混合路由**，扩展 VI 支持，补充 NLLB-200 本地降级方案
4. **Connector Adapter 范围裁剪**：V1 只做文本 + 图片，撤回/编辑/已读/视频放 V1.5，与 CTO 对齐缩水对业务的影响
5. **一周内开会拍板**

---

**文档结束**
