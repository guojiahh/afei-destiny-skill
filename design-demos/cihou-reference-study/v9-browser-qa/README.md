# v9 真实浏览器 QA

2026-10-17；仅用 CUA 的 Codex In-app Browser 操作与截图。未读代码、咨询状态或历史设计评论；未评分、未改产品文件。

## 视口与流程

- 桌面实际 `innerWidth / innerHeight = 1440 / 900`，`clientWidth = scrollWidth = 1440`，见 [初始帧](desktop-00-initial.jpg)。
- 移动新标签最初回到默认尺寸，已重新应用 override 并 reload；实际 `390 / 844`，`clientWidth = scrollWidth = 390`。移动结论使用 [核实帧](mobile-01-verified390-initial.jpg) 及此后的帧。全环、最终入口、阅读状态均再核实无横向溢出。
- 两种尺寸均实际完成：400ms 短按→松手3秒→重复0.4–0.8秒短按至特写→续按全环；fresh reload 后连续10500ms长按；原生坐标点击CTA；续篇、阅读、回顶、重播、再次400ms。动作后均读新AX；长按中的截图是观察同一持续输入。

## 可见结果

- 400ms 后仍走路，3秒观察没有提前取花：[桌面](desktop-02-short400-idle3s.jpg)、[移动](mobile-04-short400-idle3s.jpg)。
- 动作中松手仍完整取花、收包、起身，未丢关键动作：[下蹲后松手](mobile-39-action-release.jpg) → [伸手](mobile-40-action-released.jpg) → [取花](mobile-41-action-released.jpg) → [移向包](mobile-42-action-released.jpg) → [收包](mobile-43-action-released.jpg) → [起身](mobile-44-action-released.jpg)。再松手等待3秒仍特写：[证据](mobile-47-action-released-idle3s.jpg)。
- 单次连续10500ms先相遇、再全环；CTA在全环后出现：[相遇帧](mobile-20-longhold-encounter.jpg)、[释放](mobile-23-longhold-release.jpg)、[CTA稳定帧](mobile-24-longhold-ready.jpg)。
- 原生CTA可点，续篇看到人物、种子样小块、新路、花、回望姿态，最终才出阅读和重播：[种子阶段](mobile-27-cta-new-road.jpg)、[新路](mobile-28-cta-new-road.jpg)、[花](mobile-29-cta-flower.jpg)、[回望阶段](mobile-30-cta-lookback.jpg)、[最终入口](mobile-32-cta-complete.jpg)。
- 阅读、回顶后场景保留、重播及再短按均正常：[阅读](mobile-34-reading-settled.jpg)、[回顶](mobile-36-top-state-preserved.jpg)、[重播再短按](mobile-38-replay-short400.jpg)。桌面对应帧为 desktop-24、26、28。

## 真实问题与边界

- 女孩脚下可见浅色细长线，松手后持续走动时能延长到左下；[mobile-47](mobile-47-action-released-idle3s.jpg)清楚显示。是否作为叙事线保留，请制作人判断。
- 蓝色路面上的“继续按住”字号细、描边感明显，移动端对比较弱；[mobile-07](mobile-07-short800.jpg)。右上阅读字也偏细小；未做颜色对比数值判定。
- 移动CTA/最终入口的DOM命中区域高44px，原生坐标点击成功。正文“回到画面”链接实际高16.5px，能点中但命中区域偏小。
- 回望比取花轻，静态采样没有同样清楚的动作轮廓。
- 续篇名义9.5秒不能按严格墙钟认证。第二轮从native click调用前计时：9.490秒、10.049秒仍无完成按钮，10.498秒首次观察到；含输入派发和AX/截图开销，没有观察到提前显示。详见 [动作JSON](actions.json) 的 mobile-49..54。
- 本轮为真实IAB响应视口与鼠标输入，不代表实体手机触摸、Safari、键盘或减少动态效果测试。关键帧是离散采样，没有视频。
- 已执行临时viewport reset，移动标签异步稳定后回到默认1280×720；见 [复位帧](cleanup-after-viewport-reset.jpg)。原桌面标签仍保留390 override，已关闭两张临时测试标签，移除残留。

完整原始动作、时间和证据名在 [actions.json](actions.json)，最终完整AX在 [mobile-final-ax.txt](mobile-final-ax.txt)。

## 随后的局部修正与 root 复看

上述完整流程记录保留原样。之后制作人仅在 v9 删除遗留连续轨迹，并修正提示、阅读与回顶入口的样式／点击范围，没有改相遇门槛和动作时序。root 重新在实际390×844打开并操作：蓝路上的14px提示有局部纸底，牵绳状细线已消失，取花收包后仍保持特写。见[修后提示](../v9-root-qa/mobile-paper-hint.jpg)、[修后收包继续行走](../v9-root-qa/mobile-after-action-clean.jpg)。实际DOM核实右上阅读12px／44px高、正文回顶44px高。再随后右上阅读也加局部纸底，避免道路经过时同色；正式匿名框架的真图见[蓝路上的入口](../formal-adapter-v9-qa/controls-over-blue.jpg)。后者是合成内容的框架接入预览，不是个人报告。上述局部复看不冒称重跑了完整88帧检查。
