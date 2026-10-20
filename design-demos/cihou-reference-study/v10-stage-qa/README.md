# v10 场景制作方真实 QA

2026-10-17。此记录为制作方验证，不是独立设计评论，也没有评分。只操作自己新建的 Chrome 测试标签，未操作用户原有标签或私有报告。

## 冻结版本

- `hero-scene-v10.js` SHA256：`19fddce3047dc986c655cc111b4faeada6092331fdfb2b241dd5dc24986bd36a`
- `prototype-v10.html` SHA256：`c6b006a53bcb9c74bafc027d19d8ab806d8a2d9087da21ab13a312b17e0db0e1`
- `hero-character-rig-v10.js` SHA256：`b57cef27a03b1a530f5648186dd997e4fdd9d79a284f79713a78f407441eb355`
- `paper-road-v10.png` SHA256：`23cd5d1968d2651d8692afc5649c4a5be0f26deb97ca91116c56919434e4a754`
- `paper-terrain-v10.png` SHA256：`ea95afe3f51863954b4a8fd7bee736526518e95134d88924566680c8f7cdf67d`

冻结后只继续操作、截图与写验证记录，没有改场景、原型、角色或素材。v8、v9 保留历史版本。

## 冻结后的有效证据

| 真实视口 | 画面 | 证据 |
| --- | --- | --- |
| 1280×720 | 初始局部 | [frozen-wide-00-space.jpg](frozen-wide-00-space.jpg) |
| 1280×720 | 采花，DOM 站立等效高度约186px，所有权为手 | [frozen-wide-01-pick.jpg](frozen-wide-01-pick.jpg) |
| 1280×720 | 走过回程桥下，人物全身可见 | [frozen-wide-02-underpass.jpg](frozen-wide-02-underpass.jpg) |
| 1280×720 | 返回后的一次整体揭示，实际 phase 为 revealing | [frozen-wide-03-return.jpg](frozen-wide-03-return.jpg) |
| 1280×720 | 回到人物、原石与空梗的选择处，脚点停稳 | [frozen-wide-04-choice.jpg](frozen-wide-04-choice.jpg) |
| 1280×720 | 放回同一朵花后的跨路阶段 | [frozen-wide-05-place.jpg](frozen-wide-05-place.jpg) |
| 1280×720 | 完成，路越出左下与右上，入口有局部纸底 | [frozen-wide-06-end.jpg](frozen-wide-06-end.jpg) |
| 1280×720 | 完成后继续轻走至29.252world，已越过首次道路窗口更新阈值24world，未遇断头 | [frozen-wide-07-continued.jpg](frozen-wide-07-continued.jpg) |
| 390×844 | 真正从重载开始完成回程后选择；人物约221px | [mobile-01-choice.jpg](mobile-01-choice.jpg) |
| 390×844 | 放花动作松手后，花已在交界，尚未跨完 | [mobile-02-place-release.jpg](mobile-02-place-release.jpg) |
| 390×844 | 续按完成跨出；人物约135px，路通过两个对角边界 | [mobile-03-end.jpg](mobile-03-end.jpg) |
| 390×844 | 另一次完整重走后的稳定末态；提示计算 opacity=0，人物约135px、exitDistance=5.346 | [mobile-04-end-settled.jpg](mobile-04-end-settled.jpg) |
| 390×844 | 阅读、回顶稳定后重播，再按400ms；phase walking、花仍在原处、exitDistance=0 | [mobile-05-replay-confirmed.jpg](mobile-05-replay-confirmed.jpg) |

目录内不以 `frozen-wide` 开头的旧 wide 帧为开发中证据，不能代替上表冻结版。`mobile-03-end.jpg` 捕获在提示淡出过程中；稳定末态应使用 `mobile-04-end-settled.jpg`。`mobile-04-replay-short.jpg` 是回顶滚动尚未稳定时点击未命中的记录，实际仍为 complete，不作为重播通过证据；重试后以 `mobile-05` 为准。

## 实际操作范围

宽屏和移动端均从重载开始，通过原生坐标长按、松手、续按完成采花、真实绕回、空梗重认、一次整体揭示、选择、放回花、跨路和完成。一次完整回程约50秒；没有调用私有场景接口跳到指定进度。移动端真实 `innerWidth=390`、`innerHeight=844`、`scrollWidth=390`，主图操作时 `scrollY=0`。

手机完整操作为26秒＋26秒续按到 choice；原生点击选择；按4.3秒并释放，动作落稳；再按6.5秒到 complete。另实际点击继续阅读、回到画面、重播，再短按400ms；第一次重播点击发生在平滑回顶期间，没有命中，观察稳定画面后再次原生点击成功。读取测试页捕获的 console error 列表为空。

已执行场景 Node 语法检查。正式模板与完整工作区检查由根任务执行，不能用本次视觉截图代替。

## 尚未覆盖与可评议局限

- 本轮是桌面 Chrome 的真实响应式视口与鼠标操作，不是实体手机、Safari 或触摸设备测试；未实测系统级减少动态效果切换、WebGL硬件失败、键盘全流程。
- 已实际继续走到29.252world并看到第一次几何窗口续接；没有做超过80world的长时运行或性能基准。
- 开场仍能看见部分回弯与桥关系；远处雾化降低其重量，但没有把闭合结构完全藏住。这项构图交由独立评论员判断。
- 人物仍为直立绘本剪纸，不是真3D人物；地面、纸桥、浅石、投影与道具遮挡为原生3D。
- 这是一条单圈回到原地的折返纸桥回路，不宣称严格数学莫比乌斯拓扑。

临时视口已 reset，自己新建的测试标签已关闭。
