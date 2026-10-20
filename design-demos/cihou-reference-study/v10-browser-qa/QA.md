# v10 匿名主图浏览器 QA

日期：2026-10-17。目标：`http://127.0.0.1:52781/afei-destiny-skill/assets/cihou/quiet/immersive/prototype-v10.html`。

仅使用 cua_repl 操作独立 Codex IAB 标签页。未读取或修改代码、真实咨询数据、canvas 隐藏状态；未强设剧情。截图均为实际网页画面。没有工具超时。

## 版本与边界

- 01–08：收到生产者最新状态机接通通知前的草稿留档，不能作为新版是否阻断的证据。
- 09–38：收到通知后主动 reload 的第一轮正式 390×844 实测；截图文件名 current 表示该次 reload 后，未读取版本哈希。
- 39：同一入口 reload，1440×900 初始主要构图。
- 40–48：390×844 再次 reload，第二轮补抓短揭示与暂停/继续。
- 测试后恢复临时 viewport，并关闭本人创建的 QA 标签页；未操作他人标签页。

## 实际动作与直接可见反馈

| 流程 | 实际动作 | 直接观察 | 证据 |
| --- | --- | --- | --- |
| 短按与松手 | 主图鼠标短按 350ms 后释放；随后持续按住鼠标/空格 | 女孩继续轻走，提示仍为「按住，陪她走」；后续可持按继续 | [09](09-current-reloaded-mobile.jpg)、[10](10-current-short-press-release.jpg) |
| 采花近景 | 主图持按、松手，真实走近花石 | 镜头放大女孩与花石；后续黄色花出现在女孩肩背，石头只剩空梗 | [15](15-current-paused.jpg)、[18](18-current-after-resume.jpg)、[19](19-current-post-flower.jpg) |
| 绕回同一石 | 携花持续主图持按 | 同一画面路径中的石头只剩空梗，女孩仍携黄色花；出现回望近景 | [20](20-current-carry-flower.jpg)、[21](21-current-empty-stem-return.jpg)、[23](23-current-followup-loop.jpg)、[44](44-reveal-run-stone-look.jpg) |
| 整体短揭示 | 第二轮在回望近景后真实持按 700ms | 镜头拉远，完整蓝色莫比乌斯环、女孩和石头同时可见 | [45](45-reveal-run-turn.jpg) |
| 主动选择 | 点击可见「再往前一步 ↗」 | 该按钮消失，提示变为「按住，往前走」 | [24](24-current-return-closeup.jpg)、[25](25-current-step-selected.jpg) |
| 第一次向前松手 | 主图持按 1700ms 后释放，再截图 | 女孩在蓝路边缘停住，连续画面脚掌接地，可继续操作 | [26](26-current-forward-release-1.jpg)、[27](27-current-forward-rest-1.jpg) |
| 放花松手 | 主图持按 1800ms 后释放 | 黄色花从女孩身上到脚边，女孩仍站在路面；后续持按可继续 | [28](28-current-place-flower-release.jpg) |
| 跨旧路松手 | 主图继续持按 1400ms 后释放，再截图 | 女孩以跨步姿势两脚接地；连续截图位置稳定 | [29](29-current-bridge-release.jpg)、[30](30-current-bridge-rest.jpg) |
| 向前松手 | 主图继续持按 2300ms 后释放，再截图 | 女孩走到向前伸出的蓝路，花留在身后；松手后站稳，可继续持按 | [31](31-current-cross-forward-release.jpg)、[32](32-current-forward-rest.jpg) |
| 结束 | 主图继续持按 8000ms | 出现「再看一次」「继续阅读」 | [33](33-current-ending.jpg) |
| 阅读与返回 | 点击结束「继续阅读」，再点击「回到画面 ↑」 | URL 锚点与视口移到正文，随后回到主图 | [34](34-current-end-reading.jpg)、[35](35-current-end-return.jpg) |
| 重播 | 第一遍在平滑返回尚未稳定时立即用 AX 点击；再次用可见 DOM 按钮点击复核 | 第一遍未明显复位；第二遍确实回到无花初始状态，结束按钮消失，提示恢复「按住，陪她走」 | [36](36-current-replay.jpg)、[37](37-current-replay-settled.jpg)、[38](38-current-replay-second-attempt.jpg) |
| 暂停/继续 | 点击暂停，稍后再截图，再点击继续 | 按钮名由「暂停动画」变「继续动画」，左上图标变三角；两张暂停画面位置稳定；继续后按钮名恢复 | [46](46-current-pause-choice.jpg)、[47](47-current-pause-stable.jpg)、[48](48-current-resume.jpg) |
| 桌面主要构图 | 切到 1440×900 并 reload | 女孩、蓝路、花石及控制入口同时可见 | [39](39-current-desktop-initial.jpg) |

## 问题与复核结论

没有发现阻断完成主流程的确定故障。最初以为一直绕圈，继续实测后采花、回石、选择和结束全部触发，该疑似阻断已撤销。

两个操作边界需要保留：

- 阅读/返回使用平滑滚动，紧接着点击 AX 位置可能落在滚动中的位置；本次重播首次尝试没有明确复位，待页面稳定并使用可见 DOM 按钮复核成功。没有把首次尝试标为重播完成。
- 从暂停按钮点击恢复后，焦点留在该按钮；直接按空格会激活该按钮，再次暂停。点击主图后持按可正常继续。这是实测键盘焦点行为，不判为整个动画不可用。

本记录只报告可直接观察的动作与反馈，不提供设计评分。
