# kHub 人员需求清单

---

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档标题 | kHub 全栈工程师招聘需求 |
| 版本 | v1.0 |
| 日期 | 2026-05-07 |
| 关联文档 | kHub_plan_v1-2.md（实施计划）、kHub_workbench_prd_v1.md（产品需求）、workbench_demo_plan.md（开发计划） |

---

## 岗位概述

kHub 是一个面向销售员的跨平台即时消息实时工作台，核心链路为：多平台 IM Connector 收消息 → Tracy 翻译/分析 → 实时工作台展示 → 销售员发消息 → 状态回写。

团队采用全栈工程师模式，每人端到端负责功能模块（从后端到前端），不区分前后端角色。

---

## 招聘人数

2-3 名全栈工程师

---

## 技术栈要求

### 前端

| 技术 | 用途 |
|------|------|
| React 19 + TypeScript (strict) | 框架，函数组件 + Hooks |
| Zustand | 状态管理（按领域分 store） |
| TanStack Query (React Query) | 数据请求层 |
| @tanstack/virtual | 虚拟滚动（万级消息列表） |
| Tailwind CSS + shadcn/ui | 样式 + UI 组件库 |
| Vite | 构建工具 |
| i18next + react-i18next | 国际化 |
| React Router v7 | 路由 |

### 后端

| 技术 | 用途 |
|------|------|
| Node.js 20 LTS + TypeScript (strict) | 运行时 |
| Fastify | HTTP 框架 |
| Drizzle ORM + PostgreSQL 14+ | 数据层 |
| Redis 6.2+ | 缓存、Pub/Sub、Sorted Set |
| BullMQ | 异步任务队列（出站重试、过期回收） |
| WebSocket (Fastify WS) | 实时双向通信 |

### 基础设施

| 技术 | 用途 |
|------|------|
| Docker / Docker Compose | 开发环境 + 部署 |
| MinIO | 对象存储（图片消息） |
| GitHub Actions | CI/CD |
| Prometheus + OpenTelemetry | 监控（加分项） |

### Connector 对接（加分项）

| 技术 | 用途 |
|------|------|
| TDLib (Telegram Database Library) | Telegram 消息收发，HTTP wrapper 集成 |
| Go HTTP Client | WhatsApp Connector (Go:9800) 调用 |
| Connector 生命周期管理 | connect / disconnect / reconnect / health check |

---

## 经验程度

### 必须具备（硬性）

- 2-3 年全栈开发经验，有 TypeScript 全栈项目的完整交付经历
- **实时通信经验**：WebSocket 双向通信、心跳保活、断线重连（指数退避）、增量同步
- **IM/聊天类产品经验**：消息状态机（pending → sent → delivered → read → failed）、虚拟滚动、optimistic update、未读管理
- Docker 容器化开发环境搭建与维护

### 强烈加分

- 做过 TDLib 集成（登录流程、updateNewMessage 监听、sendMessage 调用）
- 有 Design System 落地经验（CSS 变量体系、组件库定制、Glassmorphism 风格）
- 做过事件驱动架构（EventEmitter + 消息队列）
- 有压测经验（500 WS 并发、350 条/分钟消息吞吐）

### 一般加分

- 有跨境电商/销售 SaaS 产品经验
- 有 Telegram Bot API 或 WhatsApp Business API 对接经验
- 有 Monorepo 管理经验

---

## 业务知识

### 必须理解

- 即时通讯产品完整链路
- RBAC 权限模型 + 数据可见性控制：白名单脱敏模式、ViewProjector 字段投影
- 多账号隔离：同平台多账号并行工作

### 需要了解

- Telegram / WhatsApp 的基本通信模型和平台能力差异
- 数据脱敏

### 加分了解

- 跨境销售场景：客户分阶段管理（初次接触 → 需求探询 → 报价 → 成交）
- 多语言沟通场景下的翻译质量感知

---

## AI 背景

### 定位说明

kHub 本身不做 AI 模型训练或推理，AI 能力由公共分析管道提供。工程师的 AI 相关职责是**消费和展示 AI 结果**，而非构建 AI 系统。

### 需要具备

- 理解 AI 分析结果的异步产出模式
- 能正确展示 AI 分析数据：意图识别、情感判断、销售阶段、会话摘要、建议回复
- 理解"建议回复"的交互模式：AI 生成建议 → 用户点击插入输入框 → 可编辑 → 重新触发翻译预览

### 加分项

- 有 LLM 应用层集成经验（调用 AI API、处理流式响应、结果结构化展示）
- 能配合 AI 辅助开发工具（Cursor / Copilot / Claude）提效
- 了解 NLP 基础概念（意图分类、情感分析、实体提取）

---

## 筛选权重矩阵

| 维度 | 权重 | 说明 |
|------|------|------|
| TypeScript strict 全栈能力 | ★★★★★ | 前后端统一语言 |
| WebSocket 实时通信经验 | ★★★★★ | 核心基础设施，前后端都深度涉及 |
| IM/聊天产品经验 | ★★★★☆ | 消息状态机 + 虚拟滚动 + optimistic UI + 未读管理 |
| React 生态深度 | ★★★★☆ | Zustand + TanStack Query + Virtual 组合 |
| Node.js 生产级服务 | ★★★★☆ | Fastify + BullMQ + 事件驱动架构 |
| Docker / 容器化 | ★★★☆☆ | 开发环境和部署都依赖 |
| 跨境/销售业务理解 | ★★☆☆☆ | 可快速学习，非硬性门槛 |
| AI/NLP 背景 | ★★☆☆☆ | 只需消费展示，不需要建模能力 |

---

## 团队配置

### 基础配置（2）

| 角色 | 人数 | 职责 |
|------|------|------|
| 全栈工程师 A | 1 | IM Core + WS Gateway + Connector Adapter + 工作台实时层 |
| 全栈工程师 B | 1 | 工作台 UI + 状态管理 + API Adapter + Visibility 前端消费 |

### 加速配置（3）

| 角色 | 人数 | 职责 |
|------|------|------|
| 全栈工程师 A | 1 | 会话模块端到端（列表 + 切换 + 未读 + 后端会话管理） |
| 全栈工程师 B | 1 | 消息模块端到端（收发 + 状态机 + 翻译预览 + WS 推送） |
| 全栈工程师 C | 1 | 分析模块 + Connector + Account Core + Visibility |

---

## 面试考察建议

### 技术面重点

1. **实时通信设计题**：设计一个支持断线重连 + 增量同步的 WebSocket 方案，如何处理断线期间的消息缓冲？
2. **消息状态机**：出站消息从 pending 到 sent/failed 的完整流转，如何保证幂等性？失败重试策略？
3. **虚拟滚动**：万级消息列表如何实现虚拟滚动？向上加载历史时如何保持滚动位置？
4. **Adapter 模式**：如何设计一个统一的 ConnectorAdapter 接口，同时支持 Telegram 和 WhatsApp？
5. **TypeScript 类型设计**：给定 ServerPushEvent 联合类型，如何实现类型安全的事件分发？

### 系统设计题

- 设计一个跨平台 IM 工作台的消息链路：从外部平台收到消息到销售员在工作台看到，中间经过哪些环节？如何保证消息不丢不重？

### 业务理解考察

- 为什么翻译预览不能自动发送？这个设计决策背后的业务考量是什么？
- 数据脱敏场景下，前端如何优雅处理"字段可能存在也可能不存在"的渲染逻辑？

---

**文档结束**
