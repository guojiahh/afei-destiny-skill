# 此后 · 第一阶段完成与新上下文交接

更新：2026-10-16。**第一阶段已完成并获用户确认。所有新咨询的完整报告统一使用莫比乌斯环和固定正文模板。** 下一次开发从本文进入，不再回到多图型选型或重新设计整套视觉。

## 已确定的产品基线

- 交付：一份同会话的个人 HTML；两份 Markdown 是内容底稿和页尾可选下载。
- 主图：米白纸面、深色纸带、宋体标题、朱红人物；路上 → 看见全环 → 主动跨出三个图内点击状态。
- 动效：持续行走、短淡化与二维 SVG 路径；暂停、重看、离屏停止与减少动态可用。当前没有视频或连续 3D 运镜。
- 正文：九段固定顺序，主问题优先，其他领域随后，完整依据集中在末尾原地展开；不放逐段来源跳转。
- 每次保留相同构图、交互与阅读骨架，重新编写本人的问题、事实、关系解释、条件、事例和行动。
- 莫比乌斯环是统一的困局隐喻。它不能证明每个问题都由个人心理循环造成；外部限制、未核实关系和没有适当行动均可如实表达。

## 唯一现役入口

| 要做什么 | 从哪里开始 |
|---|---|
| 理解现阶段产品与后续范围 | [产品方案](CIHOU_PRODUCT_PLAN.md) |
| 保持第一阶段的视觉与阅读约束 | [第一阶段基线](CIHOU_PHASE1_REDESIGN.md) |
| 开始或继续咨询 | [Skill](../afei-destiny-skill/SKILL.md)、[会话协议](../afei-destiny-skill/references/consultation-harness.md) |
| 生成个人报告 | [HTML 报告协议](../afei-destiny-skill/references/html-report.md) |
| 修改固定模型及校验 | [生成器](../afei-destiny-skill/scripts/generate_html_report.py)、[模型模板](../afei-destiny-skill/assets/cihou/mobius-model-template.json) |
| 修改正式页面 | [渲染器](../afei-destiny-skill/scripts/render_quiet_report.py)、[quiet 资产](../afei-destiny-skill/assets/cihou/quiet/report.html) |
| 修改两份底稿结构 | [用户模板](../afei-destiny-skill/assets/cihou/user-report-template.md)、[技术模板](../afei-destiny-skill/assets/cihou/technical-report-template.md) |
| 看匿名视觉和历史设计 | [quiet 样机](../design-demos/cihou-quiet.html)、[演示索引](../design-demos/README.md) |

正式页面源码在 Skill 内；`design-demos/cihou-quiet/` 是获认可视觉的匿名对照，不再作为个人交付入口。旧海图、stage1 多人物样机和未采用的关键帧保留为历史，不能从这些目录继续实现现役功能。

## 每次咨询的固定完成链路

1. 先 `discover`，按用户选择新建或继续单一会话；继续时 `status`、`audit`、`resume`。不得读取其他会话补齐内容。
2. 完成资料、计算、锁定、反馈、主问题深入与未来展望。一次性模式没有反馈时保持未核验。
3. 按各自来源计划，使用固定模板完成并登记 `final_report.md` 与 `technical_analysis.md`。用户底稿八节、技术底稿十一节；技术来源防火墙不变。
4. 用 `generate_html_report.py --init-model visual_report_model.json` 生成来源绑定的九章草稿。根据本次底稿逐项填写，移除草稿标记与占位符；不把模板原句冒充个人结论。
5. 生成预览，核对主图与正文、条件和反例、桌面与窄屏；再 `--register`、`--check`、Harness `audit`。
6. 最终回复突出 HTML 一个入口并打开。默认 HTML 会话只有双底稿、模型与页面有效登记后才为 `complete`，写完 Markdown 不能算完成。

新会话记录 `report_template=cihou-mobius-v1`。生成器要求统一 quiet 主图、三状态与九章 ID／顺序／布局，不合模板或草稿未填写完会拒绝。脚本负责结构、来源和确定性构建，个人解释仍由咨询代理撰写并复核，不是无须阅读底稿的一键占卜。

历史会话没有该模板字段时保持旧契约；旧渲染器仅用于复核历史登记内容，不再作为新报告选项。用户明确只要 Markdown 仍可按原协议记录选择。更新已登记内容先 `supersede`，使用新版本文件名，不覆盖旧文件。

## 开发接续

从仓库根运行：

```sh
source .venv/bin/activate
python tools/check_workspace.py --skill
```

真实咨询仅在被 Git 忽略的 `consultation_state/<session>/`。已用用户指定的完整咨询跑通此版；具体当前文件由该会话 `status` 的活动产物确定，不能凭固定文件名或修改时间猜测。真实报告、截图、出生资料与密钥不进入 Git 或可安装模板。代码测试只用合成材料。

### 可直接给新对话的提示

> 请完整阅读 AGENTS.md、docs/CIHOU_HANDOFF.md 和本次相关协议。此后第一阶段已经完成，主图固定为 quiet 莫比乌斯环，HTML 正文和两份底稿都有固定模板。保留已确认视觉与交互，在这条正式生成链路上继续开发。先核对当前代码、Git 状态和第二阶段范围，不重开多图型设计，不把真实咨询复制到公共样例。

新开完整咨询时：

> 请按当前 Skill 新开一次由我逐轮反馈的咨询，最后生成固定莫比乌斯环版个人 HTML。先完成本次两份底稿，再初始化、填写、校验并登记个人模型与 HTML；主图文字、事例与行动必须来自本次内容。

## 已验收与下一阶段

第一阶段验收范围是用户认可的本地体验：完整个人内容、三态交互、持续行走、连续阅读、依据展开、离线交付和来源登记；桌面与 320／390px 浏览器视口已检查。独立真人理解测试、实体手机接收与打开体验尚未完成，不能写成验证过普遍效果。

第二阶段尚未在本轮启动。候选重点是：真实手机交付、受访问控制的私人阅读副本、回访纠正与版本对照、单独脱敏分享图。账号、云端存储、私有托管、跨设备同步及完整在线咨询均未实现。`127.0.0.1` 仅是临时本机预览地址，交付入口应链接实际 HTML 文件。

工作区按现役与历史索引整理；历史设计、评测、分支、缓存和发布包未作破坏性清理。Git 提交是本地版本记录，不代表推送、发布或上线。
