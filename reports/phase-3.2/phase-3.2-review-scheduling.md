# GrammarPath Phase 3.2 — Spaced Repetition & Review Scheduling Design Report
**Two-Component Memory Dynamics, Stability Growth, and Practice Selection Logic**

- **Date:** 2026-11-13
- **Author:** Senior Learning Architect & Memory Systems Specialist
- **Service Implementation:** [`review.service.ts`](file:///Users/kd.quach03/Documents/grammarpath-app/backend/src/services/review.service.ts)

---

## 1. Cognitive Foundation: Two-Component Memory Model

GrammarPath Phase 3.2 models knowledge retention using Robert Bjork's Two-Component Model of Memory combined with the Ebbinghaus forgetting curve:

1. **Retrieval Strength ($R \in [0, 1]$):** How easily knowledge is accessed right now. It drops continuously over time according to:
   $$R(t) = e^{-\frac{t}{S}}$$
   where $t$ is the elapsed time in days since the last review, and $S$ is Memory Stability.
2. **Memory Stability ($S > 0$):** How slowly memory decays over time (measured in days). Higher stability means longer retention before decay.

```mermaid
graph LR
    subgraph Retention Dynamics
        A["Fresh Study / Review (R = 1.0)"] -->|Forgetting Curve e^(-t/S)| B["Decaying Retention"]
        B -->|R drops below 0.60| C["State: DUE (needs_review)"]
        C -->|Successful Review (>=70%)| D["Stability S expands (S' = S * 2.0)"]
        D --> A
        C -->|Failed Review (<70%)| E["Stability lapses (S' = max(1.0, S * 0.5))"]
        E --> A
    end
```

---

## 2. Stability Growth and Scheduling Rules

### 2.1 Default Stability by Mastery Status
When a concept first enters the scheduling engine:
- If `mastered`: Initial stability $S_0 = 7.0\text{ days}$.
- If `proficient`: Initial stability $S_0 = 5.0\text{ days}$.
- If `practicing`: Initial stability $S_0 = 3.0\text{ days}$.
- If `developing` / `insufficient_data`: Initial stability $S_0 = 2.0\text{ days}$.

### 2.2 Review Completion Dynamics
When a learner completes an assigned review drill for concept $c$:
- Let $A = \frac{\text{Correct}}{\text{Total}}$ be the accuracy of the review drill.
- Let $U$ be the count of unanswered questions.

#### Scenario A: Successful Review ($A \ge 70.0\%$)
- **Stability Growth:** $S_{\text{new}} = \min(60.0, \; S_{\text{old}} \times 2.0)$.
- **Consecutive Correct:** Incremented by 1 ($C_{\text{new}} = C_{\text{old}} + 1$).
- **Next Interval:** $I = S_{\text{new}}$ days.
- **Next Due Date:** $t_{\text{due}} = \text{now} + I\text{ days}$.
- **Review State:** `completed` (or `scheduled` for future date).
- **Mastery Status:** Re-evaluated, restoring from `needs_review` back to `mastered` / `practicing`.

#### Scenario B: Unsuccessful Review ($A < 70.0\%$)
- **Memory Lapse:** $S_{\text{new}} = \max(1.0, \; S_{\text{old}} \times 0.5)$.
- **Consecutive Correct:** Reset to 0 ($C_{\text{new}} = 0$).
- **Next Interval:** 1 day (immediate reinforcement).
- **Next Due Date:** $t_{\text{due}} = \text{now} + 1\text{ day}$.
- **Review State:** `due`.
- **Mastery Status:** Transitions to `developing` or remains `needs_review`.

#### Scenario C: Rescheduled Without Penalty ($U = \text{Total}$, 100% Unanswered)
- If the learner opens a review drill but skips all questions without submitting evaluated answers:
- No stability penalty is assessed.
- Due date is extended by 24 hours.

---

## 3. Practice Question Selection Algorithm

When generating a review drill for concept $c$:
1. **Find Linked Theory Sections:** Query all `theory_sections` linked to concept $c$ via `concept_theory_links` where `confidence IN ('high', 'medium')`.
2. **Find Target Units:** Extract canonical Murphy units associated with these theory sections.
3. **Query Canonical Exercises:** Retrieve exercises from these units.
4. **Prioritize Weak Questions:**
   - First priority: Questions previously answered incorrectly by the learner.
   - Second priority: Questions never previously attempted.
   - Third priority: Random selection from canonical exercise questions.
5. **Sample Size:** 3 to 5 questions per drill session (optimal for micro-learning without learner fatigue).
6. **Anti-Spoiler Guard:** Answer keys (`acceptedAnswers`, `explanation`) are strictly stripped before transmitting the drill payload to the client.

