# V21 从体验到完整解读

[打开完整 HTML](final_report.html)。这是独立的合成求职演示，没有真实咨询、出生输入或真实反馈，不能换名作为个人报告。个人分析、六节点、三种反馈与九章内容沿用 [V20 历史版](../cihou-wayfinder-v20/final_report.html)，只强化导览和阅读连接。

路径是 **现在 → 之前 → 此后 → 完整解读**。现在按住看循环，之前按住回看一种做法怎样形成；实际走过本景所有短句并松开后，下一步按钮变为主按钮，导航始终自由。此后首次点待收集项会完整体验并收卡，显示 `x / 3` 与各项状态。已得卡点开直接阅读，只有明确点“重播这段体验”才重播。回看已得卡会停止当前体验，切章或从头体验仍保留本页卡片，刷新新页面后重置。

一张卡就能主动选择“带着这一步，进入完整解读 →”。阅读保留所选摘要与九章目录，不要求收齐三张卡，也可逐项收集、比较其他卡或随时直接阅读。窄屏中卡片内容独立滚动，阅读按钮始终留在操作区。

- [用户底稿](final_report.md)、[技术底稿](technical_analysis.md)
- [来源绑定模型](report-model.json)、[独立叙事数据](story-data.js)、[来源计划](source-plan.json)
- [构建脚本](build_demo.py)、[报告协议](../../afei-destiny-skill/references/html-report.md)、[原作来源说明](../../afei-destiny-skill/assets/cihou/quiet/wayfinder/PROVENANCE.md)
- [设计索引](../README.md)、[当前交接](../../docs/CIHOU_HANDOFF.md)

从仓库根目录运行：

```sh
source .venv/bin/activate
python design-demos/cihou-wayfinder-v21/build_demo.py
python design-demos/cihou-wayfinder-v21/build_demo.py --check
python tools/check_workspace.py --skill
```

`--content-only` 只构建内容与来源文件；默认生成原资源内嵌的完整 HTML。旧 V20 文件不被改写。浏览器引导、卡片到阅读、桌面与窄屏实测见 [QA 与截图](QA.md)。
