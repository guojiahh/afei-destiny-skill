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

## 边界处理

1. 节气边界：必须保留分钟级出生时间；若脚本结果与题给盘不同，题目求解以题给盘为准，并记录差异。
2. 时辰边界：比较民用时与真太阳时；若跨时辰，输出两盘共同结论和分歧项。
3. 晚子时：同时计算两种日界，若日柱改变，不做唯一断语。
4. 时辰未知：不要虚构时柱、大运精确起运时刻或子女/晚年细节。

## `element_profile` 的正确用法

计算器的季节加权只是可复查的启发式初筛。它有助于发现明显偏态，但未完整处理合化、从格、调候、墓库开闭和流派差异。最终判断必须回到月令、通根、透干、制化、气势和题目证据。

关系记录必须同时读 `layer`：同样写“相冲”时可能是天干冲，不可误读成地支六冲。`半合`、`拱`只表示组合条件，是否成化仍要看月令、透干与全局。

## 依赖与复核

计算器固定使用 vendored `lunar_python 1.4.8`，无需联网。回归测试：

```powershell
python -m unittest -v scripts/test_calculate_bazi.py
```

测试夹具只用于核对排盘事实，不包含 Benchmark 答案。
