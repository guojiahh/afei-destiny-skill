# v12 草簇只读 QA（未评审草稿）

制作方只读 QA，不评分。独立 Chrome 标签，真实 1280×720，scrollY=0。没有读取或修改产品代码，没有跑完整路线；仅初始 idle 待花与 native hold 4 秒后的 picking 近景。

观察的两簇位于环内左侧，约 25–30px 宽。原始像素截图与直接 clip 中，轮廓主要是灰绿/灰褐，未见明显红、黄彩边或亮色矩形边界。底部有实像素收束，未见一条清楚的地色缝贯穿整簇底下，因此当前样本不能指认明显整簇悬空。接地暗部较弱，小尺度下无法确认更细的悬根差异。

- `grass-qa-01-wide-idle.jpg`：完整 idle 待花视口。
- `grass-qa-02-wide-inner-clumps.jpg`：两簇原始像素直接 clip（x390,y350,w180,h100）。
- `grass-qa-03-wide-event.jpg`：native hold 4 秒后的 picking 全视口。
- `grass-qa-04-wide-later-clumps.jpg`：松手后整理观察期间自然 idle 到 returning 的后续小草样本直接 clip（x345,y335,w190,h100）；此帧不作 picking 近景证据。

这仅是当前加载版本的局部屏幕观察，不推断技术原因，不代表源 alpha 像素完全无色边；移动端、完整路线与后续热修均未包含。详细 DOM 状态和时间戳见 `grass-qa-observations.json`。
