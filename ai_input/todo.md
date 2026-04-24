继续完善kHub_plan_v1(docs/v1/kHub_plan_v1.md)：

## 调整
- 删除与tdr方案的对比部分，保留plan的内容即可
- 直接使用 Matrix/Synapse 作为底座，但需要说明其许可证问题和协议过重问题，作为checklist需要确认部分
- 使用nodejs作为运行时，bun作为B方案（列出其优劣），作为checklist需要确认部分

---

继续完善kHub_plan_v1(docs/v1/kHub_plan_v1.md)：

- 根据官网关于matrix bridge的说明，简单总结两种type的异同加入到`3.1 IM 框架策略`，并作为checklist需要确认部分：
    - https://docs.mau.fi/bridges/general/using-bridges.html

继续完善kHub_plan_v1(docs/v1/kHub_plan_v1.md)：

- 加上一句话描述Client销售工作台/管理端的功能（`5. V1 交付范围`中的 `5.1 包含`）
- 每个功能再继续展开用一句话说明


继续完善kHub_plan_v1(docs/v1/kHub_plan_v1.md)：

- 适当connector的设计说明

---

继续完善kHub_plan_v1(docs/v1/kHub_plan_v1.md)：

- 加入客户画像模块(可以放在V2)：
 - 支持Ai客户画像推断
 - 支持根据对话自动更新客户画像
 - 支持根据客户画像推荐自有的服务/产品

 ---

 继续完善kHub_plan_v1(docs/v1/kHub_plan_v1.md)：

 - 补充关于Tuwunel的实现，若使用其作为 matrix homeserver，其存储引擎为rocksdb如何与Im core的PostgreSQL同步