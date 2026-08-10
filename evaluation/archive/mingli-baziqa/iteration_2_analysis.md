# Iteration 2 analysis

- Development fold: MingLi-Bench questions 61–70, unseen before prediction.
- Predictions were saved before scoring.
- Exact match: 4/10 = 40%.
- Correct: the immigration event, marriage year, spiritual windfall year and health year.

## Generalizable failure modes

1. A local diagnostic summary omitted the relation `layer`, so stem clashes were mistakenly read as branch clashes.
2. The calculator did not surface half-combinations and arch combinations, losing useful but non-decisive timing evidence.
3. Compound events spanning spouse, business and children need simultaneous multi-pillar activation; single-pillar severity was overweighted.
4. For wealth/property events, direct wealth-star activation and the relevant residence/child interface should outrank a generic “open the storehouse” metaphor.
5. Child sex remains poorly identifiable and should be treated as low-confidence even when a benchmark forces a choice.

## Revision

Added layer-sensitive interpretation, deterministic half-combination/arch labels with tests, and retained the rule that these patterns do not prove transformation. No benchmark answer was added to the skill.
