# RecallMap: Learner-State Policy Proposal (v1 draft)

**Status: PROPOSAL. No threshold below is approved.** The owner has approved the *principles*; the numbers and the two options marked **[Choice]** need explicit approval (DR-04) before implementation. Last updated 2026-11-04.

## 1. Approved principles (not up for debate here)

1. Visible labels: **Demonstrated, Partial, Suspected gap, Not assessed, Needs review.**
2. Knowledge state and revision status are **stored separately**. A concept can be Demonstrated and due for revision.
3. No sufficient evidence means **Not assessed**. One wrong answer never creates a Suspected gap.
4. Partial stays Partial until mastery is established.
5. Prerequisite weakness never changes a dependent concept's state (it only affects recommendations).
6. AI inference never overwrites a deterministic classification.
7. Rules are configurable, centralized, **versioned**, and reproducible; historical evidence is never lost.
8. Progress comes from evidence, never time spent, completion, or activity counts.

## 2. Data model for the labels

| Stored | Values | Table |
|---|---|---|
| Knowledge state | `not_assessed`, `partial`, `demonstrated`, `suspected_gap` | `learner_concept_states` |
| Revision status | `not_scheduled`, `scheduled`, `due` (+ `due_at`) | `revision_status` |
| Flags (derived) | `conflicting_evidence` | inside `derivation` |
| **Displayed label** | computed by one pure function `displayLabel(state, revision, flags)` | not stored |

`displayLabel`: if `revision = due` and state is `demonstrated` or `partial`, show the state with a **Needs review** badge ("Demonstrated, needs review"). If state is `suspected_gap`, show the gap (it already implies review). `conflicting_evidence` adds a "mixed results" hint, not a state change. "Needs review" is therefore never a database state.

## 3. Evaluation inputs

The engine reads only **observed, graded** evidence (`evidence.is_inferred = false`) from the learner's answers to **validated** questions. Pending AI grading and unvalidated or flagged questions are excluded until resolved.

| Input | Proposed handling |
|---|---|
| Format weight | multiple choice 0.6, true/false 0.4 (guessable), short answer deterministic 1.0, short answer AI-graded 0.7 |
| Difficulty multiplier | easy 0.8, medium 1.0, hard 1.2 |
| Repeated question | n-th presentation of the same `question_version` by the same learner: weight x 0.5^(n-1) (memorization) |
| Grading confidence | deterministic = 1.0; AI-graded carries its own confidence inside the format weight; answers below a confidence floor are held out until clarified |
| Window | the **last 8 weighted answers** for the concept (recency by order, not wall clock) |
| Wall-clock time | handled **only** by revision scheduling, not by decaying scores |

Per concept, over the window: `W = sum(weight)`, `S = sum(weight x score) / W` (score 0..1), `n` = distinct questions, `sessions` = distinct attempts (sittings).

## 4. Rules (v1 draft thresholds, all configurable)

| Parameter | Draft value |
|---|---|
| `n_min` (distinct questions to classify) | 3 |
| `W_min` (total weight to classify) | 1.5 |
| `W_demo` (weight to be Demonstrated) | 2.4 |
| `sessions_demo` (sittings to be Demonstrated) | 2 |
| `S_demo` | >= 0.80 |
| `S_partial_low` | >= 0.50 |
| Suspected gap | `S < 0.50`, `n >= n_min`, `W >= W_min`, `sessions >= 2` |
| Hysteresis | leave Demonstrated only below 0.70; leave Suspected gap only at 0.55 or above |

Order of evaluation:

1. `n < n_min` or `W < W_min` -> **not_assessed** (the UI still shows "early evidence: 2 correct so far" so learners see that something was recorded; it is just not a classification). **[Choice A]**
   *Alternative [Choice B]:* below the minimum, cap at **partial** instead (closer to the current prototype's "at most partial under 3 questions"). Recommendation: A, because it follows "no sufficient evidence means Not assessed" and "unknown does not mean weak"; B labels a learner as having partial understanding on one answer.
2. Else if `S >= 0.80` and `W >= W_demo` and `sessions >= sessions_demo` -> **demonstrated**.
3. Else if `S < 0.50` and `sessions >= 2` -> **suspected_gap** (still labelled "suspected").
4. Else -> **partial** (this includes strong scores that lack enough weight or sittings, which is how "partial stays partial until mastery is established" is met).

`sessions_demo = 2` is a pedagogical choice (demonstrating across separate sittings is a weak retention signal and prevents a single lucky session). It is the most opinionated parameter; **[Choice C]** is whether to keep it, set it to 1, or drop it. The prototype's demo data shows Demonstrated after one attempt of three questions; under this draft that would be Partial, so the demo data would need updating if approved.

## 5. Edge cases

| Case | Rule |
|---|---|
| One wrong answer | n < 3 -> not assessed; never a gap |
| Same question repeated | diminishing weight; repetition alone cannot reach Demonstrated |
| Mixed results | state by S; `conflicting_evidence` flag when the last 3 scores alternate between >= 0.8 and <= 0.4 |
| Ungraded short answer | excluded until graded; never counted as wrong |
| Question flagged as bad | excluded; states recomputed with a transition reason `question_retired` |
| Learner edits the concept | evidence stays attached to the concept id; description edits do not reset state |
| Concept deleted | evidence retained for history, excluded from progress; restored if the concept is undeleted |
| Prerequisite weak | no change; recommendation rule R1 fires |
| AI misconception guess | stored as inferred evidence; excluded |
| Policy change | recompute states from evidence under the new version; append transitions with `reason = policy_recompute` |

## 6. Reproducibility

Every state row stores `policy_version` and `derivation` JSON: evidence ids used, per-item weights, `W`, `S`, `n`, `sessions`, the rule that fired, and a hash of the thresholds. `policy_versions` keeps immutable snapshots, so any past classification can be re-derived and a policy bump can be dry-run (counting how many learners would change state) before activation. State changes are written to `learner_state_transitions` in the same transaction as the evidence insert.

## 7. Recommendation eligibility (deterministic, Proposed)

| Rule | Eligible when | Suggested activity |
|---|---|---|
| R1 prerequisite | target not Demonstrated and a prerequisite is not Demonstrated (including Not assessed) | study or check the prerequisite first |
| R2 partial | state Partial | targeted practice |
| R3 repeated difficulty | Suspected gap for 2+ sittings | re-explain in another mode, then follow-up check |
| R4 revision due | `revision = due` | retention check |
| R5 ready to proceed | all prerequisites Demonstrated and concept Not assessed | assess or study this concept |

AI may rank and explain items **only from the eligible set**; the server rejects any recommendation id outside it. Recommendations are stored in `recommendations`, separate from completed `activities`.

## 8. Limitations (be honest in the defence)

- Tiny samples: 3-8 answers per concept is statistically weak. Weighted fractions are a heuristic, not an estimate with confidence bounds. A Wilson-interval variant or Bayesian knowledge tracing could replace it later; the versioned policy makes that a controlled change.
- Guessing: weights reduce, but do not remove, the effect of guessable formats.
- Question quality is the largest uncontrolled input (AI-generated questions); the validated/flagged status and human report path mitigate it but do not eliminate it.
- AI-graded short answers are less reliable than objective items; they carry lower weight.
- Thresholds have no empirical calibration yet. Plan: run the draft in **shadow mode** on real attempts, review borderline cases, then approve v1 (or adjust).

## 9. Required test cases (to be implemented with the engine; none executed yet)

All assume medium difficulty and the draft weights.

| ID | Input | Expected |
|---|---|---|
| LS-01 | no answers | not_assessed |
| LS-02 | 1 answer, wrong | not_assessed (not a gap) |
| LS-03 | 2 MCQ correct (n=2, W=1.2) | not_assessed |
| LS-04 | 3 MCQ correct, 1 sitting (n=3, W=1.8, S=1.0) | partial (W < 2.4 and one sitting) |
| LS-05 | 4 MCQ correct across 2 sittings (W=2.4, S=1.0) | demonstrated |
| LS-06 | 3 MCQ, 1 correct, 1 sitting (S=0.33) | partial (needs 2 sittings for a gap) |
| LS-07 | same as LS-06 across 2 sittings | suspected_gap |
| LS-08 | 4 MCQ, 2 correct (S=0.5) | partial |
| LS-09 | currently demonstrated, window S=0.75 | stays demonstrated (hysteresis) |
| LS-10 | currently demonstrated, window S=0.65 | partial |
| LS-11 | same MCQ answered correctly 3 times (weights 0.6, 0.3, 0.15; n=1) | not_assessed |
| LS-12 | 3 T/F correct (W=1.2) | not_assessed |
| LS-13 | 3 T/F + 1 deterministic short, all correct, 1 sitting (W=2.2) | partial |
| LS-14 | pending AI-graded answer | excluded from W and S |
| LS-15 | only inferred-misconception evidence | not_assessed |
| LS-16 | prerequisite suspected_gap, dependent demonstrated | dependent unchanged; R1 eligible only if dependent not demonstrated |
| LS-17 | 10 answers, early ones wrong, last 8 correct | computed on the last 8 only |
| LS-18 | demonstrated + revision due | state demonstrated; `displayLabel` = "Demonstrated, needs review" |
| LS-19 | policy v1 -> v2 recompute | states recomputed, transitions appended with `policy_recompute`, evidence rows unchanged |
| LS-20 | learner states identical under repeated recompute | deterministic (same derivation hash) |
| LS-21 | AI recommendation id not in eligible set | rejected |
