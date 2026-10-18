# 此后：固定莫比乌斯环 HTML 交付

完整咨询默认交付一份同会话的 `final_report.html`。**所有新报告使用 `cihou-mobius-v1` 模板：quiet 莫比乌斯主图、路上／全环／跨出的三态语义、九章连续正文。** 两份 Markdown 是有来源的内容底稿与页尾可选下载，不能以写完两份长文代替 HTML 交付。用户明确只要 Markdown 时沿原协议记录选择。

## 固定与个性化

固定的是视觉隐喻、几何、按住拉远与主动跨出的交互、字体色彩、章节职责与排列。每次重新写的是问题、过去与现在、关系解释、事例、反例、行动条件、未来、其他领域和反馈修正。

环不构成心理因果证据。即使问题主要由资源、制度、他人或环境限制形成，仍使用同一视觉母题，在短句与正文中说清外部条件。信息不足就用 `unknown` 或待核对假设，可以不连边；不能因为图是环就发明经历或回连。最后一态表示可控的尝试、观察、求助或暂缓，不表示已经成功、获得他人回应或完成现实行动。

不要从匿名演示或别人的咨询复制文案。共享美术和模板，不共享人生结论。

## 每次完成流程

沿用现有资料、计算、锁定、反馈、深入与未来协议。报告授权已存在时直接完成，不额外询问是否要 HTML。`report_ready` 只表示开始准备交付，默认 HTML 会话须有活动双底稿、个人模型和 HTML 才为 `complete`。

1. 分别运行 `report_source` 和 `technical_report_source`，按 [用户八节模板](../assets/cihou/user-report-template.md)与[技术十一节模板](../assets/cihou/technical-report-template.md)写当前底稿。保留精确二级标题及顺序；填完并移除占位符和写作注释，再校验和登记。
2. **完整阅读两份活动底稿**，明确一个主问题、已有事实、当前理解、可尝试的介入、关键反例与未知。技术来源防火墙不变。
3. 运行 `--init-model` 生成本次来源绑定草稿。它自动填入会话 ID、双报告 ID/hash 和固定九章骨架，不自动编造分析。
4. 填写所有 `__CIHOU_FILL__` 字段，调整节点和引用，保持九章契约；复核后将 `draft` 设为 `false` 或删除该字段。不能只删除占位符留下空文。
5. 生成预览，检查语义、桌面与窄屏、按住／松开、揭环后的跨出、暂停／重看／减少动态、正文完整度和依据展开。修正使用新的预览文件名，保留旧版本。
6. 用 `--register` 生成并登记最终页面，再 `--check` 与 Harness `audit`。最终回复只突出 HTML 一个入口并打开，底稿在页尾按需下载。

从仓库根目录运行，`SESSION` 是 Harness 返回、用户选定的独立咨询目录：

```sh
# 双底稿已按各自来源计划完成并登记后
python afei-destiny-skill/scripts/generate_html_report.py --session-dir "$SESSION" --describe-sources
python afei-destiny-skill/scripts/generate_html_report.py --session-dir "$SESSION" --init-model visual_report_model.json
# 代理阅读全文、填写模型并复核；草稿不能跳过这一步直接生成
python afei-destiny-skill/scripts/generate_html_report.py --session-dir "$SESSION" --model visual_report_model.json --output preview.html
python afei-destiny-skill/scripts/generate_html_report.py --session-dir "$SESSION" --model visual_report_model.json --output final_report.html --register
python afei-destiny-skill/scripts/generate_html_report.py --session-dir "$SESSION" --model visual_report_model.json --output final_report.html --check
python afei-destiny-skill/scripts/consultation_harness.py audit --session-dir "$SESSION"
```

`--init-model`、`--model` 与 `--output` 相对路径均相对于该会话，不能越界。已有文件不覆盖，更新时使用版本文件名。`--register` 同时登记模型及 `<output-stem>_source_plan.json`；`--check` 不写文件。内容结构校验不能证明解释正确，仍需逐段核对原意、限制与反例。

## 模型契约（schema_version 1）

结构模板：[mobius-model-template.json](../assets/cihou/mobius-model-template.json)。它是不可直接交付的草稿，不含真实案例。模型只保存到当前会话，不能放进 Skill、公开演示或测试 fixture。

| 字段 | 要求 |
|---|---|
| `template_id` | 新报告固定 `cihou-mobius-v1` |
| `draft` | 初始化为 `true`；完整填写后设 `false` 或删除 |
| `session_id` | 当前会话身份 |
| `sources.user` / `sources.technical` | 当前双报告各自的 `artifact_id`、`sha256` |
| `title`、`subtitle`、`closing` | 个人标题、主问题背景与收束，非空且不保证结果 |
| `diagram` | 固定 `type="loop"`，个人节点、可选关系与讲解顺序 |
| `presentation` | 固定 `style="quiet-v1"`，恰好三个 `hero_states` |
| `chapters` | 下面九章 ID、顺序、布局和覆盖映射固定 |
| `technical_intro`、`technical_cards` | 传统框架与现实的关系、计算口径、反证与边界摘要 |
| `limits` | 本次未知与结论范围 |

新会话的 `report_template=cihou-mobius-v1` 由 Harness 初始化，不能通过省略模型中的模板身份退回旧版。所有占位符必须填写；只有模板标题和空白正文的文件不能完成交付。

### 个人关系与三态

- `nodes` 为 2–12 个重点，ID 唯一且格式为小写字母开头的字母、数字、下划线或连字符；`label` 不超过 14 字，另含 `title`、`text`、`refs`。
- `kind` 是 `fact`、`hypothesis`、`action`、`condition`、`unknown`。事实和假设分开，不把传统推断写成确认经历。
- 每条 `edge` 含 `from`、`to`、`kind`、`refs`；类别为材料联系 `known`、待核对理解 `hypothesis`、有前提的 `conditional`。没有证据可以是空数组。
- `tour` 是有效节点 ID 的非重复序列，不能自动选择外部回应 `condition`。quiet 的画面保留路上、全环、跨出三个语义状态；个人解释由三个 `hero_states` 提供给辅助技术和无脚本阅读。
- 每个 `hero_state` 含 `lines`（恰好两行非空短句，每行上限 18 字）、`description`、`hint`、`label`、`node_id`、`refs`。标题和解释都来自当前报告；上限不是建议把字写满。首屏不显示个人大标题、品牌、报告名称或日期；这些字段保留在来源绑定模型、辅助说明与无脚本三态摘要中，不能因为画面不显示就填入通用句代替本人内容。
- 三态依次是路上、全环、跨出。不得指向 `condition` 节点，第三态必须指向 `action`；必要时行动是继续了解、争取支持或暂缓，而非替用户保证结果。
- 主图采用用户选定的 V8 绘本基线（`painted-v8`）：固定原画、分件纸偶与 2.5D 运镜，不按个体随机生成形状。人物沿路持续迈步；按住画面、鼠标或空格／回车让镜头连续拉远，松开保留进度。看见全环并停顿后，用户点击“再往前一步”才进入跨出，随后可阅读或重看；顶部始终可直接阅读。减少动态模式改为点击查看静态状态。画面不表示外部回应或现实行动已发生。

`refs` 如 `user:2`、`technical:1`，来自双底稿二级标题顺序，必须以来源索引为准。引用不代表置信度分数，有来源的两节点也不自动具备因果关系。

### 九章正文模板

| ID | 固定布局 | 职责 | 固定 `covers` |
|---|---|---|---|
| `focus` | `story` | 主问题、来处、处境与需要 | `user:1`, `user:2` |
| `pattern` | `path` | 可能的持续机制、已知与未知 | 空 |
| `scenes` | `story` | 具体事例、条件式场景与反例 | 空 |
| `experiment` | `path` | 一次有限尝试、条件与观察证据 | `user:5` |
| `choices` | `topics` | 可选路径、成本与外部限制 | 空 |
| `future` | `timeline` | 未来窗口与观察，区分现实实验 | `user:4` |
| `panorama` | `topics` | 八领域分析及未展开部分 | `user:3` |
| `calibration` | `feedback` | 原判断、反馈、保留与撤回 | `user:6` |
| `boundaries` | `closing` | 置信边界、缺口与下一步 | `user:7`, `user:8` |

每章含 `id`、`kicker`、`title`、`lead`、`layout`、`cards`、`covers`。章节职责固定，读者看到的标题、卡片数量、文字按本次调整。每个 card 含非空 `title`、`text`、有效 `refs`；可补 `eyebrow`（短眉题）、`items`（短文本列表）、`counterexample`（反例）。`technical_cards` 使用同样卡片形式。

`covers` 指内容归属，每个用户底稿章节恰好覆盖一次；空覆盖章节仍须在卡片上引用支持其内容的来源。完整用户八节及技术十一节原文全部集中在文末单层展开，两份原始 Markdown 原样内嵌下载。

没有盲测或反馈时保留第八章，明确未进行／未校准。八领域资料不足时直说未知，不能为固定篇章补写故事。关键限定不能只藏进文末原文。

## 历史兼容与更新

没有 `report_template` 的旧会话保留旧契约；没有 `template_id` 的历史模型仍可按原渲染器或旧 quiet 呈现复核，不批量重写已登记页面。`threshold`、`chain`、`confluence`、`sparse` 等旧类型只供历史兼容，不是新报告候选。旧会话需要新模板时使用 `--init-model` 新建模型，显式 `template_id` 同样触发完整新契约。

历史无 `delivery_format` 字段的会话按旧 Markdown 交付理解。用户要补 HTML 时先 `status`、`audit`、`resume`，按需执行：

```sh
python afei-destiny-skill/scripts/consultation_harness.py set-delivery --session-dir "$SESSION" --format html --reason "用户要求 HTML 主交付"
```

用户明确只要 Markdown 可用 `--format markdown` 并记录原因。不能为了绕过失败静默改格式。新模板与历史底稿标题不一致时，按来源规范形成新版本并登记，再初始化模型，不能覆盖旧文件。

`visual_report_model` 直接依赖当前两份报告；`html_report` 依赖双报告、当前模型和来源计划。登记时重建比对，拒绝任意 HTML 冒充交付。更新双底稿或模型先 `supersede`，下游自动失效，再以新文件名生成。离线副本不能远程撤回，“失效”指会话内当前有效产物。

## 验收与范围

每次检查：一个主问题、三态含义与正文一致、事实和假设分开、具体事例与反例保留、未来与外部条件完整、八领域含未知、反馈未被美化；桌面和手机窄屏可读，表格仅内部横滑。

页面用内嵌 PNG、CSS、Three.js（含 MIT 全文）、人物关节模块、场景代码和 JSON 元数据构成单份离线 HTML。所选版本需要的材质、人物分件与关节坐标全部内联；花石可以是内嵌原画，也可以由固定场景几何构成，原生几何版本不再携带旧花石图片。运行时不请求外部素材或元数据。`render_quiet_report.py` 中的 `HERO_BUNDLE` 集中选择美术与引擎版本；更换人物或场景不改变 `quiet-v1`、三个 `hero_states` 或九章契约。来源清单记录每项素材与代码的 SHA-256，当前生成的原创人物不能沿用历史 CC0 人物署名。

框架与咨询内容分开维护：主图、人物动作、交互、排版和阅读组件由固定源码负责；每份咨询在独立会话内初始化并填写来源绑定的内容模型，再由生成器装入框架。不得为每份报告另写页面、重画主图或把私人文字写进共享场景代码。主图的个人含义通过三个 `hero_states` 的辅助描述保留，九章正文与底稿引用仍由同一模型驱动。

WebGL 可用时用 V8 原画、关节纸偶与连续镜头呈现 2.5D 画面；不可用时提供静态说明及完整正文入口。原版揭示与离环时长分别为 10.5 秒、9.5 秒，保留拾花、投种与回望节奏。键盘、暂停、重看、离屏／后台停止、减少动态及无脚本正文均保留。设计打磨状态与独立评审结果以本轮实际记录为准，接入代码不代表视觉已验收。视频、私有在线托管、手机传输服务、账号与回访同步尚未实现。手机视口验收不等于实体手机交付验证。

生成失败保留有效底稿和未完成状态，说明具体工程限制。真实报告只能在选定本地会话内生成和预览，不能复制到公开演示、Git 或可分发 Skill。回归测试一律使用合成材料。
