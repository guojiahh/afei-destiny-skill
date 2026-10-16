# 此后：默认 HTML 交付

完整咨询的主要交付是同一会话内的 `final_report.html`。用户打开一个页面即可读懂重点、探索主图、下读完整图文和按需展开依据。`final_report.md` 与 `technical_analysis.md` 保留为有来源的内容底稿和可选下载，不再把两个长文链接作为默认最终回复。用户明确只要 Markdown 时才改变交付格式。

## 完成流程

沿用资料、计算、盲测锁定、反馈、深入与未来的现有协议。报告授权已存在时直接生成，不为 HTML 再问一遍。进入 `report_ready` 仅表示可以准备交付，新会话默认 `delivery_format=html`；两份底稿、个人模型、HTML 都登记且有效后才为 `complete`。

1. 运行 `report_source`、`technical_report_source`；按各自规范写两份底稿，校验用户报告并分别登记。技术底稿的来源防火墙不变。
2. 阅读这两份活动底稿，提炼一个主问题、关键关系、可尝试的介入、条件与反例。不要从旧原型或其他会话复制个人文案。使用下面的来源索引读取当前 ID、哈希及章节编号。
3. 编写本次的 `visual_report_model.json`。模型由执行咨询的代理根据活动材料编排，脚本负责校验和绘制；不是脚本自动推断人格、因果或命理。先内容后选图，不是所有人都画循环。
4. 生成预览，检查主图含义、章节覆盖、桌面与窄屏阅读、图内点击与依据展开。修正未登记预览时使用新的输出名，保留旧版本；不要直接改已登记文件。
5. 使用 `--register` 生成并登记最终页面，再 `--check` 和 Harness `audit`。最终回复优先给 HTML 一个入口，并打开它；底稿在页末按需下载。不得只写两份 Markdown 就宣布默认交付完成。

从仓库根目录运行（`SESSION` 是 Harness 返回且用户选定的独立目录，不是集合根）：

```sh
python afei-destiny-skill/scripts/generate_html_report.py --session-dir "$SESSION" --describe-sources
python afei-destiny-skill/scripts/generate_html_report.py --session-dir "$SESSION" --model visual_report_model.json --output final_report.html --register
python afei-destiny-skill/scripts/generate_html_report.py --session-dir "$SESSION" --model visual_report_model.json --output final_report.html --check
python afei-destiny-skill/scripts/consultation_harness.py audit --session-dir "$SESSION"
```

`--model` 与 `--output` 的相对路径均相对于本次会话。生成器审核整个会话，核对源报告哈希、模型会话身份、引用、完整章节覆盖及确定性构建。`--register` 同时保存并登记本次 HTML 的来源计划（`<output-stem>_source_plan.json`）；`--check` 不写文件。来源验证不证明文字解释正确；代理仍需核对每条总结与原意、限定和反例。

### 旧会话与显式 Markdown

没有 `delivery_format` 的历史会话按旧 Markdown 交付理解，不批量改写旧会话。用户要求给某次旧咨询补 HTML 时，先 `status`、`audit`、`resume --user-choice continue`，再执行：

```sh
python afei-destiny-skill/scripts/consultation_harness.py set-delivery --session-dir "$SESSION" --format html --reason "用户要求补齐 HTML 主交付"
```

只要 Markdown 的显式请求可用 `--format markdown` 并写明原因。不能为绕过 HTML 失败静默改格式。生成失败保留有效底稿，说明具体限制；默认 HTML 会话继续显示未完成。

## 个人模型契约（schema_version 1）

模型位于会话目录，不能放入 Skill、匿名演示或测试 fixture。

| 字段 | 内容 |
|---|---|
| `session_id` | 本次会话 ID |
| `sources.user` / `sources.technical` | 各自严格包含 `artifact_id`、`sha256`；来自当前活动报告 |
| `title`、`subtitle`、`closing` | 本次标题、主问题背景与收束；短而具体，不作保证 |
| `diagram` | 图形类型、个人节点、关系和讲解顺序 |
| `chapters` | 连续阅读的图文章节与底稿覆盖映射 |
| `technical_intro`、`technical_cards` | 传统解释与现实的联系、计算口径和关键反证的短解读 |
| `limits` | 本次边界与未知，不套通用确定性结论 |

`refs` 是 `user:1`、`technical:2` 等章节引用，编号由两份 Markdown 的二级标题顺序产生，必须以 `--describe-sources` 为准。它们是内容出处，不是置信度分数。节点有出处不代表连线已经获得因果证明；每条边也须有引用与关系类别。

图形数据形状如下，示例仅说明字段，实际内容必须由本次材料重新编写：

```json
{
  "type": "threshold",
  "nodes": [
    {"id":"current","label":"当前条件","kind":"fact","title":"具体处境","text":"来自报告的解释与限制","refs":["user:2"]},
    {"id":"choice","label":"一个介入","kind":"action","title":"改变什么条件","text":"尝试需要的投入与未知","refs":["user:5"]}
  ],
  "edges": [{"from":"current","to":"choice","kind":"conditional","refs":["user:2","user:5"]}],
  "tour": ["current","choice"]
}
```

- `type`：`threshold`（完成线／门槛）、`chain`、`confluence`、`loop`、`sparse`。当前完成线有专属开门动效，其他类型用通用来源关系图；不是五套均已精修的空间主图。关系和节点由数据决定。
- `nodes`：2–12 个重点，ID 唯一，短标签不超过 14 字。`kind` 为 `fact`、`hypothesis`、`action`、`condition`、`unknown`。更多资料在详报展开，不强行塞进主图。
- `edges`：`known` 表示材料中的联系或顺序，不宣称科学因果；`hypothesis` 是待验证理解；`conditional` 保留尚未成立的条件。`sparse` 不允许补连接。
- `tour`：各节点 ID 的有限序列；自动讲解不能选择他人的条件回应。每段约 3.5 秒，点图接管，离开主图或后台暂停，减少动画时不自动播放。
- 选择 `loop` 时需确有回连依据；不能把所有准备、等待或结构性负担都解释成个人循环。信息不足时选择留白。

每个 `chapter` 包含 `kicker`、`title`、`lead`、`layout`、`cards`、`covers`。`layout` 可用 `story`、`path`、`topics`、`timeline`、`feedback`、`closing`。每个 card 包含 `title`、`text`、`refs`；`technical_cards` 使用相同 card 结构。

`covers` 指向该章承接的用户底稿章节，例如 `["user:1","user:2"]`。所有用户底稿章节必须恰好覆盖一次，完整正文随该章在页内可展开；全部技术底稿章节自动进入依据区。两份原始底稿也以离线下载形式内嵌，原始文件不被重写。

## 阅读与呈现要求

- 首屏一张可点的主图，变化与短解释同步；主图数量与热点由个人材料决定，无人物切换器。图上操作不写入现实行动状态。
- 默认下读能理解主要结论、关键反例、已谈到的人生领域、未来、取舍与反馈，不把关键限定都藏进折叠区。补充场景与详细推导可展开。
- 八领域按实际覆盖呈现；未知领域保留未知。未来现实实验与传统岁运窗口分开，时间依据沿用报告，不重新推算。
- 不用两份长文逐字平铺冒充可视化。需要重点对照时选路径、时间带、反馈前后等信息图形式；不可删去不命中或不确定项。
- CSS 为手机重新排布；键盘可点图、无脚本仍可读主图摘要和完整正文。长表格允许在表格内部横向阅读，页面不得整体横向溢出。

## 来源与更新

`visual_report_model` 直接依赖本次两份活动报告；`html_report` 直接依赖两份报告和当前模型。登记时重新构建并比对 HTML，拒绝任意 HTML 文件冒充有效交付。报告或模型被 `supersede` 后，下游 HTML 自动失效，默认 HTML 会话重新变为未完成。新版本使用新文件名，保留旧版本证据。

离线副本无法被远程撤回；“失效”指会话内有效交付选择，不能声称用户手中旧副本自动消失。分享、私有托管、跨设备草稿同步不在当前实现中。文件内有私人资料，仅在用户授权的本地会话生成与预览，不复制到公开演示或仓库。

## 验收

可安装包的回归测试覆盖默认完成门槛、历史 Markdown 兼容、来源过期和篡改、跨会话模型、缺失章节、非法连线、外部回应自动播放限制、HTML 注入与独立内容。人工还需核对语义、手机布局、点击状态、键盘、完整依据展开与下载。桌面手机视口测试不等于实体手机或真人理解测试。
