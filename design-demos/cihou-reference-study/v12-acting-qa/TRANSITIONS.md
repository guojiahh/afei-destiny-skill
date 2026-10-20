# V12 真实脚步过渡专项：take01

结论：动作首尾确有脚跳位，连续行走也确有对地漂移。此前演员页的 alpha 鞋底 `localY=0` 只验证纸偶局部姿态，**不能证明世界落脚点稳定**。

没有改生产 scene、prototype 或冻结 rig。新增 [被动诊断页](transition-preview.html)，正常 native 按住完整走到 `complete`；没有 seek、强制 phase 或脚本推进。页面自己的 rAF 只读实际渲染后的脚、演员、花、手、包变换，将数据写入可见诊断表和 JSON。CUA 只操作正常 UI、读 DOM、截屏。

## 实操与来源

- Chrome 独立标签 `274989156`；此前本子任务 IAB2 连接消失，按 browser-troubleshooting 核对 inventory 后改用可用 Chrome1。与场景工程师取得约 5 分钟无输入 / viewport 干扰窗口。
- 默认实际 viewport 和 JPEG 均为 **1470×710**，没有设置、重置 viewport。结束只关闭自己的标签，已释放输入窗口。
- 依次进行普通 native hold `6.5s / 28s / 28s / 28s / 8s / 13s`，中间正常松手、观察；同一按住手势跨过 choice 并进入离环，最终正常到达 complete。最后点击公开暂停和“生成完整记录”。
- 记录共 **12,369 个真实渲染样本、206.2812 场景秒、12 个阶段边界、6 次花所有权切换**。没有声称这是一段完整视频或实际 FPS 测试。
- [加载来源](transition-take01-source.json)：scene `5cf95cb300d2c3661a173a3e5f9146f32af8edfea08c11ca0c268a8cc52aaec6`；rig `cb0f28ed53b74ee73dcfff6da9e9f33858ef766703cb957034833ff6ef0f8313`。
- 为避免 producer 在实操中继续改 scene 污染取证，将加载时源码逐字复制到本 QA 目录：[scene 快照](scene-snapshot-take01.js)、[rig 快照](rig-snapshot-take01.js)。生产原文件没有被改写。scene 后续已修复拾花深度，**本 take 的旧握点误差不代表最新 scene**。

原始证据：[完整逐帧 JSON](transition-take01-raw.json)、[只读离线分析](transition-take01-analysis.json)、[排除滚动接触点的平脚子集](transition-take01-core-flat-stance.json)。

## 动作边界

强 stance 阈值 `.75`，相邻帧最长 `80ms`；下表实测边界均约 `15–17ms`。记录的是同一只脚前后均强 stance 的 world 落点差。

| 边界 | 实际强支撑跳位 | 判断 |
| --- | ---: | --- |
| walking → idle 等待 | 0.091824 m | 确有跳位 |
| idle 等待 → walking | 0.102836 m | 确有跳位 |
| walking → pick | 0.101323 m | 确有跳位 |
| pick → returning | 0.095153 m | 确有跳位 |
| returning → reconsider | 0.105486 m | 确有跳位 |
| choice → edge approach | 首帧 0.003434 m；下一帧 0.099275 m | 只看 phase 改变的首帧会漏报 |
| edge approach → place 动作 | 0.073424 m | 确有跳位 |
| place → cross | 0.029056 m | 低于 3cm 阈值；仍为瞬间换站位，不能据此声称自然 |
| cross → leaving | 0.203032 m | 最明显；另一只刚离地脚同帧移动 0.227923 m |
| leaving → complete | 0.008027 m | 该首帧未超阈值 |

前几个 walking / pick / returning 边界的强支撑脚在取样前处于平脚区，故不是鞋跟或鞋尖滚动时最低 alpha 像素改变造成的伪报警。`_setPhase` 对 gaitTime 的取整、acting 的窄站姿、恢复走路的固定步相，确实改变了脚的位置。

可见诊断为了限制 DOM 体积最多保存前 80 条详细报警；**界面上的 80 是截断上限**。从完整原始样本重新统计共有 126 个合格“接触点位移 >3cm”样本。这个总数包含鞋底滚动时接触点选取变化，不能全都称作整只鞋跳；最可靠的动作缺陷证据是上表及原始 phase 边界。

## 连续行走对地漂移

每只脚进入强 stance 时保存真实 world 锚点，之后用**当前相机**重投影该固定锚点，与当前鞋底像素比。因此相机跟随自身不会被误算成滑脚。脚影则独立读取实际 shadow mesh 的位置。

- 全 take 最大单一强 stance world 净漂移 `0.265078m`；最大屏幕差 `37.285871px`。后者包含 cross → leaving 跳位，不能当纯行走指标。
- 单独 returning 的一个强 stance 窗口：`0.263592m / 13.637460px`，约 `.4333s`；另一个接近花的 returning 窗口为 `.265078m / 28.809035px`，约 `1.6175s`，包含减速。
- 为避免最低 alpha 接触点在鞋跟 / 鞋尖滚动间切换的混淆，再仅选步相 duty 内 `[.12,.88]`、同一 moving phase、同脚 strong 的连续平脚段。**仍在 `.3672s` 漂移 `.223737m`**；这足以确认局部纸偶 X 与实际 world travel 不一致。
- returning 的合格强支撑相邻帧位移中位数 `.007453m`、95 分位 `.008981m`；没有把这些每帧不足 3cm 的位移当成稳定。
- 这些窗口里脚影与鞋底仍只差约 `1.8–2.7px`。因为旧影子直接跟随当前鞋点，视觉上贴鞋不能作为对地锁定的证明。
- 当前记录保存了固定锚点到鞋的二维像素距离；没有单独保存 screen-X / screen-Y 分量。不会把仅有二维模长的数据写成已测得纵向或横向漂移。

## 花的实际交接

| 交接 | 实际 p | 本次旧 scene 的结果 |
| --- | ---: | --- |
| stem → hand | .430263 | planned local Z `-.035653`，而 hand Z `.020`，world 误差 `.055653m`；实体握点同帧移动 `.073634m`（含旧 `.018` 镜头偏移） |
| hand → bag | .864553 | 实体花移动 `.002022m` |
| bag → hand（回望） | .083500 | 实体花移动 `.002873m` |
| hand → bag（回望） | .943281 | 实体花移动 `.001999m` |
| bag → hand（放花） | .203694 | 实体花移动 `.002226m` |
| hand → ground | .782083 | planned local Z `0`，hand Z `.020`，world 误差 `.020m`；实体花同帧移动 `.038m` |

袋口的四次交接已显著连续，验证本帧袋口解算生效。取花的 `.055653m` 与 scene 工程师独立记录一致；他随后已通过真实 approach lane / 多前行 4.4cm 把新 scene 的拾花误差测为 `0m`，没有修改 rig 手深度。本 take 保留修复前事实。放花 `.78` 的深度仍已提醒工程师单独复核，移除镜头偏移不能代替真实接触。

## 建议的一套修复

选择 **保留躯干和手平面，新增空间脚约束的 rig 变体 + scene 世界落脚锚**，而不是只修 X 投影，或把整个人转向 / 偏置来补脚。

1. scene 为每只鞋保存真实 road / exit world 落点。stance 持续期间维持锚点；下一落点沿真实路线 tangent / exitDirection 生成。只有明确抬脚后才能换锚，足影放到真实锚点。
2. 新 rig 变体给现有 `feetTargets` 增加 Z；从髋到膝到踝做原生 XYZ 两骨 IK 和纸片纵向蒙皮。鞋的画面与真实落点一起变，保持 depthTest；胸、手、袋的既有平面不动，保护已校准的手 / 花接触。
3. 骨盆可达性要用真实 XYZ 脚目标共同求解，不能只按旧默认 XY 步幅检查。
4. phase entry 捕获上一落点，真实最后小步后进入拾 / 放动作；动作里保留脚距，结束先抬游离脚再走，不把 gait 取整后强制换窄站姿。

代价：一个新 rig 文件的三维腿片 / 可达性解算，以及 scene 一套逐脚 anchor / swing 状态。无需重画角色，不改变头身风格，不挪整个纸偶，不关闭深度测试。仅将全 world 距离乘 screenRight 投影会改善部分像素节奏，却保留深度和坡度漂移；整人 plane 沿 T 转向虽然代码少，却重开人物宽度、手花深度、坡面和弯道连续性问题。

这是一项制作修复建议，未在本 take 修改或验证上述新方案，不能当作已经解决。

## 实际截图

- [开始画面](transition-take01-start.jpg)
- [首个拾花后，记录 walking / pick 边界](transition-take01-pick-return.jpg)
- [正常 returning 行走](transition-take01-returning.jpg)
- [回到原花位置附近](transition-take01-return-near.jpg)
- [同一按住手势进入 edge approach](transition-take01-edge-approach.jpg)
- [完成放花、跨路、离环](transition-take01-exit.jpg)
- [最终 complete / 已暂停 / 完整记录导出](transition-take01-complete.jpg)

文件名 `transition-take01-recognize.jpg` 是同一 edge-approach 原始帧的早期命名，实际已进入 placing-approach；正确阅读使用上面的 edge-approach 文件与数据标签。
