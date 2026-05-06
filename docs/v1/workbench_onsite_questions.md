# Workbench 对接问题清单（Onsite 讨论）

> 日期：2026-05-12
> 目的：onsite 当天与 CTO 确认的技术对接问题，确保 mock → real 切换顺利

---

## 1. Auth / 登录

| # | 问题 | 当前 mock 行为 | 需确认 |
|---|------|---------------|--------|
| 1.1 | 登录接口路径 | `POST /mock/auth/login` | talksub 真实路径是 `/auth/login` 还是其他？ |
| 1.2 | JWT 格式 | mock 返回纯字符串 token | JWT payload 结构？是否包含 role/tenantId？ |
| 1.3 | Token 刷新 | 无 refresh token，过期重新登录 | V1 是否需要 refresh token？还是短 token + 重登录？ |
| 1.4 | 401 处理 | 前端清 token 跳登录页 | 后端 401 响应格式？是否有 error code 区分过期 vs 无权限？ |
| 1.5 | role 校验 | 前端只允许 `role === 'sales'` | 校验在 BFF 做还是前端做？非 sales 登录返回什么？ |

---

## 2. 会话列表

| # | 问题 | 当前 mock 行为 | 需确认 |
|---|------|---------------|--------|
| 2.1 | 列表接口 | `GET /mock/workbench/conversations` | 真实路径？分页参数格式（page/limit vs cursor）？ |
| 2.2 | 排序逻辑 | 前端按 lastMessageAtMs 排序 | 服务端排序还是前端排序？ |
| 2.3 | 未读数来源 | mock 数据中的 unreadCount 字段 | 未读数由 BFF 计算还是 talksub 返回？ |
| 2.4 | 增量更新 | WS `message.received` 事件驱动 | 会话列表是否有独立的增量更新事件？还是只靠消息事件推导？ |
| 2.5 | customerDisplayName | 直接使用 DTO 中的字段 | 这个字段是 anonymized_alias 还是 real_name？ViewProjector 在哪层处理？ |

---

## 3. 消息

| # | 问题 | 当前 mock 行为 | 需确认 |
|---|------|---------------|--------|
| 3.1 | 历史消息接口 | `GET /mock/workbench/conversations/:id/messages?beforeSeq=xxx` | 真实路径？beforeSeq 对应 Tracy 的 conversation_seq？ |
| 3.2 | 消息排序依据 | createdAtMs | 真实环境用 conversation_seq 还是 createdAtMs？ |
| 3.3 | 发送接口 | `POST /mock/workbench/messages/send` | 真实发送走 REST 还是 WS command？ |
| 3.4 | idempotencyKey | 前端生成 `local_${timestamp}_${random}` | BFF 如何处理幂等？重复 key 返回什么？ |
| 3.5 | 消息状态回调 | WS 事件 `message.sent` / `message.failed` | 状态变更事件的 payload 格式？是否包含 serverMessageId？ |
| 3.6 | 媒体消息 | V1 不支持 | 图片消息的 media_url 格式？MinIO 直连还是 BFF 代理？ |

---

## 4. 翻译

| # | 问题 | 当前 mock 行为 | 需确认 |
|---|------|---------------|--------|
| 4.1 | 翻译接口 | `POST /mock/workbench/translate/preview` | 真实路径？直接调 talksub `/translate` 还是 BFF 封装？ |
| 4.2 | 目标语言 | 前端写死 `targetLang: 'en'` | 客户语言从哪个字段获取？ConversationDTO.language？ |
| 4.3 | 翻译超时 | mock 800ms，timeout 场景 4s | 真实翻译 P95 延迟？前端超时阈值设多少合适？ |
| 4.4 | 入站译文 | MessageDTO.translatedText 字段 | 入站消息的译文是随消息一起返回，还是异步通过 WS 推送？ |

---

## 5. WebSocket

| # | 问题 | 当前 mock 行为 | 需确认 |
|---|------|---------------|--------|
| 5.1 | WS 地址 | mock 内存模拟 | 真实 WS 地址？`wss://ws.huidu.ai/workbench/ws` 还是其他？ |
| 5.2 | 鉴权方式 | connect 时传 token | WS 鉴权：URL query param？首条消息？HTTP upgrade header？ |
| 5.3 | 事件名映射 | `message.received` / `message.sent` / `message.failed` | cq connector 的事件名是否一致？BFF 是否做事件名转换？ |
| 5.4 | 心跳协议 | 未实现 | ping/pong 格式？间隔？服务端是否主动断开空闲连接？ |
| 5.5 | 增量同步 | 未实现 | 断线重连后 sync.request 的参数格式？per-conversation last_sync_seq？ |
| 5.6 | 多标签页 | 未处理 | 同一用户多标签页打开，WS 连接策略？SharedWorker？ |

---

## 6. 分析侧栏

| # | 问题 | 当前 mock 行为 | 需确认 |
|---|------|---------------|--------|
| 6.1 | 分析接口 | `GET /mock/workbench/conversations/:id/analysis-summary` | 真实路径？BFF 聚合 state_digest + analysis_pack？ |
| 6.2 | 建议回复 | mock 静态数据 | 建议回复从 `/select_action` 获取？格式？ |
| 6.3 | 实时更新 | WS `analysis.updated` 事件 | 分析完成后推送的事件格式？是否包含完整 AnalysisSummaryDTO？ |

---

## 7. 账号状态

| # | 问题 | 当前 mock 行为 | 需确认 |
|---|------|---------------|--------|
| 7.1 | 账号列表接口 | `GET /mock/workbench/accounts` | 真实路径？来自 cq connector 的 `/api/accounts`？ |
| 7.2 | 状态变更事件 | WS `account.status_changed` | cq connector 的状态事件格式？BFF 是否转换？ |
| 7.3 | 账号管理 UI | 不在 workbench 中 | 账号增删在 Admin SPA 还是 workbench？V1 确认 |

---

## 8. BFF 架构

| # | 问题 | 需确认 |
|---|------|--------|
| 8.1 | BFF 放在哪个 repo？ | talksub 内新增 route？独立服务？kapibala-kHub 内？ |
| 8.2 | BFF 技术栈 | Fastify？Express？与 talksub 一致？ |
| 8.3 | BFF 部署 | 与 talksub 同进程？独立容器？ |
| 8.4 | BFF 鉴权 | 用 talksub JWT 做前端登录态，内部访问 cq connector 用什么凭证？ |
| 8.5 | CORS | workbench 域名与 BFF 域名关系？同源还是跨域？ |

---

## 9. 部署

| # | 问题 | 需确认 |
|---|------|--------|
| 9.1 | workbench 域名 | `workbench.huidu.ai`？还是客户端形态决定后再定？ |
| 9.2 | 静态资源托管 | Nginx？CDN？Vercel？ |
| 9.3 | 环境变量注入 | 构建时注入还是运行时从 `/config.json` 加载？ |

---

## 10. 优先级确认

onsite 当天需要确认的最小闭环：

1. **登录** → 用 talksub JWT 登录 workbench
2. **会话列表** → BFF 聚合 talksub leads + cq accounts
3. **消息历史** → BFF 从 talksub message_raw 拉取
4. **发送消息** → BFF → cq UnifiedActionAPI
5. **实时推送** → BFF 转发 cq WS 事件

以上 5 个接口跑通 = 最小闭环。翻译、分析、账号管理可以后续补。
