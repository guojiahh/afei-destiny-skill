# V20 匿名求职演示

[打开完整 HTML](final_report.html)。这是显式合成的设计资料，没有真实咨询、出生输入或真实反馈，不能换名作为个人报告。

此刻保持六节点循环；“可能”点击一次后自动叶片换场、完成有限体验并停在三句诗卡与结果。三项分别是材料够用时向外尝试、必要缺口的有限准备、留给时间跟坚持。持续需要可承受的小步、休息和支持；视觉结果不表示现实已经投递、补齐或获得回应。

- [用户底稿](final_report.md)、[技术底稿](technical_analysis.md)
- [来源绑定模型](report-model.json)、[独立叙事数据](story-data.js)、[来源计划](source-plan.json)
- [构建脚本](build_demo.py)、[报告协议](../../afei-destiny-skill/references/html-report.md)、[原作来源说明](../../afei-destiny-skill/assets/cihou/quiet/wayfinder/PROVENANCE.md)
- [本轮验收与截图](QA.md)
- [V19 历史演示](../cihou-wayfinder-v19/final_report.html)、[完整设计索引](../README.md)

从仓库根目录运行：

```sh
source .venv/bin/activate
python design-demos/cihou-wayfinder-v20/build_demo.py
python design-demos/cihou-wayfinder-v20/build_demo.py --check
python tools/check_workspace.py --skill
```

`--content-only` 仅构建双底稿、模型、叙事与来源计划。默认构建全部原资源内嵌的单文件 HTML；历史 V19 文件不会被改写。浏览器交互、桌面／窄屏与视觉验收以本轮实际记录为准，代码回归不代替浏览器验收。
