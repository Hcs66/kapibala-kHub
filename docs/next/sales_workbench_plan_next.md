# kHub 产品迭代计划

## 目录

- [TL;DR](#tldr)
- [一、产品定位](#一产品定位)
- [二、当前阶段与差距](#二当前阶段与差距)
- [三、市场与竞品研究](#三市场与竞品研究)
- [四、目标演进路径](#四目标演进路径)
- [五、核心对象模型](#五核心对象模型)
- [六、关键能力规划](#六关键能力规划)
- [七、AI 能力分层](#七ai-能力分层)
- [八、产品护城河](#八产品护城河)
- [九、版本规划](#九版本规划)
- [十、next优先级](#十next优先级)

---

## TL;DR

kHub 的本质定位是 **Conversation-first Sales OS**——以会话驱动销售动作、决策与增长。当前处于 L1.5（Unified Inbox）阶段，核心差距在于缺少业务闭环（Workflow / Ownership / Task Queue / Pipeline）。下一阶段（V1.5）的首要目标是**把 Conversation 变成 Action**，通过引入 Lead Graph、Task Engine、Next Action 机制，将消息基础设施升级为真正的销售工作台。长期护城河是 Lead Graph + Sales Memory + Playbook Engine。

---

## 一、产品定位

**不是** CRM、IM、通用 AI Agent。

**是** Conversation-first Sales OS：用会话驱动销售动作、销售决策、销售增长。

战略机会在 **Conversation × Workflow × AI** 三者交叉点建立壁垒。

---

## 二、当前阶段与差距

### 成熟度模型

```
L0 Chat Tool → L1 Unified Inbox → L2 Sales Workbench → L3 Revenue OS → L4 Autonomous Sales Agent
```

**当前：L1.5 ~ L2**

### 已具备

- Multi-channel Connector
- Identity Merge
- Translation
- Replay & Search
- Analysis Layer
- Agent Facade

### 缺失

- Workflow / Ownership
- Task Queue
- Pipeline
- Revenue Model

### 核心问题

当前流程是 **Message-centric**（消息→翻译→分析→人工回复），目标是 **Action-centric**（消息→Lead 匹配→Stage 检测→Next Action→Task Queue→执行→Close）。

---

## 三、市场与竞品研究

### 第一梯队：Sales Engagement

#### Salesforce Sales Cloud

定位：

> Unified Sales Workspace

核心：

- Lead
- Opportunity
- Task Queue
- Pipeline
- AI Next Action

值得借鉴：

- Task-first
- Deal-centric
- Workflow 驱动

---

#### Apollo / Outreach

核心：

- Sequence
- Contact Graph
- Multi-channel

值得借鉴：

- Timeline
- Contact Intelligence

---

#### Reply.io / Salesloft

核心：

- Follow-up Queue
- Task Engine
- Playbook

值得借鉴：

- Queue-driven workflow

---

### 第二梯队：Collaborative Inbox

#### Front

值得借鉴：

- 三栏布局

---

#### Missive

值得借鉴：

- Assignment
- Team Collaboration

---

### 第三梯队：Conversation Intelligence

#### Gong

值得借鉴：

- Buying Signal
- Risk Detection
- Next Best Action

---

### 市场定位矩阵

```text
                    AI Intelligence
                         ↑
                         |
          Gong           |           kHub
                         |
------------------------------------------------→ Workflow
                         |
      Intercom           |      Salesforce
                         |
```

战略机会：

> 在 Conversation + Workflow + AI 三者交叉点建立壁垒。

---

## 四、目标演进路径

```
Sales Tool → Sales OS
Message Infrastructure → Sales Workbench → Revenue OS
```

架构分层（自下而上）：

```
Connector Layer → Conversation Core → Translation → Analysis → Agent Facade → Sales Workbench
```

评价：架构成熟，缺少业务闭环。

---

## 五、核心对象模型

```
Identity (渠道身份, N:1 Person)
  → Person (真实联系人, N:M Organization)
    → Organization (客户公司)
      → Lead (销售关系, 状态: new→contacted→qualified→proposal→negotiation→won/lost)
        → Opportunity (可量化商机, 状态: discovery→qualification→demo→proposal→negotiation→won/lost)
```

**Lead Graph** 是核心资产——把聊天对象升级为销售关系网络，实现跨渠道识别、组织穿透、机会评分、销售记忆。

---

## 六、关键能力规划

### Opportunity 执行容器

每个 Opportunity 下挂载：Messages、Tasks、Quotes、Meetings、Notes、Files、Timeline。

### Next Action（AI 驱动）

- 输入：Message + Stage + Lead Graph + Timeline + Playbook
- 输出：推荐动作 + 置信度 + 优先级 + 截止时间
- 动作类型：reply / send_quote / schedule_demo / followup / send_sample / request_payment / escalate / close_lost

### Task Queue（优先级行动队列）

- 来源：Manual + Rule Engine + AI Next Action + CRM Sync
- 排序：Revenue Weight × Urgency × AI Confidence × Deal Probability × SLA Risk
- 视图：High Value / Due Today / At Risk / Near Closing / AI Suggested
- 闭环：Task Done → Timeline Update → Opportunity Update → Next Action Recalculate

---

## 七、AI 能力分层

| Level | 能力 | 示例 |
|-------|------|------|
| L1 | NLP | intent 识别、sentiment 分析 |
| L2 | Sales Intelligence | stage 检测、risk 识别、成交概率 |
| L3 | Next Best Action | 推荐最优下一步 |
| L4 | Autonomous Agent | 自动跟进、报价、催单、nurturing |

生成机制三层演进：Rule Engine（V1.5）→ LLM Reasoning（V2）→ Learning Model（V3）

---

## 八、产品护城河

1. **Lead Graph** — 客户关系图谱，跨渠道识别 + 组织穿透 + 机会评分
2. **Sales Memory** — 长期记忆（历史价格、objections、competitor、decision maker）
3. **Playbook Engine** — 规则驱动的自动化销售流程

---

## 九、版本规划

| 版本 | 定位 | 核心新增 |
|------|------|----------|
| **V1（当前）** | Unified Inbox | Connector、Translation、Replay、Search、Summary |
| **V1.5** | Sales Workbench | Ownership、Task Engine、Next Action、Task Queue、Lead Graph P1 |
| **V2** | Revenue OS | Opportunity、Quotes、Meetings、Pipeline、CRM Sync、LLM Reasoning |
| **V3** | Autonomous Sales Agent | Relationship Graph、Learning Model、Playbook Optimization、Autonomous Execution |

---

## 十、next优先级

### P0（必须）

- Ownership（会话归属）
- Task Engine（任务引擎）
- Next Action（AI 推荐下一步）
- Task Queue（优先级队列）
- Lead Graph Phase 1（基础关系图谱）

### P1（建议）

- Lead Scoring
- Template Engine
- Timeline
- Stage Detection

### P2（后续）

- Pipeline
- CRM Sync
- Agent Autonomous Execution
