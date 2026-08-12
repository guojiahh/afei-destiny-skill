# 咨询输出路由

输出路由只决定“用哪些已经完成的活动产物、以什么形式交付”，不得重新推理、改变置信度或把失效结论捞回来。HTML 生成器暂不实现；先保证上游内容完整。

## 路由表

| 用户意图 | `--intent` | 输出作用 |
|---|---|---|
| 继续当前一轮 | `guided_turn` | 选择当前阶段所需的活动产物，直接对话 |
| 回答一个聚焦问题 | `focused_answer` | 使用盘面锁和当前主题产物 |
| 查看技术依据 | `technical_audit` | 只输出盘面事实、锁定判断和固定反馈标签；排除传记与表达偏好 |
| 结束时给总结 | `consultation_summary` | 汇总稳定判断、修正轨迹、主题、窗口和边界 |
| 准备最终报告内容 | `report_source` | 形成可供未来 HTML 生成器消费的结构化 Markdown 来源计划 |
| 直接生成 HTML | `html_report` | 当前明确拒绝，并提示先完成 `report_source` |

运行：

```powershell
python scripts/consultation_output_router.py `
  --session-dir consultation_state `
  --intent consultation_summary `
  --output output_plan.json `
  --register
```

路由器只选择 `active` 产物，输出每个来源的文件路径、哈希和来源类别。若缺少该输出所需的盘面锁、主题分析或报告章节，会直接失败，不用空洞套话补齐。

## 呈现纪律

- 技术审计、客户总结和未来 HTML 是三种呈现层，不是三个重新推理的机会。
- 客户总结可以减少术语、改善节奏，但必须保留主要反证、反馈修正和不确定项。
- 用户说“结束”“总结一下”时，路由到 `consultation_summary`；不要因为还没做 HTML 而阻止正常收束。
- `report_source` 准备的是上游内容，不包含网页样式、封面或动画。
- 未来 HTML 生成器只能消费已登记的 `report_source` 计划及其活动产物，不能扫描目录后自行拼接旧文件。

## 最终内容完整度

进入 `report_ready` 前至少确认：

1. 排盘口径和盘面锁仍为活动状态；
2. 最稳定判断与被否定判断都已保留；
3. 用户反馈没有变成独立盘面证据；
4. 当前主题、未来窗口和最大不确定项已经形成；
5. 输出计划中没有 `stale`、`superseded` 或 Benchmark 产物。

只有这些内容稳定后，HTML 架构才有明确、可信的输入边界。
