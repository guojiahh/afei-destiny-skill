# Afei Destiny Skill · 阿飞命运探索使用说明

这是仓库中**可直接安装**的技能包，技能 ID 为 `afei-destiny-skill`。Python 计算历法与四柱事实，Codex 按问题加载传统规则，并在独立咨询会话中组织证据、反证和现实选择。根目录的 `evaluation/`、`docs/`、`design-demos/` 不属于安装包。

默认完整咨询交付为一份个人 `final_report.html`。当前 V21 按 **现在 → 之前 → 此后 → 完整解读** 引导：前两景按住沿路看循环与可能的形成路径；此后首次选一项完成有限体验并收卡，已得卡点开直读，仅显式重播才重新播放。一张卡就能进入九章解读，也可以收齐三张后比较。收卡只保存在本页，切章与从头体验保留，刷新新页面后重置。原资源、依据及双底稿下载包含在单份 HTML 中，原作权属见[来源说明](assets/cihou/quiet/wayfinder/PROVENANCE.md)。

具体解释每次来自本次资料。过去可用“你可能曾经……”表达有机制依据的形成路径，不补造具体人物、事件或诊断。完整生成、来源和登记要求见 [HTML 报告协议](references/html-report.md)与[闭环叙事协议](references/loop-narrative.md)。想先看匿名界面，可从[仓库演示指南](https://github.com/guojiahh/afei-destiny-skill/blob/main/docs/SHOWCASE.md)查看截图、下载完整 HTML 或启动本地预览。匿名演示不随独立 Skill 安装，也不能换名当作个人报告。

## 运行环境

- Codex 可读取本地 Skill，并具备运行 Python、读写本地文件的权限。
- Python **3.9–3.13** 和 Git。核心计算依赖 `lunar_python 1.4.8` 已放在 `scripts/vendor/`，无需另外 `pip install`。Git 仅用于获取源码。
- 完整 HTML 用现代浏览器阅读；动态画面依赖 WebGL，减少动态或引擎失败时仍有文字与正文入口。当前交付是本地文件，尚无私有在线托管、账户或跨设备同步。
- Node.js 用于开发时的 JavaScript 行为回归；计算和生成 HTML 不依赖 Node.js。

## 安装

### 1. 检查环境并下载

macOS / Linux 先运行 `python3 --version`，Windows PowerShell 先运行 `python --version`，确认是 **3.9–3.13**；两端均运行 `git --version`。若系统的默认 Python 不在此范围，先安装受支持版本，并用其命令或绝对路径替换下面的解释器。无需创建 `python` 别名。

以下命令在两个平台都可逐行执行，只获取技能所需文件，避免下载历史演示中的大 HTML：

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/guojiahh/afei-destiny-skill.git afei-destiny-source
cd afei-destiny-source
git sparse-checkout set afei-destiny-skill
```

当前独立技能约 **89 MB**。如果已经有完整仓库，直接进入含 `afei-destiny-skill/` 的仓库根目录，跳过下载。开发或查看全部本地演示时，可在克隆目录执行 `git sparse-checkout disable` 完整检出。

### 2. 复制到技能目录

继续在刚才的源码根目录运行，只复制里面的 `afei-destiny-skill/`，目标首层必须直接有 `SKILL.md`。

macOS / Linux：

```sh
SKILLS_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
python3 - "$SKILLS_DIR" <<'PY'
from pathlib import Path
import shutil
import sys

destination = Path(sys.argv[1]) / "afei-destiny-skill"
shutil.copytree("afei-destiny-skill", destination)
print(destination / "SKILL.md")
PY
```

`SKILLS_DIR` 指向 **skills 目录**，不是它的上级。以上沿用官方 `$skill-installer` 的默认位置 `${CODEX_HOME:-$HOME/.codex}/skills`；[当前官方文档](https://learn.chatgpt.com/docs/build-skills)也列出用户级 `~/.agents/skills`。已有安装能识别就保留，不必重装；自定义目标必须属于所用 Codex 的技能发现位置，任意目录不会因复制而自动加载。只保留一份可发现的同名技能。

复制命令会拒绝已存在的目标，不合并旧安装。升级前先备份并移开旧目录，独立咨询工作目录保持原位。

Windows PowerShell：

```powershell
$skillsDir = if ($env:CODEX_HOME) { Join-Path $env:CODEX_HOME "skills" } else { Join-Path $HOME ".codex\skills" }
$destination = Join-Path $skillsDir "afei-destiny-skill"
if (Test-Path -LiteralPath $destination) { throw "目标已存在，请先备份并移开旧安装。" }
New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null
Copy-Item -LiteralPath ".\afei-destiny-skill" -Destination $destination -Recurse
```

### 3. 自检，再切换到咨询工作目录

macOS / Linux：

```sh
cd "$SKILLS_DIR/afei-destiny-skill"
python3 scripts/doctor.py
mkdir -p "$HOME/Documents/命运探索"
cd "$HOME/Documents/命运探索"
```

Windows PowerShell：

```powershell
Set-Location $destination
python scripts/doctor.py
$consultationWorkspace = Join-Path $HOME "Documents\命运探索"
New-Item -ItemType Directory -Force -Path $consultationWorkspace | Out-Null
Set-Location $consultationWorkspace
```

自检应全部显示 `[OK]`；若有 `[FAIL]`，先按错误说明修复环境。自检也会核对完整 HTML 的模板、渲染文件和素材哈希，避免聊完才发现安装不完整。它不发起咨询或生成报告。macOS / Linux 后续使用刚验证过的 `python3`，Windows 使用 `python`；若选择了其他解释器，整个流程持续使用它。

**技能目录放程序，咨询工作目录放你的资料和报告。** 将上面的“命运探索”工作文件夹作为 Codex 的当前项目／工作目录，开启会话；CLI 用户可在该目录运行 `codex`。不要在技能安装目录、源码仓库或匿名演示目录开展真实咨询。

输入 `$` 查找 `afei-destiny-skill`；CLI／IDE 也可用 `/skills` 查看。若没有出现，核对安装首层的 `SKILL.md` 与发现目录，再重新打开 Codex。下面的完整咨询示例可直接复制到新会话。

### 从旧名称迁移

2026-10-13 起，项目名、可安装目录和 Skill ID 统一为 `afei-destiny-skill`，旧仓库名为 `bazi-analysis-skill`，旧技能 ID 为 `bazi`。

已有用户安装新目录后，改用 `$afei-destiny-skill`。旧 `$bazi` 调用不会自动成为新 ID 的别名；确认迁移成功后，可自行移除旧 `bazi` 安装，避免同时加载两个版本。真实咨询仍使用原有独立会话目录，迁移前应备份相关会话，保留状态文件、产物和血缘，不覆盖或重新初始化旧咨询。

## 怎么提问

### 从第一次对话到完整 HTML

在自己的咨询工作目录里打开 Codex，复制：

```text
请用 $afei-destiny-skill 带我完成一次分步咨询，最终生成可本地打开的完整 HTML 报告。
先问我出生资料和本次最关心的问题，再带我完成排盘、开场反馈与深入分析。
把本次咨询保存在当前工作目录下独立的 consultation_state 会话中，不写入技能安装目录。
资料足够后直接完成双底稿、生成和校验 final_report.html，最后给我报告的绝对路径和可点击入口。
```

| 你会经历什么 | 你需要做什么 | 接下来会得到什么 |
|---|---|---|
| 确认输入 | 提供公历／农历日期、时间、性别口径和关注方向；不确定处直说 | 独立会话目录与明确的计算口径 |
| 排盘与审计 | 核对输入，接近时间边界时确认口径 | 由脚本计算的四柱与盘面说明 |
| 开场反馈 | 回应预先锁定的默认四条判断，如“1准；2部分准，准在……；3不准；4不确定” | 一次反馈结算；不确定可以保留 |
| 深入一个现实问题 | 按提示讲具体场景、已经做过什么和最难的部分 | 随反馈修正的理解、现实条件与可尝试的选择 |
| 生成完整 HTML | 确认必要资料已表达；上面的请求已授权最终生成 | 本次双底稿、有来源的九章正文、交互场景与校验后的文件入口 |

咨询需要你逐步参与反馈。最终解释会区分计算事实、可能的理解与现实选择，并为重要判断保留支持、反证和未知。

### 报告在哪里，怎样打开

默认文件位于你的工作目录中：

```text
命运探索/
└─ consultation_state/
   └─ <本次会话目录>/
      ├─ session_state.json
      ├─ final_report.html
      ├─ final_report.md
      └─ technical_analysis.md
```

以 Codex 返回的**绝对路径**为准。点击文件入口，或在 Finder／资源管理器中找到 `final_report.html`，用现代浏览器打开。完整 HTML 包含场景、正文与底稿下载，单份约 68 MB，首次加载需稍等。阅读顺序是现在、之前、此后、完整解读；一张选择卡即可进入正文，也能继续收集和比较。

如果对话停在排盘或文字分析，可以继续说：“请接着完成这次咨询，并生成、校验完整的 `final_report.html`，给我可打开的文件入口。”两份 Markdown 同时保留，用于依据核对和后续修订。

### 以后怎样继续

在 Codex 中重新打开**同一个咨询工作目录**，复制：

```text
请用 $afei-destiny-skill 查找当前工作目录里已保存的咨询，列出可继续的会话让我选择。
选定后先核对状态和来源，再继续剩余咨询或更新这次完整 HTML；保留已有会话记录。
```

也可以直接提供上次返回的会话目录。出生资料或解释需要更正时明确告诉 Codex，让它按本次状态更新相关产物。保留整个 `consultation_state/<本次会话目录>/` 才能继续；单独的 HTML 用于阅读。

### 直接问一个主题

一个可靠的请求通常包含：

- 公历或农历出生日期；农历需注明是否闰月。
- 出生时间或时辰；不知道时可以明确写“时辰未知”。
- 传统大运顺逆计算采用的性别口径。
- 一个具体问题，例如事业、关系、学业或某个年份。

示例：

```text
请用 $afei-destiny-skill 分析：公历 1990-05-15 14:30，女性，出生地上海。
我只问 2026–2027 年是否适合换工作。请区分排盘事实、命理判断和现实建议，
给出最强支持证据与一个最强反证，不要做确定性承诺。
```

如果时间接近 23:00、节气或时辰边界，技能会优先说明口径差异；出生地只在真太阳时校正有意义时需要。

## 直接使用计算器

从技能目录运行；macOS / Linux 用 `python3`，Windows 或已激活虚拟环境时可用 `python`：

```sh
python3 scripts/calculate_bazi.py --date 1990-05-15 --time 14:30 --gender female --target-year 2026 --compact
```

此命例未传经度，采用民用时；`four_pillars.text` 为 `庚午 辛巳 庚辰 癸未`，`target_year.ganzhi` 为 `丙午`。命令只计算，不自动完成咨询或生成 HTML。

常用参数：

| 参数 | 用途 |
|---|---|
| `--calendar solar\|lunar` | 指定公历或农历输入 |
| `--leap` | 农历输入为闰月 |
| `--day-boundary zi-next\|civil-midnight` | 选择晚子换日或民用午夜换日 |
| `--longitude` | 提供出生地经度以计算真太阳时 |
| `--target-year` | 加入指定年份和当步大运上下文 |
| `--compact` | 输出单行 JSON，便于程序处理 |

完整口径见 [`references/calculation-conventions.md`](references/calculation-conventions.md)。

提供经度和时区后，输出中的 `time_basis_comparison` 会同时保留民用钟表盘与当前主口径盘。两者跨时辰不表示出生时间不准确：主盘时柱继续完整分析，另一盘只用于检查哪些结论对时间口径敏感。

## 目录职责

| 路径 | 职责 |
|---|---|
| `SKILL.md` | 识别任务模式、路由资料、约束输出边界 |
| `scripts/calculate_bazi.py` | 计算历法、四柱、大运、流年和关系事实，并输出民用时与主口径盘对照 |
| `scripts/test_calculate_bazi.py` | 计算器回归测试 |
| `scripts/blind_opening.py` | 开场盲测资格过滤、跨领域选择、哈希锁定与反馈结算 |
| `scripts/test_blind_opening.py` | 盲测引擎回归测试 |
| `scripts/consultation_harness.py` | 多会话发现、独立目录创建、阶段门禁、产物血缘、替代/重启和来源防火墙 |
| `scripts/consultation_output_router.py` | 对话、技术审计、总结与报告来源的活动产物路由 |
| `scripts/validate_final_report.py` | 固定用户报告的读者优先顺序，拒绝技术章节重新前置 |
| `scripts/generate_html_report.py`、`scripts/render_quiet_report.py`、`scripts/render_wayfinder_report.py` | 初始化来源模型、按版本分派、校验并内嵌原资源生成离线 HTML |
| `assets/cihou/` | 用户八节／技术十一节底稿、九章模型与 quiet 页面资产 |
| `scripts/doctor.py` | Python、依赖、固定命例、HTML 模板与素材完整性、会话目录可写性自检 |
| `scripts/test_consultation_harness.py` | 完整会话 Harness 与输出路由回归测试 |
| `scripts/vendor/` | 内置 `lunar_python 1.4.8`，支持离线运行 |
| `references/runtime-setup.md` | 确认解释器、绝对安装路径和独立用户工作目录，统一跨平台脚本调用 |
| `references/calculation-conventions.md` | 计算参数和边界口径 |
| `references/reasoning-protocol.md` | 事实、结构、触发和反证流程 |
| `references/structure-analysis.md` | 旺衰、格局、从格、调候和多种用神语义 |
| `references/relations-and-transformations.md` | 合冲刑害、三合三会、合化与墓库的分层判断 |
| `references/domain-rules.md` | 事业、财运、关系等领域映射 |
| `references/temporal-reasoning.md` | 大运、流年与事件窗口 |
| `references/consultation-output.md` | 完整咨询与聚焦咨询的表达方式 |
| `references/guided-consultation.md` | “开始预测”统一入口、七阶段状态与每轮参与闭环 |
| `references/preblind-analysis.md` | 盲测前的完整盘面审计、疑点与用户偏好隔离 |
| `references/opening-blind-reading.md` | 默认四条开场盲测的候选门禁、运行方式与一次结算转场 |
| `references/client-voice.md` | 温暖、具体、不迎合的客户语言与反馈回应 |
| `references/evidence-feedback.md` | 用户反馈标注、首次锁定与防事后改写协议 |
| `references/consultation-harness.md` | 会话集合目录、继续/新开决策、恢复、操作语义、状态血缘与信息防火墙 |
| `references/output-routing.md` | 对话、审计、总结、双底稿来源与默认 HTML 的输出边界 |
| `references/html-report.md` | 默认个人 HTML、模型编排、生成登记、完整覆盖与更新规则 |
| `references/loop-narrative.md` | 个人六节点、可能形成路径、选择反馈与四步引导 |
| `references/markdown-report.md` | 先讲重点问题和人生全景的用户报告固定格式、未来展望与交付检查 |
| `references/technical-report.md` | 独立技术分析文档的来源、结构、一致性和隐私边界 |
| `references/classical-texts.md` | 古籍来源、流派冲突与新规则入库门槛 |
| `references/worked-examples.md` | 不含评测数据的合成示例 |

技能会按问题读取所需资料，不应一次加载全部参考文件。

## 开发验证

完整开发回归还需要 Node.js（CI 使用 Node 22）；正常咨询和 HTML 生成不需要。只拿到独立 Skill 时，在技能目录执行；macOS / Linux 未激活虚拟环境时将 `python` 换成 `python3`：

```text
python -m unittest discover -s scripts -p "test_*.py"
python scripts/doctor.py
python scripts/calculate_bazi.py --help
python scripts/blind_opening.py --help
python scripts/consultation_harness.py --help
python scripts/consultation_output_router.py --help
python scripts/validate_final_report.py --help
```

修改计算逻辑时应先补测试；修改推理规则时应给出适用条件、反例和冲突口径。Benchmark 相关内容必须继续留在仓库根目录的 `evaluation/` 中。

完整仓库中另有 `tools/check_workspace.py`、匿名 V21 构建和隔离评测；这些入口不在独立 Skill 目录。源码仓库的开发环境与完整验证入口见[参与开发](https://github.com/guojiahh/afei-destiny-skill/blob/main/CONTRIBUTING.md)；2026-08-11 的知识补全历史见[知识与推理缺口审计](https://github.com/guojiahh/afei-destiny-skill/blob/main/docs/KNOWLEDGE_AUDIT.md)。这些仓库文档不随独立 Skill 安装包分发。

## 使用边界

- 不凭记忆心算日柱、大运或节气交界。
- 不把五行数量直接等同于旺衰或喜忌。
- 不编造古籍引文、用户经历或确定性灾祸。
- 健康、财务、法律和人生决策以现实证据与专业意见为准。

本技能用于传统文化研究与娱乐参考。
