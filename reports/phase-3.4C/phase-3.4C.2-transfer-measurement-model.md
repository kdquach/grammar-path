# GrammarPath — Phase 3.4C.2: Transfer Measurement Model
## Psychometric Architecture for Measuring Independent Grammar Transfer Competence (τ)

**Author:** Antigravity (Advanced Agentic Coding)  
**Milestone:** Phase 3.4C.2 (Design-Only Specification)  
**Date:** November 14, 2026  
**Status:** DESIGN-ONLY (Zero Numerical Calculation in Current Milestone)  

---

## 1. Executive Summary & Measurement Philosophy

GrammarPath distinguishes two fundamentally different cognitive processes:
1. **Foundational Competence ($\theta$):** The learner's ability to recall, formulate, and execute a grammatical rule in focused, low-distraction pedagogical environments (such as English Grammar in Use exercises).
2. **Transfer Competence ($\tau$):** The learner's ability to recognize, isolate, and correctly apply that same grammatical rule when embedded in novel, authentic workplace contexts featuring professional vocabulary, syntactic embeddings, and standardized TOEIC distractors.

This document establishes the formal psychometric measurement model for $\tau$.

### Non-Negotiable Measurement Principles:
1. **Strict Dimensional Orthogonality:** $\theta$, $\tau$, Retention $R(t)$, Accuracy $A$, and Completion $C$ remain completely independent.
2. **Zero Composite Scalar Index:** Any linear combination (such as $0.60\theta + 0.40\tau$) is **firmly rejected**. Conflating foundational understanding with contextual transfer destroys diagnostic utility.
3. **Contextual Independence Requirement:** Evidence for $\tau$ cannot be measured by question count alone. A learner who solves 4 questions using the exact same sentence template has demonstrated transfer in only **1 context**. Minimum $K_{\text{ctx}} \ge 3$ independent contexts are required before $\tau$ can be evaluated.
4. **Design-Only Constraint:** In Phase 3.4C.2, no numerical $\tau$ algorithm is executed in production or staging. The model is specified here as the architectural blueprint for future calibration.

---

## 2. The Multi-Dimensional Competence Space

A learner $i$'s mastery profile for concept $c$ is a vector in an orthogonal 5-dimensional space:

$$\mathbf{M}_{i,c} = \begin{bmatrix} \theta_{i,c} \\ \tau_{i,c} \\ R_{i,c}(t) \\ A_{i,c} \\ C_{i,c} \end{bmatrix} \in \begin{bmatrix} [0, 100] \cup \{\text{null}\} \\ [0, 100] \cup \{\text{null}\} \\ [0.0, 1.0] \\ [0.0, 1.0] \\ [0.0, 1.0] \end{bmatrix}$$

```
                          ▲ Transfer Competence (τ)
                          │
         TRANSFER DEFICIT │       BALANCED MASTERY
         (High θ, Low τ)  │       (High θ, High τ)
         Needs TOEIC context │    Exam-ready
                          │
──────────────────────────┼──────────────────────────► Foundational
                          │                            Competence (θ)
         FOUNDATIONAL     │       ANOMALOUS PROFILE
         DEFICIT          │       (Low θ, High τ)
         (Low θ, Low τ)   │       Guessing / Pattern matching
         Needs theory     │
                          ▼
```

### Why Composite Scoring is Pedagogically Invalid:
Suppose Learner 1 has $\theta = 90$ (understands Present Continuous) and $\tau = 50$ (struggles with business vocabulary in TOEIC Part 5).
Suppose Learner 2 has $\theta = 50$ (does not understand Present Continuous) and $\tau = 90$ (memorized test-taking heuristics or guessed).
A composite score $0.60\theta + 0.40\tau = 74$ would treat both learners identically.
- Learner 1 needs workplace reading practice, not grammar theory.
- Learner 2 has severe grammatical misunderstandings and will fail novel variations.
Combining them into a scalar score conceals the learning defect and misleads the adaptive recommendation engine.

---

## 3. Mathematical Definition of Transfer Competence ($\tau$)

### 3.1 The Evidence Unit: Independent Transfer Context Attempt (ITCA)
Let $\mathcal{A}_{i,c}$ be the set of evaluated learner attempts by user $i$ mapped to concept $c$.
An attempt $a \in \mathcal{A}_{i,c}$ is an **Eligible Transfer Attempt** if and only if:
1. `a.attemptSource == "toeic_practice"`
2. `a.attemptStatus != "unanswered"` and `a.isCorrect != null`
3. `a.questionBankItem.reviewStatus == "approved"`
4. `a.questionBankItem.isLatestApproved == true`
5. `a.questionBankItem.conceptMappingConfidence >= 0.85`
6. `a.questionBankItem.primarySkill in ["direct_grammar", "word_form_morphology"]`

### 3.2 Context Partitioning & Independent Context Count ($K_{\text{ctx}}$)
Let $\mathcal{Q}_{i,c} = \{q(a) \mid a \in \mathcal{A}_{i,c}\}$ be the distinct approved question bank items attempted by learner $i$ on concept $c$.
We partition $\mathcal{Q}_{i,c}$ into contextual equivalence classes $\mathcal{C}_1, \mathcal{C}_2, \dots, \mathcal{C}_K$ using the Contextual Distance Metric $D_{\text{ctx}}(q_1, q_2)$ defined in Phase 3.4C.2 Contextual Diversity Specification:

$$q_1 \sim q_2 \iff D_{\text{ctx}}(q_1, q_2) < 0.50$$

The **Independent Context Count** is the number of equivalence classes:

$$K_{\text{ctx}}(i, c) = |\mathcal{Q}_{i,c} / \sim|$$

**Fundamental Invariant:**
$$K_{\text{ctx}}(i, c) \le |\mathcal{Q}_{i,c}|$$
- If a learner answers 4 questions that all use the template *"The IT technician is not at his desk because he _______ the server hardware in Room 3 right now"*, $D_{\text{ctx}} < 0.50$ between all pairs.
- Therefore, $|\mathcal{Q}_{i,c}| = 4$, but $K_{\text{ctx}}(i, c) = 1$.
- The learner has satisfied only **1 context**, not 4.

---

## 4. Psychometric Target Model: 2PL Item Response Theory (IRT)

In Phase 3.4C.5, once item parameters are calibrated on empirical learner data ($N \ge 300$ attempts per item), $\tau$ will be estimated via Marginal Maximum Likelihood (MML) or Expected A Posteriori (EAP) under a 2-Parameter Logistic (2PL) model:

$$P(Y_{ij} = 1 \mid \tau_i) = \frac{1}{1 + \exp\left(-a_j (\tau_i - b_j)\right)}$$

Where:
- $\tau_i \in (-\infty, +\infty)$ is the learner's latent transfer ability on standard normal metric, scaled to $[0, 100]$ via $\tau_{100} = 50 + 10 \cdot \tau_i$.
- $b_j$ is the **Contextual Item Difficulty**: how challenging the workplace vocabulary, syntax, and distractors make identifying the correct grammatical form.
- $a_j$ is the **Item Discrimination**: how sharply the item differentiates learners with high transfer ability from those who guess.

### 4.1 Cold-Start Heuristic (Pre-Calibration)
Prior to empirical IRT calibration, when a concept meets the minimum evidence sufficiency threshold ($K_{\text{ctx}} \ge 3$), the system computes a deterministic **Context-Discounted Transfer Index** ($TI_{i,c}$):

$$TI_{i,c} = 100 \times \frac{\sum_{k=1}^{K_{\text{ctx}}} \omega_k \cdot y_{i,k}}{\sum_{k=1}^{K_{\text{ctx}}} \omega_k}$$

Where:
- $y_{i,k} \in \{0, 1\}$ is the accuracy on context class $k$ (using the learner's first unassisted attempt within that context).
- $\omega_k$ is a context weight reflecting semantic distance from textbook items:
  $$\omega_k = 0.50 + 0.50 \cdot \min_{q_{\text{tb}} \in \text{Textbook}(c)} D_{\text{ctx}}(q_k, q_{\text{tb}})$$
  - Items closely mimicking textbook phrasing receive lower transfer weight ($\omega \approx 0.50$).
  - Highly novel workplace scenarios receive full transfer weight ($\omega \approx 1.00$).

---

## 5. State Machine & Insufficient-Data Guardrails

Because transfer estimation requires evidence across multiple independent contexts, $\tau$ utilizes an explicit state machine:

```
┌──────────────┐     Attempted      ┌───────────────────┐
│ not_started  │ ─────────────────► │ insufficient_data │
└──────────────┘                    └─────────┬─────────┘
                                              │
                    K_ctx >= 3 independent    │
                    workplace contexts &      │
                    valid IRT/heuristic score │
                                              ▼
                                    ┌───────────────────┐
                                    │    developing     │ (score < 70)
                                    ├───────────────────┤
                                    │    practicing     │ (70 <= score < 85)
                                    ├───────────────────┤
                                    │    proficient     │ (score >= 85, K_ctx < 5)
                                    ├───────────────────┤
                                    │     mastered      │ (score >= 85, K_ctx >= 5)
                                    └───────────────────┘
```

### 5.1 Explicit Insufficient-Data Representation
When $\tau$ cannot be reliably estimated, the API returns `score: null` accompanied by a machine-readable reason code and pedagogical Vietnamese guidance:

```json
{
  "transferCompetence": {
    "status": "insufficient_data",
    "score": null,
    "distinctQuestionCount": 4,
    "independentContextCount": 1,
    "requiredContextCount": 3,
    "reason": "insufficient_contexts",
    "reasonDetail": "Learner completed 4 questions, but all shared the same workplace scenario. At least 2 additional independent scenarios are required.",
    "explanationVi": "Bạn đã làm 4 câu hỏi nhưng các câu này đều có chung ngữ cảnh IT. Hệ thống cần đánh giá thêm ít nhất 2 ngữ cảnh doanh nghiệp độc lập khác để xác nhận năng lực chuyển giao ngữ pháp.",
    "recommendedActionVi": "Làm thêm bài tập TOEIC ở các chủ đề khác (Marketing, Logistics, Quản trị) để hoàn tất đánh giá chuyển giao."
  }
}
```

### 5.2 Complete Reason Code Taxonomy

| Reason Code | Condition | Explanation |
|---|---|---|
| `not_started` | $|\mathcal{A}_{i,c}| = 0$ | No TOEIC practice attempts recorded on this concept. |
| `insufficient_contexts` | $K_{\text{ctx}} < 3$ | Attempts exist, but span fewer than 3 independent context classes. |
| `uncalibrated_parameters` | $K_{\text{ctx}} \ge 3$, but IRT parameters uncalibrated | System awaiting psychometric calibration data. |
| `low_confidence_mapping` | All attempts have mapping confidence $< 0.85$ | Questions not definitively mapped to this micro-concept. |
| `unanswered_only` | All attempts have `attemptStatus == "unanswered"` | Learner skipped questions without submitting answers. |
| `withdrawn_evidence` | Historical attempts were on items subsequently withdrawn | Active eligible contexts dropped below 3 due to editorial quarantine. |

---

## 6. Pedagogical Diagnostics & Adaptive Recommendations

The independent measurement of $\theta$ and $\tau$ enables high-precision pedagogical interventions:

| Diagnostic Pattern | Metric Profile | Pedagogical Diagnosis | Recommended Action |
|---|---|---|---|
| **Classroom Learner** | $\theta \ge 85, \tau < 70$ | High rule comprehension, but struggles with business vocabulary and distractors. | Provide TOEIC Part 5 practice with vocabulary scaffolding and distractor breakdowns. |
| **Test-Taker / Guesser** | $\theta < 70, \tau \ge 85$ | Relies on surface pattern-matching (e.g. looking for "-ing" after "is") without underlying rule understanding. | Return to canonical textbook lessons to build fundamental grammatical structure. |
| **Comprehensive Master** | $\theta \ge 85, \tau \ge 85, R \ge 0.8$ | Genuine mastery. Can apply rule seamlessly across both academic and professional domains. | Schedule spaced maintenance reviews; unlock advanced concepts. |
| **Struggling Learner** | $\theta < 70, \tau < 70$ | Core grammar deficit compounded by contextual difficulty. | Restrict practice to canonical textbook units; do not assign TOEIC items until $\theta \ge 70$. |

---

## 7. Model Boundaries & Limitations

1. **Construct Irrelevance Guard:** $\tau$ measures transfer of *grammar*, not general TOEIC listening or reading vocabulary. Items testing lexical collocations without grammatical variation must never influence $\tau$.
2. **Cold-Start Safeguard:** Until Milestone 3.4C.5 and empirical data collection, $\tau$ will strictly output `insufficient_data`. No speculative numbers will be displayed to learners.
3. **Immutability of Historical Data:** Raw attempts are permanently recorded. If an item's difficulty $b_j$ is recalibrated in the future, historical scores can be re-projected without modifying attempt records.

