# v11 路线工程 QA（未评审草稿）

制作方只读 QA，不评分。范围为修复手机 reveal pitch 前的 v11 初次长按完整路线、choice 与出口；未读取或修改产品代码，所有动作均经独立 Chrome 标签的 CUA UI 完成。

1280×720，所有保存帧 scrollY=0。路线已到 complete，出口进度 1；可见“再看一次 / 继续阅读”。

- `qa-route-02-held-26s.jpg`：取花后 returning，花随角色携带。
- `qa-route-03-returning.jpg`：reconsidering，角色持花，石旁保留空梗。
- `qa-route-04-choice.jpg`：choice 与可见出口 CTA。短揭瞬间未单独截获，此帧不作 revealing 证据。
- `qa-route-05-exit-click.jpg`：native 点击 CTA 后 placing，没有 AX 自动滚动。
- `qa-route-06-placing.jpg` / `qa-route-07-placed-crossing.jpg`：花从 hand 到 ground。
- `qa-route-08-detached-release.jpg` / `qa-route-09-release-still.jpg`：crossing 释放后动作进度从 0.39565 收束到 0.40000，双脚着地；出口进度 0.51。
- `qa-route-10-completed.jpg`：续按 8 秒后 complete，出口进度 1。

逐帧 DOM 属性、时间戳和按住时长见 `qa-route-observations.json`。首次等待 gate、手机与后续 reveal pitch 修复不属于本记录的验证结论。
