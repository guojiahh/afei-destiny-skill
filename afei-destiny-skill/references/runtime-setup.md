# 已安装 Skill 的运行准备

首次执行、解释器变化或脚本失败时读取本文件。所有咨询命令保持在用户工作目录执行；安装目录只用于读取脚本、规则和模板。不要 `cd` 到 Skill 目录，也不要假定存在开发仓库或名为 `afei-destiny-skill/` 的相对路径。

## 解释器与绝对路径

先从本次加载的 `SKILL.md` 的实际绝对路径确定安装位置，不能根据技能名称猜 `~/.codex/skills`。下面的 `CIHOU_SKILL_FILE` 必须替换为该真实路径。`CIHOU_WORKSPACE` 保留用户当前工作目录；若当前目录就是 Skill 或其子目录，先使用本任务已有的用户工作区，不能在安装目录创建咨询。

macOS／Linux（sh、bash 或 zsh）：

```sh
CIHOU_PYTHON="$(python3 -c 'import sys; assert (3, 9) <= sys.version_info[:2] < (3, 14), "Python 3.9–3.13 required"; print(sys.executable)')"
CIHOU_SKILL_FILE='/实际安装路径/afei-destiny-skill/SKILL.md'
CIHOU_SKILL_DIR="$("$CIHOU_PYTHON" -c 'import pathlib,sys; p=pathlib.Path(sys.argv[1]).resolve(strict=True); assert p.name == "SKILL.md" and p.is_file(); print(p.parent)' "$CIHOU_SKILL_FILE")"
CIHOU_WORKSPACE="$(pwd -P)"
CIHOU_STATE_ROOT="$CIHOU_WORKSPACE/consultation_state"
"$CIHOU_PYTHON" "$CIHOU_SKILL_DIR/scripts/doctor.py"
```

第一条失败就先解决解释器，不能继续执行空变量。若 `python3` 不存在或版本不在 3.9–3.13，用已有的版本命令（例如 `python3.13`）重新执行第一条；有项目虚拟环境时也可直接以其 Python 绝对路径执行这条检查。后续固定使用返回的 `sys.executable`，不混用 `python`、`python3` 或环境中的其他解释器。

Windows PowerShell：

```powershell
$CIHOU_PYTHON = python -c "import sys; assert (3, 9) <= sys.version_info[:2] < (3, 14), 'Python 3.9–3.13 required'; print(sys.executable)"
if ($LASTEXITCODE -ne 0 -or -not $CIHOU_PYTHON) { throw '请选择可用的 Python 3.9–3.13 后重试' }
$CIHOU_SKILL_FILE = 'C:\实际安装路径\afei-destiny-skill\SKILL.md'
$CIHOU_SKILL_DIR = & $CIHOU_PYTHON -c "import pathlib,sys; p=pathlib.Path(sys.argv[1]).resolve(strict=True); assert p.name == 'SKILL.md' and p.is_file(); print(p.parent)" $CIHOU_SKILL_FILE
$CIHOU_WORKSPACE = (Get-Location).Path
$CIHOU_STATE_ROOT = Join-Path $CIHOU_WORKSPACE 'consultation_state'
& $CIHOU_PYTHON "$CIHOU_SKILL_DIR/scripts/doctor.py"
```

若 Windows 的 `python` 不可用，先用已安装的启动器版本（例如 `py -3.13 -c 'import sys; print(sys.executable)'`）找到具体解释器，再用该绝对路径执行版本检查并赋给 `$CIHOU_PYTHON`；不要把带参数的字符串 `"py -3.13"` 当成可执行文件路径。

自检失败时先处理其具体错误；计算器依赖已内置，不需要为正常咨询安装 pip 包。安装文件或报告资源缺失时修复完整 Skill 安装，不从开发仓库示例拼装私人报告。

## 会话路径与命令约定

按 [会话协议](consultation-harness.md) 对绝对的 `CIHOU_STATE_ROOT` 执行 `discover`，再按返回结果继续或 `start`。只将用户选定、Harness 返回的准确 `session_dir` 赋给 `SESSION`：

```sh
SESSION='/用户工作目录/consultation_state/Harness返回的会话子目录'
"$CIHOU_PYTHON" "$CIHOU_SKILL_DIR/scripts/doctor.py" --session-dir "$SESSION"
```

```powershell
$SESSION = 'C:\用户工作目录\consultation_state\Harness返回的会话子目录'
& $CIHOU_PYTHON "$CIHOU_SKILL_DIR/scripts/doctor.py" --session-dir "$SESSION"
```

此时才针对所选会话检查可写性；不批量读取其他咨询。`SESSION` 必须是绝对路径，所有个人输入、候选、底稿、模型和 HTML 都保存在该目录。

后续参考文件的 `sh` 命令统一使用上述变量并写成单行。**PowerShell 对应命令是在每行开头加 `& `**，参数及双引号保持相同；例如：

```sh
"$CIHOU_PYTHON" "$CIHOU_SKILL_DIR/scripts/consultation_harness.py" status --session-dir "$SESSION"
```

```powershell
& $CIHOU_PYTHON "$CIHOU_SKILL_DIR/scripts/consultation_harness.py" status --session-dir "$SESSION"
```

路径带空格时始终保留引号。示例中的产物 ID 占位字符串必须替换为当前命令返回的真实 ID。

- Harness `register --path`、计算器重定向、盲测的输入／输出路径都显式传 `"$SESSION/文件名"`，不依赖当前目录解析。
- 输出路由器 `--output`，HTML 生成器的 `--init-model`、`--model`、`--output` 接受相对于 `SESSION` 的文件名；不得在这些相对路径前再次加 `consultation_state/会话名/`。绝对路径也必须位于所选会话内。
- shell 变量不保证跨工具调用保留。新终端或新的执行环境中重新绑定已确认的解释器、安装目录、工作目录和所选会话；不能因此重新发现并擅自换会话。
