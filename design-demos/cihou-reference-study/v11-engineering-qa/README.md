# v11 首次相遇工程草稿（未评审，未选择交付）

此副本只处理首次花前相遇保留，以及手机短暂高机位揭示时纸偶被压扁的兼容问题。v10、共用 rig10、图片、正式 bundle 和当前评审记录均未更改；[文件 SHA256](hashes.json) 保留冻结对照。没有新增美术或剧情，没有自行评分。

## 机制

未形成持续按住意图时，女孩在第一次花石前约 0.72m 自然减速站稳、看花，保留同一固定地标。短按沿用 rig 的重心与衣摆反馈，连续不足 0.65 秒的短按不会累积成采花意图。长按后实际走近原采花点，进入原子采花动作；松手允许动作自然收束。之后单圈重遇空梗、一次短揭、choice、放同一朵花和跨路流程沿用 v10。

短暂 revealing / 回近景 choice 期间，按真实机位仰角补纸偶朝镜头的 pitch。local X 鞋底横轴仍在地面；手、花与屏高从实际变换重算，仍保留原生遮挡和接触影。常规行走、采花、放花、跨路镜头没有改此朝向。

公开 phase 不变；getState() 仅新增可选 encounterWaiting，reset() 清空等待状态。动态交互仍由 setInteraction 驱动真实旅行，直接阅读始终可用。

## 真实操作证据

所有操作经独立 Chrome 标签的 CUA 完成，没有调用私有场景 API 跳阶段。手机真实 viewport 390×844，宽屏 1280×720，已保存帧均 scrollY=0 且无横向溢出。自建标签已关闭，临时 viewport 已 reset。

| 操作 / 实际状态 | 画面 |
| --- | --- |
| 宽屏闲看至少 10 秒后 walking，waiting=true，travel=1.754，flower=stem | [idle-01](idle-01-waiting-after-10s.jpg) |
| 原生按住 400ms 后释放，仍同一等待点与原花，没有绕过 | [idle-02](idle-02-after-400ms.jpg) |
| 再实际按住 3 秒，走到 travel=2.260，picking≈.386，站高等效 186.2px | [idle-03](idle-03-after-3s-hold.jpg) |
| 手机闲看后连续三次 400ms，仍 waiting=true / 原花在梗上；再 hold3 秒进入近景 picking≈.425 | [手机三短按](mobile-idle-02-three-short-taps.jpg)、[手机采花](mobile-idle-03-hold3.jpg) |
| 最终 pitch 组合重新从入口闲看并短按，再 hold3 秒采花；pitchWeight=0，事件镜头未受影响 | [最终等待](final-mobile-01-waiting.jpg)、[180ms 身体反馈](final-mobile-02-probe.jpg)、[采花](final-mobile-03-pick.jpg) |
| 最终手机实际绕回原花石后，抓到中途 revealing，pitchWeight=1，角色 70.2px 且竖直可辨 | [短揭中途](final-mobile-05-revealing.jpg) |
| 返回近景 choice，角色 221.3px，原石空梗与纸底按钮可见 | [choice](final-mobile-06-choice.jpg) |
| 出口松手收束到 crossing=.67，双脚稳定；续按完成，exit=1 | [释放](final-mobile-07-cross-release.jpg)、[完成](final-mobile-08-complete.jpg) |
| 原生点击再看，回 walking / travel=.060 / waiting=false / flower=stem；闲看后再次保留首次等待 | [回放](final-mobile-09-replay.jpg)、[再次等花](final-mobile-10-replay-waiting.jpg) |

独立同伴另完成宽屏初次长按至完整 return / choice / place / cross-release / complete，见 [路线 QA 说明](qa-route-notes.md) 与 [逐帧 DOM 记录](qa-route-observations.json)。其版本是在新增 pitch 补丁之前，不能把它作为最终高机位朝向的验证；后续手机最终组合已另行跑完。final-mobile-05-reconsider.jpg 是捕获时预先命名，实际内容是 revealing，与明确命名的 final-mobile-05-revealing.jpg 完全相同，不作 reconsidering 证据。

## 校验与边界

node --check 通过；python tools/check_workspace.py --skill 通过 78+6 tests、doctor、空白、Skill 结构及 Markdown 链接检查。浏览器实跑 error 日志为空。没有测试真实手机硬件、Safari、OS reduced-motion 切换或真实 WebGL 失败；没有对新草稿做独立审美评审，也没有修改正式模板默认版本。
