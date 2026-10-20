# V12 角色表演制作检查

这是角色制作记录，不是独立设计评分，也不代表主图通过验收。独立评论员仍需亲自完成三个原站。

新增 [hero-character-rig-v12.js](../../../afei-destiny-skill/assets/cihou/quiet/immersive/hero-character-rig-v12.js)，SHA256 `cb0f28ed53b74ee73dcfff6da9e9f33858ef766703cb957034833ff6ef0f8313`。原 v10 rig 与人物 v5 PNG / JSON 均保持原哈希。没有修改 scene、prototype、正式默认或 review-current。

## 表演与接口

- 全局构造器 `CihouCharacterRigV12`；`version=12`，保留 `isV10=true`，另有 `isV12=true`。
- `update(gaitSeconds,speed,event)`、实际 alpha 鞋底接触、`getAttachment`、`getFootContacts` 和场景 world stride 换算接口不变。
- 拾花：先看，轻沉髋，再伸手；接触保持 `.405–.47`，之后抬到眼前检查，再收袋。花归属仍在 `.43` 从枝到手、`.86` 从手到袋。
- 再次遇见：视线先转到真实空枝方向，身体后到；提花、迟疑、收袋分开。仅当真实目标为负 X 时显示后侧脸。归属仍是 `.08 / .94`。
- 放花：手先抵达本帧袋口，`.20` 接过花后才抬起；看落点、沉髋、缓慢放低，`.78` 交还地面；手短暂停留，再撤手和起身。归属仍是 `.20 / .78`。
- 修复旧动作里手在花换归属之前提前离开袋口的问题。四个袋口边界都使用本帧变形后的袋口坐标，而非上一帧坐标。
- 后侧脸的俯仰方向随镜像翻转，能看向左下的空枝和袋口。
- 头发和裙摆由动作进度的延迟曲线产生轻微余势；与走路时钟分离，颈部、脸部前缘、脚底不随整张贴片乱晃。袋口附件与裙子的相同形变函数保持一致。
- `cross.rootTravel` 仍为 `.19H*transfer + .11H*settle`，四个安全点仍为 `0 / .40 / .67 / 1`。放花现在也如实报告 `0 / .20 / .48 / .78 / 1` 安全点；`nextSafeStop(p)` 默认仍服务跨路，新增可选第二参数 `place`。

## 步速配对修正

旧 `.130→.190H` stance stride 配 `.4/.9 m/s`，在 H=1.15 时按公式约为 3.3 / 5.1 次落脚每秒，演员页 1x 播放不能代表实际主图。与场景工程师协调后的 v12 使用 `.170→.270H`，场景真实 idle / hold 速度同步为 `.28/.60 m/s`。

按相同步距公式，新的落脚频率约为 **1.78 / 2.40 次每秒**。这是由实际配对参数推算的步频，不是视频逐帧测量或帧率测试。较宽步幅同时根据两段腿的实际可达范围微降骨盆，最大约 `.008H`，没有拉长腿或平移脚底伪装速度。

场景中的实际 5 秒按住试验由 travel `7.181→10.249`；整次工具观察包含释放等开销，共 `5.294s`，符合 `.60 m/s` 的移动量级。记录见 [stage-pace-observation.json](stage-pace-observation.json)。

## 实际浏览器证据

使用本子任务的 IAB browser ID 2，默认 **1280×720**；没有设置 viewport override。JPEG 文件真实尺寸已由文件头核对。图片由实际 CUA 截图直接保存，未拼接、重绘或改像素。

[演员检查页](actor-preview.html) 的站高约 190 CSSpx，使用原始人物图；唯一测试花是 rig 的简化预览物，不代表组合场景花朵美术验收。

| 实际画面 | 用途 |
| --- | --- |
| [final-pick-contact.jpg](final-pick-contact.jpg) | `.43` 真实握点接触 |
| [final-pick-inspect.jpg](final-pick-inspect.jpg) | `.60` 检查与视线 |
| [final-pick-bag.jpg](final-pick-bag.jpg) | `.86` 本帧袋口与回瞥 |
| [final-reconsider-hesitate.jpg](final-reconsider-hesitate.jpg) | 负 X 空枝目标、左下视线、迟疑 |
| [final-place-grasp.jpg](final-place-grasp.jpg) | `.20` 仍在袋口接过花 |
| [final-place-contact.jpg](final-place-contact.jpg) | `.78` 低蹲落点接触 |
| [final-place-withdraw.jpg](final-place-withdraw.jpg) | `.88` 撤手余势 |
| [final-cross-press.jpg](final-cross-press.jpg) | `.40` 试探后承重 |
| [final-cross-transfer.jpg](final-cross-transfer.jpg) | `.67` 体重转移 |
| [final-cross-settle.jpg](final-cross-settle.jpg) | `1.0` 后脚收拢 |
| [walk-purpose-a.jpg](walk-purpose-a.jpg)、[walk-purpose-b.jpg](walk-purpose-b.jpg)、[walk-purpose-c.jpg](walk-purpose-c.jpg) | 较宽步幅的三个相位，实际膝部轮廓 |
| [stage-pick-live.jpg](stage-pick-live.jpg) | 真正 prototype-v12 按住靠近并拾取后的实时帧，p≈.487、站高188.9px |
| [stage-walk-live.jpg](stage-walk-live.jpg) | 真正 prototype-v12 中的返回行走与携花 |
| [playback-pick.jpg](playback-pick.jpg)、[playback-sequence-end.jpg](playback-sequence-end.jpg) | 演员页按实际时钟播放，采到拾花及最终跨路结束 |

演员页先用按钮和原生进度条检查关键姿态；另启动了完整时钟播放并实际达到 `cross 1.00`。中间一次等待短暂 reconsider 窗口的自动截图超时，因此没有声称连续录制所有帧；其余关键帧由原生进度条明确选择。

本角色工程师在组合场景中实际完成首次接近、按住、松手后拾取收尾，并测试 returning 中按住 5 秒。**没有在本检查中完成组合场景整圈和离环，也没有做手机、音效、实际 FPS 或实体触屏检查**；这些仍由场景和根任务的联合 QA 完成。组合场景在截图期间仍为工作稿，不称冻结版本。

## 数值检查

[final-sample-results.json](final-sample-results.json) 为点击演员页“采样检查”后实际 DOM 输出原文：1001 组步态 / intent、804 组事件姿态，加接触边界与安全点。

- 支撑底最大 Y 误差 `4.41e-18`；支撑点原 PNG alpha 最小值 `33`。
- 非有限顶点 `0`；较宽步幅的膝到踝过伸最大 `1.11e-16`。
- 平脚支撑段的局部脚速加 world travel 速度，最大残差 `3.97e-12`。完整 stance 段包含刻意的跟 / 趾滚动，最低 alpha 接触点会改变，其速度残差约 `.0637`；没有把这一项写成全程绝对零滑动。
- 四个袋口所有权边界 XY 误差最大 `4.17e-17`；手与包的 `.002` 深度层差用于纸偶层次，不影响 XY 对齐。
- 演员页给定目标下，拾取 `.43` 的握点 XY 误差 `0`，放下 `.78` 为 `1.39e-17`。真实组合场景各目标的世界距离还需场景 QA 在切换边界核对；p=.487 的组合帧不能代替切换前一刻的量测。
- 报告里的 v10 delta 是刻意加宽步幅造成的差异，不是要求仍等于零的回归指标。较早 `initial-*` / `sample-results.json` / `gait-trial-*` 记录为制作过程，最终数值以 `final-sample-results.json` 为准。

另已提醒场景工程师复核 `_setPhase` 对 gaitTime 的取整，以及事件 `lockFeet` 窄站姿与行走之间的瞬间转换；本记录没有用滑动插值掩盖，也没有声称只靠中段截图证明了该边界。
