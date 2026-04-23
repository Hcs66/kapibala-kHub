请先详细阅读需求文档（ai_input/resources/requirment.md），充分了解后我再给你下一步工作

---

根据需求文档，生成产品规划与技术选型报告：

- 核心包括：相关产品参考、调研开源 IM 框架、评估技术栈、需求文档中的 `研究课题清单中的R1-R12问题`
- 可根据需求补充其它细节和建议
- 在docs下生成

---

继续补充：

- 将各个section的结论或推荐方案聚合到一个section，放在报告开头作为 `TLDR`

---

继续补充产品规划与技术选型报告(docs/v1/kHub_tdr_v1.md)：

- 将 `3. 竞品与产品参考` 部分概括总结加入 `TLDR — 全部决策速览`

---
根据产品规划与技术选型报告(docs/v1/kHub_tdr_v1.md)报告，生成kHub_plan_v1.md：

## 说明
- 确认基于Matrix来实现IM 框架
- 翻译确认基于LLM实现，优先考虑翻译的语言是巴西葡萄牙语和越南语
- 单独一个section，做一个check list，列出业务、技术等方面需要与团队确认的部分

---
继续完善kHub_plan_v1(docs/v1/kHub_plan_v1.md)：

## 调整
- 再仔细阅读需求文档：（ai_input/resources/requirment.md），看看有没有遗漏的
- 不需要列出针对kHub_tdr_v1的变动，直接输出结论
- 依然基于Matrix作为底座 但需要在check list中确认, 理由：
    - Matrix 的联邦协议过重（Python + 复杂的 Federation），我们只需要单向数据收拢，不需要联邦能力
    - AGPL-3.0 许可证对商业中台不友好
- 翻译全部使用LLM（首选google的gemini和claude 的haiku），
- TypeScript 运行时加入node作为选择（列出基于bun和node的优劣），在check list增加需要确认运行时
- Checklist加入更多业务方面需要确认的内容，再次参考需求文档：（ai_input/resources/requirment.md）
- 计划时间节点尽量匹配需求文档中的`13. 工作节奏建议`

--