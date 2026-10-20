# v14 联合工程候选 QA

状态：制作候选，尚未完成独立设计评审。v13 的失败帧、源码与完整 take 均保留；此目录不覆盖旧评审材料。

候选字节：

- scene14：`0ce3fbd9e038817840c72b50f30969b76bfd21b50eddf98c38d89098383ab29d`
- prototype14：`c09abff07ddc6b81229fa04e2456853b31c110776ac053d097bd78da6c73434b`
- rig14：`b4f76ba6d814a2791c6c393fc8b43e0fefc836a2d726bf82524466768b4fa95c`

本次仅改变后脚跟随时序（`.40–.67`）、真实路面三角形接触点与鞋底顺坡角，并修复 forced fallback 初态进度非有限数。未改路形、材质、角色原图或正式默认 bundle。

## 正常 native 浏览器首轮

1280×720，正常按住与释放实际走完整圈；没有强制推进 phase/progress。结束后 viewport 已 reset。时间连续流逝，截图不能替代整段逐帧诊断。

| 图片 | 实际状态 |
|---|---|
| [01-first](01-first.jpg) | 开场。 |
| [02-former-slope-region](02-former-slope-region.jpg) | 实际 travel **48.867m**；不声称正中旧失败点 46.2609m，也不作为完整鞋底穿坡通过证明。 |
| [03-bridge-wide](03-bridge-wide.jpg) | travel **56.723m**，人物完整可见。 |
| [04-bridge-wide](04-bridge-wide.jpg) | travel **58.216m**，真实桥中心附近，人物完整可见、脚目标误差 0。 |
| [05-bridge-wide](05-bridge-wide.jpg) | travel **59.354m**，人物完整可见。 |
| [06-overview-wide](06-overview-wide.jpg) | revealing，人物 40.8px，pitch 权重 .20，额外沉髋 0、无 overreach。 |
| [07-cross-transfer](07-cross-transfer.jpg) | crossing **p=.67** 释放节点，后脚已跟进落地；该采样额外沉髋 .024893m。 |
| [08-end-context-wide](08-end-context-wide.jpg) | complete，exit 3.251m，人物 84.5px，presentationReady=false 的静默结束镜头。 |

[桥段原始 DOM](bridge-wide-states.json)；[跨路采样原始 DOM](cross-transfer-states.json)；[结尾 DOM](end-context-state.json)。

跨路 p=.1333、.2081、.28332、.36252、.4、.47082、.54582、.62082、.67 九个正常 native 采样中，额外沉髋最大 .033567m（不是整个动画逐帧上界）；旧 v13 的 .247159m 峰发生在 p=.66455。新稿 p=.62082 为 0、p=.67 为 .024893m。此轮脚目标误差与腿超距均为 0；这不能代替真实鞋轮廓与实际坡面的独立射线检查。

## 离线可复核检查

[slope-and-cross-check.cjs](slope-and-cross-check.cjs) 实际调用生产方法，结果见 [JSON](slope-and-cross-check.json)。162 个原生 Three 变换姿态、324 双脚方向检查：heel-toe 世界方向与表面法线点积峰 2.54e-15；真实斜面 mesh 射线高度误差 3.67e-9m；scene/rig 的后脚时序吻合至浮点误差。仅 Node 数学/mesh 测试，无浏览器、无完整原画 alpha 与全程 IK 验收。

## 待完成

- 独立 12FPS 正常 native 全程：真实 alpha mesh 足点、跨路身体沉髋、承重鞋轮廓对实际路面三角形、相遇掌点、揭示机位。
- 新 14 的 forced WebGL failure 三态实操；[隔离协议测试页](fallback-protocol.html) 已准备，尚未在此记录中宣称通过。
- Root 的自包含正式匿名九章候选桌面与 390 实测。13 的手机画面不能自动算作 14 的手机验收。
- 最终独立设计评议；本目录不给审美分。
