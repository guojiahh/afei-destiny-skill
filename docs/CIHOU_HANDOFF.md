# 此后 · V19 加载期文字定位与完整报告交接

更新：2026-10-20。当前默认 `presentation.hero_runtime="wayfinder-v19"`。本版沿用 V18 全部读者文案、可能形成路径与六节点结构，只处理首次加载时浮字定位的稳定性；原站美术、固定路线、按住前进／松开停下和此刻／来处／可能不变。

- 当前入口：[V19 完整匿名 HTML](../design-demos/cihou-wayfinder-v19/final_report.html)／[构建脚本](../design-demos/cihou-wayfinder-v19/build_demo.py)。双底稿与 V18 保持相同文字，模型与来源计划使用独立 V19 身份。
- 加载期定位修复针对适配层校正与原生文字投影缓存的衔接，使用浏览器序列化后的 transform 识别自己写入的坐标，避免校正值被反复当成新的原生基准。具体行为以当前适配器和本轮验证为准。
- 内容继续遵循[闭环叙事协议](../afei-destiny-skill/references/loop-narrative.md)和 [HTML 协议](../afei-destiny-skill/references/html-report.md)。[V18 完整演示](../design-demos/cihou-wayfinder-v18/final_report.html)及更早历史保留，不回写旧 HTML。
- 浏览器冷启动、文字动效、桌面／窄屏和回归结果以本轮实际记录为准，不用旧版验收代替。没有新增独立审美评分或实体手机接收验证；私有在线服务仍未实现。

```sh
source .venv/bin/activate
python design-demos/cihou-wayfinder-v19/build_demo.py
python design-demos/cihou-wayfinder-v19/build_demo.py --check
python tools/check_workspace.py --skill
```

以下保留 V18 及更早记录，其中“当前”指对应版本当时的状态。

## V18 自然叙事（2026-10-20 历史记录）

- [匿名求职完整 HTML](../design-demos/cihou-wayfinder-v18/final_report.html)与[构建脚本](../design-demos/cihou-wayfinder-v18/build_demo.py)展示新版文案。设计说明集中一处，主图短句、六节点、说明、九章与完整用户底稿采用直接、温和的第二人称，不轮番重复方法声明。
- [闭环叙事协议](../afei-destiny-skill/references/loop-narrative.md)保留每位读者必填的 `loop_story`。可以从当前情境、应对与即时作用提出“你可能曾经……”的广义形成路径，解释它曾怎样有用、今天怎样继续。具体人物、年龄、事件与诊断不凭空补造；来源模型、技术依据与来源计划继续区分事实和推演，不将可能路径回写成传记。
- 这套结构适用于工作、学习、关系与其他实际困局。固定的是触发、含义、应对、即时作用、后续代价与再次回到；每次替换的是行为的功能、处境和可行选择，不能把“准备换安心”套给所有人。
- 首景始终留在六节点循环，完成一圈不自动进入来处。读者可主动切场、停下或阅读；未来是带条件的小尝试。文字的原生投影与平滑浮现沿用当前适配层，长解释由“读这一句”按需展开。
- 单文件原资源、九章正文、双底稿与下载、来源绑定和登记流程继续遵循 [HTML 协议](../afei-destiny-skill/references/html-report.md)及[原作来源说明](../afei-destiny-skill/assets/cihou/quiet/wayfinder/PROVENANCE.md)。[V17 完整演示](../design-demos/cihou-wayfinder-v17/final_report.html)、V16、V15、V8 与历史原型保留，不批量改写已交付 HTML。

```sh
source .venv/bin/activate
python design-demos/cihou-wayfinder-v18/build_demo.py
python design-demos/cihou-wayfinder-v18/build_demo.py --check
python tools/check_workspace.py --skill
```

浏览器交互、文字动效、桌面／窄屏、减少动态与失败阅读等验收以本轮实际记录为准；没有新的独立审美评分或实体手机文件接收验证。私有在线托管、账号、跨设备同步与回访服务尚未实现。

以下保存 V17 及更早交接，其中“当前”与对应文案规则指该版本当时的状态。

## V17 固定路线与六节点循环（2026-10-20 历史记录）

- [匿名求职完整 HTML](../design-demos/cihou-wayfinder-v17/final_report.html)与[构建脚本](../design-demos/cihou-wayfinder-v17/build_demo.py)使用显式合成材料，没有真实咨询、出生输入、排盘或真实反馈。双底稿、模型与来源计划在同目录；不能给匿名演示换名当作个人报告。
- 新完整报告须按[闭环叙事协议](../afei-destiny-skill/references/loop-narrative.md)填写 `presentation.loop_story`：六项固定顺序为 `trigger/meaning/response/relief/cost/return`，每项 `text`≤24字、`detail`≤300字且有 `refs`；`present/future` 必填，`past` 可省略，各段 `text`≤600字且有引用。固定的是结构，每位读者的经历、假设、限制与尝试重新写。
- 此刻先看“触发→含义→应对→即时作用→后续代价→再次回到”。第一景持续循环，圈数不是诊断、完成度或命运结论。来处只写有材料的经历，未知可以留白；可能只表示带条件的小实验、观察、求助或暂缓，不承诺外部结果。
- 鼠标／触摸按住或按住空格键沿同一固定路线前进，松开停下；指针位置不决定方向。顶部可主动切换三态，也可直接阅读。过去／现在／未来的说明与六节点来自同一个来源绑定模型；原生 DOMTextSystem 承载场景文字，九章、双底稿与下载保持。
- 原资源的内嵌、Blob URL、哈希核验和署名继续由[Wayfinder 渲染器](../afei-destiny-skill/scripts/render_wayfinder_report.py)与[来源说明](../afei-destiny-skill/assets/cihou/quiet/wayfinder/PROVENANCE.md)维护。完整咨询的生成、登记、失效与审计仍按 [HTML 协议](../afei-destiny-skill/references/html-report.md)。
- [V16 完整演示](../design-demos/cihou-wayfinder-v16/final_report.html)、V15、V8 与历史原型保留。`wayfinder-v16` 仍可用于历史模型兼容，不批量重写已交付的自包含 HTML；新模板不能通过选择旧运行时省略 `loop_story`。

```sh
source .venv/bin/activate
python design-demos/cihou-wayfinder-v17/build_demo.py
python design-demos/cihou-wayfinder-v17/build_demo.py --check
python tools/check_workspace.py --skill
```

浏览器交互、桌面／窄屏、减少动态与失败阅读等验收以本轮实际记录为准；没有新的独立审美评分，也没有实体手机文件接收验证。私有在线托管、账号、跨设备同步与回访服务尚未实现。

以下保留 V16 及更早交接，其中“当前”指对应历史记录当时的状态。

## V16 原站引擎复用（2026-10-19 历史记录）

- [匿名求职完整 HTML](../design-demos/cihou-wayfinder-v16/final_report.html)使用显式合成材料，没有真实咨询者、出生输入、排盘或真实用户反馈。其[构建脚本](../design-demos/cihou-wayfinder-v16/build_demo.py)复用合成双底稿，经过正式来源合同、模型校验与渲染器生成；[来源计划](../design-demos/cihou-wayfinder-v16/source-plan.json)记录构建输入和输出哈希，不是咨询 Harness 登记。
- [Wayfinder 渲染器](../afei-destiny-skill/scripts/render_wayfinder_report.py)与[原站资源来源说明](../afei-destiny-skill/assets/cihou/quiet/wayfinder/PROVENANCE.md)是当前工程入口。原版角色、植物、地表、氛围、后处理、音频和叶片视频随原运行时复用；闭合路线、三态文字与条件选择由独立[适配器](../afei-destiny-skill/assets/cihou/quiet/wayfinder/adapter.js)接入。原站自由漫游本身不是莫比乌斯环，此后的闭合路线也不声称是数学莫比乌斯曲面。
- 画面优先。鼠标左右移动、触摸或方向键控制沿环路前进／回走，中央停下；顶部可直接切换“来处／此刻／可能”。每态的三条 `anchors` 短句使用原站 DOMTextSystem 投影到景色中，两行主句旁的“读这一句”按需展开解释。没有过去材料就保留未知。
- 三条 `hero_choices` 同等可选，先看条件、说明和对应世界，再主动选择视觉尝试；选择或场景变化不表示现实行动已完成。循环、缺口、外部限制与本人纠正仍由模型和正文解释，共享资产不含求职个案。
- 阅读入口打开同页九章解读，保留用户八节／技术十一节原文、来源和 Markdown 下载。无脚本时呈现阅读内容；动态引擎不可用时仍保留三态说明、选择与正文入口。暂停、声音、重走、后台停止与减少动态由本轮适配层维护，浏览器验收以实际 QA 记录为准。
- 全部原资源先按 `asset-manifest.json` 核验，再以 Base64 随 HTML 内嵌，运行时转换为本地 Blob URL。无需旁带素材目录；当前示例约 67.8 MB。原作署名和资源权属保留，不能把原站插画、字体、音频、模型或视频称为此后原创或套用旧 CC0／单一 MIT 声明。

```sh
source .venv/bin/activate
python design-demos/cihou-wayfinder-v16/build_demo.py
python design-demos/cihou-wayfinder-v16/build_demo.py --check
python tools/check_workspace.py --skill
```

模型与底稿来源校验、单文件重建一致性已通过。浏览器行为、桌面／窄屏与视觉效果由本轮实际 QA 继续记录；没有新的独立审美评分，也没有实体手机收取文件的验证。私有在线托管、账号、跨设备同步与回访服务尚未实现。

## V15 程序绘画探索（历史对照）

- [匿名求职完整 HTML](../design-demos/cihou-wayfinder-v15/final_report.html)为合成示例，没有读取真实咨询，也没有排盘或用户事实。附同来源的八节/十一节底稿与九章模型；[构建脚本](../design-demos/cihou-wayfinder-v15/build_demo.py)可重建，`--check` 只读比对。
- [Wayfinder 研究](WAYFINDER_STUDY.md)记录公开发行代码、SHA-256、REA Evidence ID、观察与推断边界。原站是 Three.js/Svelte/ECS，鼠标地面射线加按住行走、镜头阻尼跟随、DOM文字投影、叶片视频遮屏换世界。原站不是莫比乌斯无限环。
- 新[场景](../afei-destiny-skill/assets/cihou/quiet/immersive/hero-scene-v15.js)采用真实三维闭合路面、原创程序生成的植物/纸纹/地形和 V8 人物关节/V5 原创图集；没有把原站美术、代码或 MP4 放进安装包。环是困局的可修改隐喻。
- 新[控制器](../afei-destiny-skill/assets/cihou/quiet/immersive/report-exploration-v15.js)支持鼠标左右前进/回走、中央停下、触摸与键盘。实际移动累积揭环，之后仍可循环。顶部可直接查看来处、此刻与可能；三态短句和解释在画面稳定留白处可见。
- 可选 `presentation.hero_choices` 恰好三条，各自有 `id/title/condition/text/refs`。选择只预览条件和森林/草甸/旷野，再主动展开一次视觉尝试；可以换回其他选择。没有真实过去材料就说未知，不能自动补童年、把困局归因本人或把离环等同录用。
- 个人内容仍从本会话双底稿和模型填入；共享场景没有硬编码求职。九章、来源防火墙、SHA资产清单、离线内联、Three.js MIT、正文和下载保留。减少动态为静态视角；WebGL失败时保留文字与选择比较；离屏/后台暂停。

```sh
source .venv/bin/activate
python design-demos/cihou-wayfinder-v15/build_demo.py
python design-demos/cihou-wayfinder-v15/build_demo.py --check
python tools/check_workspace.py --skill
```

本轮视觉与交互验收记录放在[示例目录](../design-demos/cihou-wayfinder-v15/)内；没有新的独立审美评分，不能把旧 V8 或 V10 的评审分数用于 V15。原站视频、自由漫游诗作收集和音景没有逐项复制。私有在线交付仍未实现。

## 以下为 V8 保存交接记录（历史基线）

2026-10-18。用户从历史对照页指定 **V8** 为保存版本，并要求提交 Git、查看完整 HTML。当时渲染器默认切换为 `painted-v8`。这是历史保存记录；当前选择以本文上方 V19 为准。

## V8 当时的产品与唯一入口

- 最终交付是一份同会话的完整个人 HTML。两份 Markdown 是内容底稿和页尾下载；真实报告、个人模型、截图和会话状态都只保存在被 Git 忽略的 `consultation_state/<session>/`。
- 首屏为居中绘本画面，不显示品牌、报告标识、日期和个人大标题。保留必要的按住提示、阅读入口与播放控制。
- 主图固定为 V8：深蓝纸路、原创红裙纸偶、拾花、揭环、投种、离环与回望。采用 WebGL 中的二维原画、关节纸偶与 2.5D 运镜，不是原生三维地形，也不把画稿称为数学莫比乌斯曲面。
- 正文保持九章顺序、主问题优先、其他领域随后、依据原地展开。个体事实、解释、反例、行动条件与未来窗口由本会话模型填写，不能写进共享美术或场景代码。
- 环是可修正的困局隐喻，不能证明每个问题都由个人心理循环造成。外部限制、未知或暂缓均可如实表达；离环不是现实成功承诺。

| 要做什么 | 权威入口 |
|---|---|
| 产品与后续范围 | [产品方案](CIHOU_PRODUCT_PLAN.md) |
| 继续单一咨询 | [Skill](../afei-destiny-skill/SKILL.md)、[会话协议](../afei-destiny-skill/references/consultation-harness.md) |
| 生成完整个人报告 | [HTML 报告协议](../afei-destiny-skill/references/html-report.md) |
| 填写固定九章内容 | [生成器](../afei-destiny-skill/scripts/generate_html_report.py)、[模型模板](../afei-destiny-skill/assets/cihou/mobius-model-template.json) |
| 修改正式页面与版本选择 | [渲染器](../afei-destiny-skill/scripts/render_quiet_report.py)、[HTML](../afei-destiny-skill/assets/cihou/quiet/report.html)、[控制器](../afei-destiny-skill/assets/cihou/quiet/report.js) |
| 复核 V8 素材、版本与哈希 | [V8 说明](../afei-destiny-skill/assets/cihou/quiet/immersive/README.md)、[冻结清单](../afei-destiny-skill/assets/cihou/quiet/immersive/v8-bundle.json) |
| 单独体验同版主图 | [V8 原型](../afei-destiny-skill/assets/cihou/quiet/immersive/prototype-v8.html) |
| 底稿结构 | [用户八节模板](../afei-destiny-skill/assets/cihou/user-report-template.md)、[技术十一节模板](../afei-destiny-skill/assets/cihou/technical-report-template.md) |
| 更早的完整匿名样机 | [演示索引](../design-demos/README.md) |

## V8 的确定性运行链

渲染器 `HERO_BUNDLE` 集中选择 `CihouHeroSceneV8`、`CihouCharacterRigV8`、人物图集 V5 与世界原画 V3。场景版本、人物图集和原画有各自编号，不能因为使用图集 V5 就把整版称为 V5。所有运行 PNG、JSON、Three.js、MIT 全文、关节与场景代码都内联到最终 HTML，来源清单逐项记录 SHA-256；不依赖远程素材或元数据。

保留原 V8 的 **10.5 秒揭示、9.5 秒离环**。按住路面、触摸、空格或回车控制拉远；松开保留进度。揭环并短暂停顿后可主动再往前一步，结束后阅读或重看。暂停、重看、键盘、离屏／后台停止、减少动态与无脚本阅读由正式控制器维护。WebGL 无法使用时显示静态说明，正文和来源仍可阅读。

人物与纸路均为本轮原创生成美术，参考了三个原站的画面语言，没有从原站提取角色或物件；不能沿用旧 `girl-walk` 图集的 CC0 署名。素材来源和限制见 V8 目录中的生成记录。Three.js 单独使用 MIT 授权。

## 每份咨询的完成链路

1. 先 `discover`，只对用户选中的单一会话执行 `status`、`audit`、`resume`。不读取其他会话补内容。
2. 按各自来源计划，完成并登记用户八节、技术十一节底稿；技术来源防火墙保持。
3. 完整阅读本次双底稿，使用 `--init-model` 初始化 `cihou-mobius-v1` 草稿。填入三态个人含义与九章内容，保留事实、假设、条件、反例、未核验未来及反馈撤回。
4. 生成预览，核对 V8 实际运镜、桌面与窄屏、暂停与重看、键盘、正文及来源展开。不能只打开匿名原型就认为完整模板通过。
5. 更新已有登记先按产物 ID 精确 `supersede`，使用新版本文件名。`--register` 后 `--check`，再 Harness `audit`。不覆盖历史有效文件，不为美术切换重写咨询事实。
6. 最终回复突出完整 HTML 一个入口并打开。只有双底稿、来源绑定模型与 HTML 均有效登记，默认 HTML 会话才算 `complete`。

新会话统一 `report_template=cihou-mobius-v1`。旧会话无模板字段时保持原契约；需要升级时用新模型显式选择模板。框架固定复用，每次填的是当前会话内容，不能直接把匿名样机改名为个人报告。

## 历史与评审边界

旧海图、stage1、quiet 石墨纸路、人物比例预览、V1–V14 和全部本地研究记录保留。V9–V14 是后续工程探索，本次选择 V8 不会删除或反向覆盖这些原件。历史比较页放在选定会话内，包含早期个人页面，因此不能加入 Git 或安装包。

V8 的第 07 轮独立评论员亲自完成当前原型及 Wayfinder、Kaizen、Nomadic Tribe 的主流程，评分为 **4.5/10**；V10 的第 08 轮评分为 **5.8/10**。这些评分没有因用户选定 V8 而改变。V11–V14 尚无新的独立评分；V13 查出低帧跨步沉髋和穿坡，V14 的后续专项在用户要求历史对照时中断，不能宣称全部通过。

如以后继续设计评审，每轮仍需全新上下文、同一提示词、当前版本截图与交互过程；评论员亲自体验三个原站完整流程。既有研究截图、工程测试和用户选定均不能代替独立审美判断。原站抓取代码、第三方截图和大批可重建 QA 页面保留在本地研发资料，本次运行基线提交不将其作为可分发资产。

## 验证与后续范围

从仓库根运行：

```sh
source .venv/bin/activate
python tools/check_workspace.py --skill
```

回归测试只用合成材料。当前交付记录以会话活动产物和实际 QA 为准；桌面／手机视口测试不等于实体手机接收与打开验证。`127.0.0.1` 只是本机预览，最终入口链接实际 HTML 文件。

私有在线托管、账号、云端存储、跨设备同步、在线咨询和回访服务尚未实现。Git 提交只保存本地可重建源码、共享美术与模板，不代表推送、发布或上线。
