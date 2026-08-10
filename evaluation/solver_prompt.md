# Blind competition solver contract

Use the exact Bazi Skill directory and the single answer-redacted `questions.json` named in the task. Start from a fresh context.

Allowed reads:

- the named frozen Skill directory and only the references/scripts it routes to;
- the named `questions.json`;
- this contract.

Forbidden reads and actions:

- do not open `.benchmark-cache`, raw HTML, `score.json`, `error_review.json`, prior predictions, Git history or any other evaluation artifact;
- do not use web search, source URLs, identity guessing, remembered biographies, answer-letter distributions or another solver's output;
- do not reveal or score answers;
- do not modify the Skill during a run.

For every question, write one prediction record to the output path named in the task:

```json
{
  "protocol": "structured-predictions-v2",
  "predictions": {
    "question-id": {
      "answer": "A",
      "confidence": 0.55,
      "alternative": "B",
      "calculation_status": "verified | not_needed | blocked",
      "decisive_facts": ["One to three concise pre-reveal facts that distinguish the chosen option"]
    }
  }
}
```

Keep each case together. Use previous questions only as unconfirmed hypotheses; never treat another prediction as a fact. Record concise auditable facts, not hidden chain-of-thought. Complete every ID exactly once, then stop without reading any answer-bearing artifact.
