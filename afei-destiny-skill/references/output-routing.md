# 咨询输出路由

输出路由只决定“用哪些已经完成的活动产物、以什么形式交付”，不得改变置信度或把失效结论捞回来。当前正式终稿是面向用户的 `final_report.md` 与独立的 `technical_analysis.md`；HTML 生成器暂不实现。

## 路由表

| 用户意图 | `--intent` | 输出作用 |
|---|---|---|
| 继续当前一轮 | `guided_turn` | 选择当前阶段所需的活动产物，直接对话 |
| 回答一个聚焦问题 | `focused_answer` | 使用盘面锁和当前主题产物 |
| 查看技术依据 | `technical_audit` | 只输出盘面事实、锁定判断和固定反馈标签；排除传记与表达偏好 |
| 结束时给总结 | `consultation_summary` | 汇总稳定判断、修正轨迹、主题、窗口和边界 |
| 准备完整 Markdown | `report_source` | 选择生成 `final_report.md` 所需的全部活动来源 |
| 准备独立技术文档 | `technical_report_source` | 选择生成 `technical_analysis.md` 的盘面与规则来源，排除传记和关注偏好 |
| 直接生成 HTML | `html_report` | 当前明确拒绝，并提示先完成 `final_report.md` |

运行：

```powershell
python scripts/consultation_output_router.py `
  --session-dir consultation_state/<chosen-session> `
  --intent consultation_summary `
  --output output_plan.json `
  --register
```

路由器只选择 `active` 产物，输出每个来源的文件路径、哈希和来源类别。`report_source` 同时包含入口关注方向、输入、盘面、盲测前完整审计、盲测清单、反馈、最小咨询上下文、主问题、未来与既有报告章节。`technical_report_source` 使用盘面事实、盘面锁、盲测前审计、锁定清单、固定反馈与不含传记的技术章节。若缺少必需产物，会直接失败，不用空洞套话补齐。

## 呈现纪律

- 技术审计、客户短总结、用户报告、独立技术报告和未来 HTML 是不同呈现层，不是重新改写历史的机会。
- 客户总结可以减少术语、改善节奏，但必须保留主要反证、反馈修正和不确定项。
- 用户说“结束”“总结一下”时，路由到 `consultation_summary`；不要因为还没做 HTML 而阻止正常收束。
- 用户同意生成后，读取 `markdown-report.md` 和 `technical-report.md`：分别用 `report_source`、`technical_report_source` 写入当前 `<session-dir>/final_report.md`、`<session-dir>/technical_analysis.md`。用户报告先运行 `validate_final_report.py`；通过后再登记为 `markdown_report`、`technical_report`。两个来源计划只能消费同一 `session_id` 的活动产物。
- 未来 HTML 生成器只能消费两份已登记报告及其活动来源，不能扫描目录自行拼接旧文件。

## 最终内容完整度

进入 `report_ready` 前至少确认：

1. 排盘口径和盘面锁仍为活动状态；
2. 最稳定判断与被否定判断都已保留；
3. 用户反馈没有变成独立盘面证据；
4. 当前主题已经形成；若用户没问未来，也能从活动命盘形成明确标注为未校准的未来展望；
5. 输出计划中没有 `stale`、`superseded` 或 Benchmark 产物。

只有这些内容稳定后才生成两份 Markdown；HTML 等用户后续提供模板再实现。
