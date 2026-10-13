# 参与开发

欢迎改进排盘计算、推理协议、领域规则和咨询表达。这个项目最重要的维护原则是：**计算、解释和评测彼此隔离**。

## 修改前先判断属于哪一层

- 计算事实：修改 `afei-destiny-skill/scripts/`，并补充自动测试。
- 推理或表达：修改 `afei-destiny-skill/references/`，写清适用条件、反例和冲突口径。
- 技能路由：只有任务识别、文件路由或全局边界变化时才修改 `SKILL.md`。
- Benchmark：只放在 `evaluation/`，不得复制原题、答案、人物标识或历史预测进技能包。

## 本地检查

### macOS / Linux 初始化

在仓库根目录执行。项目支持 Python 3.9–3.13，运行依赖已内置于
`afei-destiny-skill/scripts/vendor/`。开发时额外安装 PyYAML，供 Skill 结构校验使用。

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python tools/check_workspace.py
```

`.venv/`、本地 `.env` 配置和 macOS `.DS_Store` 文件不会进入 Git。
新终端需重新运行 `source .venv/bin/activate`；也可以直接使用 `.venv/bin/python`。

日常修改后运行 `python tools/check_workspace.py` 即可一次执行两组测试、环境自检、
空白检查和 Markdown 本地文件目标检查（不检查锚点和引用式链接）。修改 Skill 后使用 `python tools/check_workspace.py --skill`，
它会额外调用本机 Codex 的 `skill-creator/scripts/quick_validate.py`；若该技能安装位置不同，
可通过 `--skill-validator /实际路径/quick_validate.py` 指定。核心运行不需要 PyYAML。

仓库远端通过 `git remote -v` 检查；Git 的提交姓名和邮箱不代表已登录
GitHub。推送代码需要单独配置 GitHub HTTPS 或 SSH 认证。

### Windows PowerShell

历史 Windows 工作区仍可使用下面的验证命令；切换到 Mac 时使用上面的
macOS 命令。两端的虚拟环境需要分别创建，不要复制 `.venv/`。

```powershell
python -m unittest discover -s .\afei-destiny-skill\scripts -p "test_*.py"
python -m unittest discover -s .\evaluation -p "test_*.py"
python .\afei-destiny-skill\scripts\doctor.py
python .\afei-destiny-skill\scripts\calculate_bazi.py --help
git diff --check
```

### 从 Windows 迁移到 Mac

- 原文档中的 `E:\bazi-skill-main` 是旧机器路径；所有命令都在当前仓库根目录运行。
- PowerShell 的反引号续行和 `\` 路径不能直接粘贴进 zsh；在 Mac 上使用 `/` 路径和 `\` 续行，或写成一行。
- 文本换行规则由 `.gitattributes` 管理。旧工作区可能仍包含 CRLF，Git 会提示后续转换；不要对整个仓库批量执行换行转换或 `git add --renormalize .`，以免改变已锁定评测原件。
- `consultation_state/`、`.benchmark-cache/` 和 `dist/*.zip` 被 Git 忽略，GitHub 克隆不会恢复它们。需要继续旧咨询或使用原缓存时，应单独安全迁移，并保留原文件内容与路径关系。
- 核心 Python 功能无需 Node.js；只有重新渲染 `design-demos/render-final.js` 的展示图时才需要 Node.js、Playwright 及可用浏览器。

GitHub 集成授权与本机终端认证相互独立。需要从终端推送时，可安装
[GitHub CLI](https://cli.github.com/)，执行 `gh auth login --hostname github.com --git-protocol https --web`，
随后执行 `gh auth setup-git` 和 `gh auth status`。参见[官方登录说明](https://cli.github.com/manual/gh_auth_login)。

仓库的[自动验证配置](.github/workflows/validate.yml)覆盖 macOS、Windows 和 Linux；
推送到 GitHub 后会运行统一工作区检查。本机测试通过不代表尚未运行的远端任务已通过。

涉及评测时，再按 [`evaluation/README.md`](evaluation/README.md) 的流程进行预登记、答案隔离、预测锁定和评分。

## 内容要求

- 对计算口径使用明确术语，不把流派差异写成唯一标准。
- 引用古籍时必须可核验；无法确认原文时改为概述，不制造引文。
- 新增推理规则时必须写明语境、适用条件、最强反例和冲突口径；只有口诀不得进入自动裁决层。
- 现代资料或开源项目必须先核对许可证；不兼容或非商业许可证内容只能用于比较，不能复制进 MIT 技能包。
- 合成示例必须明确标注，不得伪装成真实用户案例。
- 高风险主题使用条件性、风险管理语言，不诊断、不恐吓、不承诺。
- 不根据已揭晓的 benchmark 答案反向添加只对固定题目有效的规则。

## 提交说明建议

提交或 Pull Request 请说明：

1. 改了哪一层以及为什么。
2. 新增或更新了哪些测试。
3. 是否接触过 benchmark 答案；如有，如何避免泄漏到技能包。
4. 对现有计算口径、输出格式或兼容性是否有影响。
