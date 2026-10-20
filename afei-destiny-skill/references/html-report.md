# 此后：三态风景与九章 HTML 交付

完整咨询默认交付一份同会话的 `final_report.html`。**所有新报告使用 `cihou-mobius-v1` 模板：当前由 V21 Wayfinder 原站引擎与资源承载固定路线闭环主图、现在／之前／此后三景、完整解读第四步和九章正文。** 两份 Markdown 是有来源的内容底稿与页尾可选下载，不能以写完两份长文代替 HTML 交付。用户明确只要 Markdown 时沿原协议记录选择。

## 固定与个性化

固定的是按住沿固定路线行走、松开停下、首景重复六节点循环、主动切换视角与比较走法的交互、原站风景资源、章节职责与排列。每次重新写的是问题、过去与现在、关系解释、事例、反例、行动条件、未来、其他领域和反馈修正。

环不构成心理因果证据。即使问题主要由资源、制度、他人或环境限制形成，仍使用同一视觉母题，在短句与正文中说清外部条件。信息不足就用 `unknown` 或待核对假设，可以不连边；不能因为图是环就发明经历或回连。最后一态表示可控的尝试、观察、求助或暂缓，不表示已经成功、获得他人回应或完成现实行动。

每份新报告必须按[闭环叙事协议](loop-narrative.md)填写 `presentation.loop_story`。不要从匿名演示或别人的咨询复制文案。共享美术和模板，不共享人生结论。

## 每次完成流程

沿用现有资料、计算、锁定、反馈、深入与未来协议。报告授权已存在时直接完成，不额外询问是否要 HTML。`report_ready` 只表示开始准备交付，默认 HTML 会话须有活动双底稿、个人模型和 HTML 才为 `complete`。

1. 分别运行 `report_source` 和 `technical_report_source`，按 [用户八节模板](../assets/cihou/user-report-template.md)与[技术十一节模板](../assets/cihou/technical-report-template.md)写当前底稿。保留精确二级标题及顺序；填完并移除占位符和写作注释，再校验和登记。
2. **完整阅读两份活动底稿**，明确一个主问题、已有事实、当前理解、可尝试的介入、关键反例与未知。技术来源防火墙不变。
3. 运行 `--init-model` 生成本次来源绑定草稿。它自动填入会话 ID、双报告 ID/hash 和固定九章骨架，不自动编造分析。
4. 填写所有 `__CIHOU_FILL__` 字段，调整节点和引用，保持九章契约；复核后将 `draft` 设为 `false` 或删除该字段。不能只删除占位符留下空文。
5. 生成预览，检查语义、桌面与窄屏、按住固定路线前进／松开停下、六节点次序与首景持续循环、主动切场、一次点击后的叶片换场／自动有限体验／结果文字、暂停／重看／减少动态、正文完整度和依据展开。修正使用新的预览文件名，保留旧版本。
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
| `presentation` | 固定 `style="quiet-v1"`；新报告使用 `hero_runtime="wayfinder-v21"`，恰好三个 `hero_states`；可选三个有来源的 `hero_choices` |
| `presentation.loop_story` | 新模板必填的六节点循环与现在／之前／此后说明，结构和来源见下文 |
| `chapters` | 下面九章 ID、顺序、布局和覆盖映射固定 |
| `technical_intro`、`technical_cards` | 传统框架与现实的关系、计算口径、反证与边界摘要 |
| `limits` | 本次未知与结论范围 |

新会话的 `report_template=cihou-mobius-v1` 由 Harness 初始化，不能通过省略模型中的模板身份退回旧版。所有占位符必须填写；只有模板标题和空白正文的文件不能完成交付。

### 个人关系与三态

- `nodes` 为 2–12 个重点，ID 唯一且格式为小写字母开头的字母、数字、下划线或连字符；`label` 不超过 14 字，另含 `title`、`text`、`refs`。
- `kind` 是 `fact`、`hypothesis`、`action`、`condition`、`unknown`。事实和假设分开，不把传统推断写成确认经历。
- 每条 `edge` 含 `from`、`to`、`kind`、`refs`；类别为材料联系 `known`、待核对理解 `hypothesis`、有前提的 `conditional`。没有证据可以是空数组。
- `tour` 是有效节点 ID 的非重复序列，不能自动选择外部回应 `condition`。quiet 的画面保留路上、全环、选择／尝试三个语义状态；个人解释由三个 `hero_states` 同时提供给可见字幕、辅助技术和无脚本阅读。
- 每个 `hero_state` 含 `lines`（恰好两行非空短句，每行上限 18 字）、`description`、`hint`、`label`、`node_id`、`refs`。两行短句显示在场景中，一段简短解释由“读这一句”按需展开，均来自当前报告；上限不是建议把字写满。首屏不显示个人报告大标题、名称或日期。第一态呈现当前循环与短期作用和后续代价，第二态讲已知往事或可能的学习路径，第三态说明有条件的尝试。形成过程自然写成“你可能曾经……”，不靠虚构人物或童年事件补足细节。
- 每态可补 `anchors`：恰好三个非空短字符串，每条上限80字，继承该态的 `refs`。它们可用于第二、三态的原生文字投影，宜写成易读的短句；第一态以 `loop_story.nodes` 的六句为准。不能用环境物件或漂浮文字补出无来源经历。
- V21 三态按“现在／之前／此后”排列，`diagram.tour` 与 `hero_states` 对应当前机制、经历与行动；第一态持续重复，不因圈数或时间自动切到下一态。不得指向 `condition` 节点，第三态必须指向 `action`；必要时行动是继续了解、争取支持或暂缓，而非替用户保证结果。
- 当前主图运行时为 `wayfinder-v21`：复用 Wayfinder 原版角色、地表、植被、氛围、后处理、音频和叶片视频，以独立适配器加入固定闭合路线与叙事。现在与之前可用鼠标／触摸按住或按住空格键前进，松开停下，指针位置不决定路线或方向。浮字连续避让人物并平滑回位，旧句完成淡出再释放位置修正；首景按顺序显示六句并重复；顶部可主动切换“现在／之前／此后”，也可随时阅读同页九章与依据。减少动态、引擎失败与无脚本情况下保留可读文本。V8、V15、V16、V17、V18、V19、V20 与已交付的自包含历史 HTML 保留。
- V21 用明确的四步引导串联阅读：现在按住看六节点循环，之前按住看三个来源绑定锚点，此后点击选择获得一张反馈卡，再主动进入完整解读。前两景记录本景已出现的节点；看过全部短句后提示可去下一步，不自动切场、不锁导航。进度仅用于本页引导，不写入咨询事实或替代实际理解。
- `hero_choices` 可省略或为空；需要比较不同条件时，填写恰好三项，各含唯一小写 `id`、`title`（上限32字）、`condition`（上限80字）、`text`（上限400字）、`refs` 和 `feedback`。每项来自本次双底稿。V20/V21 的 `feedback` 含 `mode`、恰好三条非空 `lines`（每条最多32字）与非空 `result`，继承所在 choice 的 `refs`；三项 `mode` 必须为 `attempt`（向外尝试）、`prepare`（有限准备）、`sustain`（有支持的持续）各一项。共享模板不预置求职故事。
- 在“此后”中首次点击尚未收集的一项，即经过原叶片换场，自动完成对应的有限行动和效果，最后收下诗卡并停在结果文字；不需要第二次确认、第二轮选择或长按。三条体验分别使用原站的短线与诗卡、有限收集与母树变化、随行纸片与短时花开，不把动画当作现实已行动、条件已补齐或外部结果已出现。持续需要可承受的行动、休息和支持，不能写成时间必然解决困难。减少动态或引擎失败时直接展示同一份短句与结果；不填写三项时，第三态保留说明与正文入口。V20 继续兼容相同的反馈字段，更早运行时可省略 feedback 并按选项顺序兼容；历史自包含 HTML 不重写。

V21 在本页保留已收集的卡片，显示 `x / 3` 与待收集、正在体验、已收集等明确状态。点击已收集的卡直接阅读其短句和结果，不重新调用播放；只有明确点击“重播这段体验”才重播。切换章节或从头体验保留收卡进度，刷新新页面后重置，不写入咨询事实或持久化账户状态。回看已得卡会停止当前体验，未完成的卡不会因此被收下。

卡片停留后显示主入口“带着这一步，进入完整解读 →”；读者无需收齐三张卡，也可比较其他选择或从顶部随时阅读。完整解读保留当前所选卡摘要与九章顺序目录，读者从目录进入想读的章节。正文使用 `chapter-章节ID` 锚点，目录链接只是阅读定位，不改变章节内容或来源。`reading_chapters` 与目录由渲染器从同一模型派生，不新增个人模型字段。

`refs` 如 `user:2`、`technical:1`，来自双底稿二级标题顺序，必须以来源索引为准。引用不代表置信度分数，有来源的两节点也不自动具备因果关系。

### 必填的闭环叙事

新完整模板的 `presentation.loop_story` 必填，不能用旧运行时选择绕过。六项 `nodes` 固定按 `trigger/meaning/response/relief/cost/return` 排列，分别表示触发、赋予的含义、应对、即时作用、后续代价与再次回到。每项含 `id`、非空 `text`（最多24字）、`detail`（最多300字）和非空有效 `refs`。

`present` 与 `future` 必填，`past` 可省略；每段为 `{text, refs}`，非空 `text` 最多600字。现在解释当前过程与限制；过去既可承接已谈过的经历，也可由当前模式推演一种可能的学习路径；未来写条件式实验、完成线、观察与支持。主叙事按 [client-voice.md](client-voice.md) 自然使用“你可能……”，不反复显示“假设、无依据、待核对”等编写说明。模型、底稿与技术区保留推演起点和证据类别；不将可能来处升级为确认历史。写作顺序见[闭环叙事协议](loop-narrative.md)。

“读这一句”在第一视角只显示当前节点的 `detail`，不把整段 `present.text` 和当前解释逐次拼接；全环说明留在完整阅读中。第二、三视角显示对应 `past/future.text`。浮字和短卡片用日常语言讲含义，引用状态与集中校验放在阅读的依据区。

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

`wayfinder-v18`、`wayfinder-v17`、`wayfinder-v16` 与 `paper-v15` 仍接受历史模型；没有 `loop_story` 的 V16 历史模型保留旧三态含义，不批量升级。已交付的自包含 HTML 文件不会随代码更新而变化。新完整模板必须填写 `loop_story`，不能把历史兼容入口用于绕过新内容合同。

没有 `report_template` 的旧会话保留旧契约；没有 `template_id` 的历史模型仍可按原渲染器或旧 quiet 呈现复核，不批量重写已登记页面。`threshold`、`chain`、`confluence`、`sparse` 等旧类型只供历史兼容，不是新报告候选。旧会话需要新模板时使用 `--init-model` 新建模型，显式 `template_id` 同样触发完整新契约。

历史无 `delivery_format` 字段的会话按旧 Markdown 交付理解。用户要补 HTML 时先 `status`、`audit`、`resume`，按需执行：

```sh
python afei-destiny-skill/scripts/consultation_harness.py set-delivery --session-dir "$SESSION" --format html --reason "用户要求 HTML 主交付"
```

用户明确只要 Markdown 可用 `--format markdown` 并记录原因。不能为了绕过失败静默改格式。新模板与历史底稿标题不一致时，按来源规范形成新版本并登记，再初始化模型，不能覆盖旧文件。

`visual_report_model` 直接依赖当前两份报告；`html_report` 依赖双报告、当前模型和来源计划。登记时重建比对，拒绝任意 HTML 冒充交付。更新双底稿或模型先 `supersede`，下游自动失效，再以新文件名生成。离线副本不能远程撤回，“失效”指会话内当前有效产物。

## 验收与范围

每次检查：一个主问题、三态含义与正文一致、事实和假设分开、具体事例与反例保留、未来与外部条件完整、八领域含未知、反馈未被美化；桌面和手机窄屏可读，表格仅内部横滑。

页面由 `render_quiet_report.py` 按 `presentation.hero_runtime` 分派；当前默认使用 `render_wayfinder_report.py`，从 `assets/cihou/quiet/wayfinder/` 读取原站运行时、CSS、适配层与素材。生成前逐项核验 `asset-manifest.json` 的 SHA-256，再将图片、字体、GLTF／GLB、音频、MP4 和代码内嵌到单份 HTML，运行时转换为本地 Blob URL；不要求另带资源目录或联网读取素材。V15 程序绘画兼容分支使用 `hero_runtime="paper-v15"` 与 `HERO_BUNDLE`；它不改变三态和九章内容契约。原站资源来源与权属见[来源说明](../assets/cihou/quiet/wayfinder/PROVENANCE.md)，不能把原版角色和美术称为此后原创，也不能沿用旧 CC0 或单一 Three.js MIT 声明代替原作权属。

框架与咨询内容分开维护：主图、人物动作、交互、排版和阅读组件由固定源码负责；每份咨询在独立会话内初始化并填写来源绑定的内容模型，再由生成器装入框架。不得为每份报告另写页面、重画主图或把私人文字写进共享场景代码。主图的个人含义通过 `loop_story` 的六节点与三段说明、三个 `hero_states` 的短句、可选 `anchors` 和 `hero_choices` 呈现，九章正文与底稿引用仍由同一模型驱动。

V21 保留原站的绘画世界和视听表现，固定路线、按住前进、首景六节点重复与主动分场由适配层控制；原作的自由采诗流程不作为个人报告的任务门槛。一次点击触发有限的视觉体验与结果文字，结果文案保留条件和可观察内容，不声称实际求职或生活结果已经发生。键盘、暂停、声音、重走、后台停止、减少动态、失败后的可读解释与无脚本正文由当前模板维护。验收须区分代码接入、单文件重建、浏览器实测和独立审美评审，不把其中一项当作全部通过。私有在线托管、手机传输服务、账号与回访同步尚未实现；手机视口验收不等于实体手机交付验证。

生成失败保留有效底稿和未完成状态，说明具体工程限制。真实报告只能在选定本地会话内生成和预览，不能复制到公开演示、Git 或可分发 Skill。回归测试一律使用合成材料。
