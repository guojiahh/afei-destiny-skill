# 排盘口径与计算器使用

## 固定口径

- 年柱以立春为界，不以农历正月初一为界。
- 月柱以十二“节”为界：立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒。
- 默认日界为晚子换日：23:00 起按次日的日柱起时；可用 `--day-boundary civil-midnight` 改为民用午夜换日。
- 大运顺逆采用阳男阴女顺、阴男阳女逆。
- 主起运结果采用 `lunar_python` sect 2 的分钟折算；同时保留 sect 1 的日/时辰折算结果作为流派差异。
- 年龄同时区分周岁与虚岁。不要把虚岁标签当作精确生日年龄。

## 命令行

公历：

```powershell
python scripts/calculate_bazi.py --date 1983-10-19 --time 09:58 --calendar solar --gender male --target-year 2011 --compact
```

农历（日期仍写数字；闰月另加参数）：

```powershell
python scripts/calculate_bazi.py --date 1990-04-21 --time 14:30 --calendar lunar --gender female --leap --compact
```

民用午夜换日：

```powershell
python scripts/calculate_bazi.py --date 1990-05-15 --time 23:30 --gender male --day-boundary civil-midnight --compact
```

真太阳时近似校正：

```powershell
python scripts/calculate_bazi.py --date 1990-05-15 --time 14:30 --gender female --longitude 104.07 --utc-offset 8 --compact
```

`--longitude` 是出生地经度，东经为正；`--utc-offset` 为当地当时法定时区。若历史上实行夏令时，用 `--dst-minutes` 显式扣除。程序采用经度差和时间方程的近似校正，不能替代专业天文历表。

计算结果中的 `time_basis_comparison` 同时给出：

- `civil_clock`：用户提供的民用钟表时间对应四柱；
- `primary_chart`：本次实际采用的计算时间和四柱；
- `primary_basis`：`civil_clock_time` 或 `true_solar_time`；
- `crosses_shichen`、`crosses_day_pillar`：两种时间基础是否改变时柱或日柱。

这些字段是口径对照，不是对出生时间准确性的评价。

多个候选年份使用同一尺度比较：

```powershell
python scripts/compare_candidate_years.py --date 1972-11-02 --time 10:00 --gender male --years 1992 1995 1996 1997 1999
```

候选项给出具体日期、节气前后或发生在换运年时，改用精确日期：

```powershell
python scripts/compare_candidate_years.py --date 1963-02-06 --time 12:00 --gender male --candidate-dates 2003-08-08 2003-08-21
```

`--target-date YYYY-MM-DD[THH:MM]` 按起运时刻解析所在大运。只给 `--target-year` 时，
计算器检查整个公历年；若年内换运，`active_luck_cycle` 为 `null`，并在
`active_luck_cycle_candidates` 和 `luck_cycle_contexts` 中同时返回前后两运，禁止默认把
整年归到新运或旧运。

逐年读取 `natal_to_luck`、`natal_to_year`、`luck_to_year` 和
`composite_formations`。`同干`、`同支`与完整干支`伏吟`分开记录；它们只表示重复引动，
不自带吉凶和事件名称。

## 时间输入与时间口径

先分别记录两个维度，禁止混为一个“时柱不准”：

1. **输入确定性**：精确到分钟、只知时辰、时间范围或完全未知；
2. **口径敏感性**：民用钟表时与真太阳时是否得到相同时柱。

用户给出 `09:03` 之类的分钟级记录时，输入是明确的。若真太阳时校正后跨时辰，只说明计算口径会改变时柱，不能说用户时间不准确，也不能省略时柱。

每次盘面锁必须记录一个 `primary_time_basis`：

1. 用户明确选择民用时或真太阳时时，遵从用户选择；
2. 用户未选择、但出生地点和当地法定时区可靠时，默认以真太阳时近似校正为主盘，民用钟表盘为敏感性对照；
3. 缺少可靠出生地时，以民用钟表时为主盘，并说明尚未做真太阳时对照。

主口径一旦选定，就完整计算和分析主盘时柱。候选盘不与主盘平权，只检查以下内容是否会改变：时支合冲刑害、时柱十神与根气、子女/晚年接口、依赖时柱的具体窗口。只有确实被候选盘推翻的结论才标记为“时间口径敏感”；不依赖时柱以及两盘一致的结论照常输出。

用户可见表达采用：

> 你的出生时间记录明确。本次按〔主口径〕采用〔主时柱〕；若改用〔候选口径〕则为〔候选时柱〕。后文以〔主时柱〕完整分析，仅在两种口径会实质改变判断的地方单独提示。

禁止表达：“你的时柱不准”“没有算出时柱”“出生时间有问题”。

## 边界处理

1. 节气边界：必须保留分钟级出生时间；若脚本结果与题给盘不同，题目求解以题给盘为准，并记录差异。
2. 时辰边界：比较民用时与真太阳时；若跨时辰，明确主盘时柱并正常分析，候选盘只列会改变的分歧项。
3. 晚子时：同时计算两种日界，若日柱改变，不做唯一断语。
4. 时辰未知：不要虚构时柱、大运精确起运时刻或子女/晚年细节。
5. 大运交接年：题目有日期或“某节气前后”时必须用精确日期；只有年份时并列前后两运。

## `element_profile` 的正确用法

计算器的季节加权只是可复查的启发式初筛。它有助于发现明显偏态，但未完整处理合化、从格、调候、墓库开闭和流派差异。最终判断必须回到月令、通根、透干、制化、气势和题目证据。

关系记录必须同时读 `layer`：同样写“相冲”时可能是天干冲，不可误读成地支六冲。`半合`、`拱`只表示组合条件，是否成化仍要看月令、透干与全局。目标年份输出的完整矩阵仍然只是计算事实；先确定角色和事件接口，再解释重复、合冲或成局。

## 依赖与复核

计算器固定使用 vendored `lunar_python 1.4.8`，无需联网。回归测试：

```powershell
python -m unittest -v scripts/test_calculate_bazi.py
```

测试夹具只用于核对排盘事实，不包含 Benchmark 答案。
