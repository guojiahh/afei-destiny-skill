# Wayfinder 后半段机制与“可能”阶段复用研究

研究日期：2026-10-20。目标为 [Wayfinder 原站](https://wayfinder.nfb.ca/)。本笔记使用
reverse-engineer-anything 的证据分层方法，研究原站已经发布的交互与环境反馈，供后续方案选择；
不修改运行时，不替代既有 [实现研究](WAYFINDER_STUDY.md)，也不表示下述映射已经实现。

后续落地：用户确认采用“一次点击就给反馈”后，已在
[V20 完整报告](../design-demos/cihou-wayfinder-v20/final_report.html)接入光点线路、
母树帧动画、纸片与短时花草，以及原版诗卡。新增路径与中文叙事由适配层控制；
原美术、材质、动画和卡片组件继续复用。下文保留研究时的证据边界，
当前交付协议见 [V20 交接](CIHOU_HANDOFF.md)。

原站可复用的核心是“接触光点使词句出现，完成收集得到反馈，带着收集物继续走，最终返回母树并进入下一环境”。
原站按森林、草原、冻原推进；它没有现成的三条未来分支。三个求职选项的含义、分支规则和中文文案均属于本项目的适配设计。

## 证据来源与确认边界

本轮静态来源是已从公开发行脚本 sourcemap 恢复的
[recovered-source](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/)，
该来源与发布脚本的既有字节核验记录见 [原镜像核验](../design-demos/cihou-wayfinder-v16/wayfinder/reference/cihou-mirror-audit.md)。
不是根据系统名猜测功能，也不把本地适配层新增的闭环当成原站机制。

本轮 REA 输入为 20 文件子集；结果报告 19 个相关文件、18 个 JavaScript 文件解析、0 个失败。
输入子集清单完整，跨模块动态语义仍为 unknown；静态解析成功不等于所有事件已经在浏览器触发。

- Parent Evidence：`ev_a2d2995788ccf531e1b10d52c553142742f23f4ac344b75f130ea36e2877b9ab`
- Summary Evidence：`ev_54a547b57e1ed0c1b561bffd34967483b8c99952782bac4a18d4da8995282910`
- 临时分析目录：`/private/tmp/cihou-wayfinder-reuse-20261020-5vvtxnpz`。它不是仓库交付目录，不保证长期保留。

本轮还通过原站 DOM 中的 `script[src]` 核对到当前主脚本仍为 `/src.effdb523.js`；
本轮没有重新下载并校验该远端脚本的字节哈希。
可留存的 [REA 摘要](../design-demos/cihou-reference-study/wayfinder-reuse-20261020/rea-summary.json)
与 [20文件选择及哈希清单](../design-demos/cihou-reference-study/wayfinder-reuse-20261020/selection-manifest.json)
随研究图保存。完整工具 ledger 已导出至 `/private/tmp/cihou-wayfinder-reuse-a2d29957.evidence.json`，
为临时排查文件，不作为仓库交付物。

| 确认等级 | 本轮可以确认的内容 | 不能据此声称的内容 |
|---|---|---|
| 原站实机已见 | 有序光点组成的 constellation；接触光点后词句逐步显现；完成一次收集后披风亮起、出现第一个库存图标。 | 第一个库存图标不等于已经完成一首诗、存好诗卡或完成整个群系。 |
| 静态代码确认，尚未在本轮实机走通 | 三份收集拼成诗、诗卡、保存卡后纸片跟随、移动时短时开花、返回母树、树动画、后续群系与最终收束。 | 不写成“本轮已经亲眼看到完整开花和树恢复”。 |
| 本项目设计建议 | 将三个现有求职选项映射到不同的完成条件与原站反馈。 | 原站已有三条未来路线、求职准备站、等待升级或永久脚印。 |

本轮原站截图：[01-original-constellation.png](../design-demos/cihou-reference-study/wayfinder-reuse-20261020/01-original-constellation.png)。
该图支持光点与文字的画面记录；披风和库存反馈来自本轮连续操作观察，单张截图不证明完整后半段。

## 完整原生触发链

### 1. 靠近一个收集物，依次走过光点，得到一份词句

`TokenPlacementSystem` 允许收集时，角色与地面 token 的圆形范围相交，添加 `TriggerTokenLine`。
`TokenConstellationSystem` 随后生成光点线路。后一个光点必须等前一个已命中，命中后创建该节点的 `m.word` 文字，
并显现下一个点。源码按短语分段；中文如何分成适量节点需要本项目另做适配。

最后一个点命中后，系统创建 `CollectedToken`，保存其 stanza、type 和位置，并添加
`CapeMagicalEffect + AutoRemoveCapeMagicalEffect`。这就是一次收集有明确结束反馈的代码路径。

来源：[TokenPlacementSystem.js，第150–157、224–233行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/TokenPlacementSystem.js)；
[TokenConstellationSystem.js，第307–313、366–444、549–584行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/TokenConstellationSystem.js)。

### 2. 三份收集组成一首诗，进入库存与卡片流程

收集达到3份后，`TokenPlacementSystem` 等待1秒，创建 `FinishedPoem`，复制三行 stanza 与三个 token，
再清理这3个 `CollectedToken`。`HaikuCollectionSystem` 将完成的诗经过 `HaikuAddingToInventory` 加入 `HaikuInInventory`。
`GameUISystem` 根据库存更新卡片数据；卡片从显示变为关闭的路径添加 `HaikuCardSaved`。
这里的“保存”是原站卡片流程事件，不等于本项目已经替用户投递材料或保存了一份外部文件。

来源：[TokenPlacementSystem.js，第96、261–281行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/TokenPlacementSystem.js)；
[HaikuCollectionSystem.js，第169–190行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/HaikuCollectionSystem.js)；
[GameUISystem.js，第223–236、357–375行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/GameUISystem.js)。

### 3. 保存卡片后，纸片跟随，移动时出现短时花草

`HaikuInInventory` 新增时先创建 `WaitingForTokenPaper`；收到 `HaikuCardSaved`，并且原纸片纹理加载完成后，
`TokenPaperFollowSystem` 才创建 `FloatingToken + FloatingTokenTargetUser`。原素材为
`image/data/floating-paper` 和 `image/data/floating-paper-lines`。

`HaikuFloraSystem` 需要同时有库存中的诗、正在跟随用户的纸片，且没有 `WrittenStanzaLineActive`，才进入常规开花路径。
纸片移动至少1米、满足0.1–0.2秒的生成间隔、并处于原点10米以外时，按当前群系与水面条件生成原花草。
素材来自 `spritesheets/ground-flowers`，分别取森林、草原、冻原花草帧；草原水面还可以使用 lily 帧。

**常规花草的生命周期为2–5秒，出入动画时长参数为0.75秒。它们是短时反馈，不能描述成永久足迹、永久开辟的道路或持久地图进度。**

来源：[TokenPaperFollowSystem.js，第12–16、30–36、80–110行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/TokenPaperFollowSystem.js)；
[HaikuFloraSystem.js，第38–53、91–102、119–133、169–208、214–235、284–311行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/HaikuFloraSystem.js)；
[tags.js，第931–940行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/tags/tags.js)。

### 4. 群系数量达标后，引导返回母树并播放变化

原默认配置为每群系2首诗，而不是文件头旧注释提到的5首。库存达标后添加
`DirectUserToOrigin + CapeMagicalEffect + WaitingForBiomeResolution`。
在没有原游戏 UI 活跃的条件下，角色进入世界原点20米范围，系统开始4秒的 `EnvironmentState.solved` 补间，
并添加 `CameraFocusOnTarget + MoveUserToOrigin + ShowBiomeResolution`，镜头目标设为 `(0,4,0)`。
角色系统把人物引向树旁的原生站位；纸片在该阶段也可以转向母树。

森林和草原进入这一阶段4秒后启动树的 `SpriteAnimation`，并添加 `TriggerTreeTransitionAudio`；
10秒后触发 `TransitionToNextBiome`。树使用 `spritesheets/tree-anim-a/b/c` 原图集。
三图集分别为73／81／70帧，通用动画系统按12fps推进，名义播放时长约6.08／6.75／5.83秒；
实际时长受帧推进影响，本轮没有实机精确计时。

来源：[config.js，第19行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/config.js)；
[HaikuCollectionSystem.js，第194–204、229–279、283–327行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/HaikuCollectionSystem.js)；
[CharacterSystem.js，第158–161行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/CharacterSystem.js)；
[TokenPaperFollowSystem.js，第124–150行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/TokenPaperFollowSystem.js)；
[TreeSpriteAnimationSystem.js，第10–46行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/TreeSpriteAnimationSystem.js)；
[SpriteSheetAnimationSystem.js，第36–37、84–104行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/SpriteSheetAnimationSystem.js)。
帧数证据：[tree-anim-a.sheet](../design-demos/cihou-wayfinder-v16/wayfinder/assets/tree-anim-a.77f6be8a.sheet)、
[tree-anim-b.sheet](../design-demos/cihou-wayfinder-v16/wayfinder/assets/tree-anim-b.28646923.sheet)、
[tree-anim-c.sheet](../design-demos/cihou-wayfinder-v16/wayfinder/assets/tree-anim-c.74b09916.sheet)。

### 5. 原叶片视频遮挡时替换群系，冻原另走最终收束

`TransitionToNextBiome` 使原界面挂载换场 overlay；原组件使用 `transition.mp4`，overlay 挂载1250毫秒后添加
`SafeToSwapBiomes`。环境系统在安全点重置角色、替换当前环境，原顺序为森林→草原→冻原。
这是一条顺序推进链；现有适配层允许主动比较群系，是本项目后来加的控制。

冻原回树阶段额外添加 `FinalBiomeResolution`，第17秒启动树动画，第23秒进入 `EndGameState` 与淡出。
该标签会联动雪花2秒缩去、地表普通植被按距离缩去、地面8秒向橄榄色收束、原点周围150株持续花草，
以及人物升起、币环、白闪和后续上浮线条等原结尾效果。这里的持续花草是最终收束特例，不能套用到普通行走路径。

来源：[GameUISystem.js，第336–354行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/GameUISystem.js)；
[LeafVideo.svelte，第21行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/components/LeafVideo.svelte)；
[TransitionOverlay.svelte，第98–110行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/overlays/TransitionOverlay.svelte)；
[SimpleEnvironmentSystem.js，第282–329、450–468行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/SimpleEnvironmentSystem.js)；
[HaikuCollectionSystem.js，第66–77、248–250、267–327行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/HaikuCollectionSystem.js)；
[SnowAtmosphereSystem.js，第40–49行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/SnowAtmosphereSystem.js)；
[SimpleEnvironmentAssetsSystem.js，第247–268行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/SimpleEnvironmentAssetsSystem.js)；
[HaikuFloraSystem.js，第135–157行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/HaikuFloraSystem.js)；
[OutroSystem.js，第219–248、251–424行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/OutroSystem.js)。

一个容易误判的文件是 `StanzaLineSpawningGrowthSystem`：它虽有花朵生长代码，但原初始化第288行明确注释了它的注册，
本轮有界源码搜索也没有找到创建 `StanzaLineSpawningAsset` 的有效调用。原站已注册的花草反馈是上述 `HaikuFloraSystem`。
来源：[initialize.js，第288–293行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/initialize.js)。

## 为什么当前“可能”只是换景后继续转圈

这是适配层主动替换原叙事进度的结果，不能归因于原站只支持环形漫游。

1. 当前适配层创建 `BlockTokenCollection + HideHUD`，并关闭 `HaikuCollectionSystem`、`OutroSystem`，以及原教程消息系统。
   因而收集不再发生，原库存、回树、树动画和结尾触发链也失去正常前置条件。
2. `processMove` 在没有出口时始终用同一条闭合路线的 `point(state.travel)` 定位角色。
   `setChoice` 只改变选中项与群系，随后仍走这条路线；三个选项共用同一种径向短出口。
3. 适配层每帧将地面 `tutorial` 混合值固定为0，以消除开场遗留的灰地；但原最终收束也使用同一个 uniform。
   若直接添加 `FinalBiomeResolution`，地面变化会和这个修正争夺控制。
4. 适配层每帧固定游览镜头距离，并掌握用户目标。完整原结尾需要按阶段交还角色与镜头控制，不能只恢复一个标签。
5. 原 `HaikuCollectionSystem` 在活动群系变化时会清除世界里的全部 `TextHint`，并重置库存与树动画。
   若整体恢复该系统，必须处理中文叙事文字的归属与重建，避免换场时把本项目的当前短句一起清掉。

来源：[canonical adapter.js，第34–46、275–281、283–323、387–425、479–490行](../afei-destiny-skill/assets/cihou/quiet/wayfinder/adapter.js)。
原群系重置来源：[HaikuCollectionSystem.js，第145–166行](../design-demos/cihou-wayfinder-v16/wayfinder/reference/recovered-source/systems/HaikuCollectionSystem.js)。

## 三个现有选项怎样对应现有机制

下表是待评审的设计映射，保留当前选项名称。目标是复用原光点、词句、纸片、花草、母树与叶片换场，
让完成条件和反馈不同；不为三个选项另造建筑、桥梁或一套新画风。群系配色也不代表哪个选择更好。

| 保留的选项名称 | 适合借用的原站机制 | 本项目应新增或改写的语义 | 最小可感知完成条件 |
|---|---|---|---|
| 材料够了先投一份 | 有序光点线路、命中后词句显现、末节点收集完成反馈；原卡片可作为后续成果回看形式。 | 用很短的行动线路表达“先送出一份，得到信息再调整”；可把岗位、材料、下一次查看反馈的时间呈现出来。原站没有投递接口，不能表现成已经替用户投递。 | 走到末节点得到一项明确的下一步，停止继续绕圈；用户确认自己的实际行动后才算本项目行动完成。 |
| 还缺一项就把它补清楚 | 同一条 constellation 中“前一个点命中，才显现下一个点”的顺序约束，以及收齐后形成一份成果的结构。 | 将一个具体缺项拆成少量可检查节点，结束时展示补齐的是什么、达到什么程度即可开始尝试。不得恢复整套随机收集而把准备再次变成无尽任务。 | 只补这一项；最后一个节点明确收束，提供继续行动的入口，不能自动退回原环要求更多准备。 |
| 留给时间跟坚持 | 原纸片随行、移动时短时花草反馈、按已完成收集累积到回树、母树动画与叶片换场。 | 表达“条件有变化时，再做一次有限行动；已完成的部分可以回看”。需要由本项目定义真实的阶段目标与回看节点，不能声称原站靠停留、等待或多绕圈自动积累能力。 | 每次走完一个有边界的小段就能停下，保留已完成内容；达到明确阶段条件才启用回树或下一环境。花草只是当下反馈，不担当持久进度。 |

第三项尤其需要谨慎：原站证明了“完成收集后环境会回应”的表现形式，没有证明求职问题只靠时间就会好转。
“坚持”应对应可持续的小行动与复盘条件，不能设计成按住越久、绕圈越多就越正确。

## 建议的第一轮复用范围

先恢复本轮已经实机确认的最小单元：原有序光点、随节点显现的短句、末节点完成反馈。
让前两项分别形成“一次尝试”和“补一个明确缺项”的有限过程；保留原人物、原镜头、环境资产与按住前进／松开停止。
三个选项的区别先由完成条件、节点文字与结束反馈承担，避免只用森林／草原／冻原换色表达差异。

第二步在原站实机走通诗卡→纸片随行→短时开花后，再决定是否把它用于第三项的阶段性反馈。
回树和最终收束应单独验收：原流程存在以原点为中心的距离条件、系统内部一次性状态、相机接管及多系统联动，
恢复整套流程的工作量和风险明显高于复用单条 constellation。最终币环与白闪不宜作为三个选项的通用奖励。

仍需补的实机证据为：三份词句组成诗、卡片关闭事件、纸片随行、普通花草的出现与消退、一次完整回树、树动画及随后的换场。
在这些现场记录补齐之前，保持“静态确认”的标注。
