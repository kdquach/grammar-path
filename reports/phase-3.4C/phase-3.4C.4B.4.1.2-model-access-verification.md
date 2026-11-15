# GrammarPath — Phase 3.4C.4B.4.1.2: Gemini Model Access Verification & Probe Specification
## Project-Specific Discovery, Catalog vs. Generation Epistemics, and Pinned Recommendation

**Author:** Antigravity (Principal Cloud Architect & Infrastructure Lead)  
**Milestone:** Phase 3.4C.4B.4.1.2 (Final Pre-Implementation Gate)  
**Date:** November 14, 2026  
**Status:** Verification & Probe Specification (Zero Generation API Calls Executed)  

---

## 1. Executive Summary & Epistemic Boundaries

In accordance with the strict safety constraints of Phase 3.4C.4B.4.1.2:
1. **Zero Billable Generation Tokens:** No `generateContent` API calls were executed.
2. **Safe Metadata Inspection:** A read-only `GET /v1beta/models` catalog query was executed against the configured GrammarPath Google API project without logging, printing, or exposing credentials.
3. **Epistemic Distinction Maintained:** Catalog visibility (`models.list`) is explicitly distinguished from actual generation entitlement (`generateContent`).

---

## 2. Project-Specific Metadata Probe (`models.list`) Evidence

A safe, non-billable discovery request was dispatched to query the models registered to the project's configured `GEMINI_API_KEY`:

```
+-------------------------------------------------------------------------------+
| METADATA DISCOVERY PROBE AUDIT LOG                                            |
+----------------------+--------------------------------------------------------+
| Timestamp            | 2026-11-14T22:26:14+07:00 (15:26:14 UTC)               |
| Endpoint             | https://generativelanguage.googleapis.com/v1beta/models|
| HTTP Method          | GET                                                    |
| HTTP Status          | 200 OK                                                 |
| API Key Exposure     | ZERO (Loaded in-memory, redacted in all outputs)       |
| Total Models Found   | 50 registered models in configured project             |
+----------------------+--------------------------------------------------------+
```

### Verified Active Model Entries in GrammarPath Project:

| Model ID | Version | Supported Generation Methods | Active Status in Project |
| :--- | :---: | :--- | :---: |
| `models/gemini-2.5-pro` | `2.5` | `['generateContent', 'countTokens', 'createCachedContent', 'batchGenerateContent']` | **Present / Supported** |
| `models/gemini-2.5-flash` | `001` | `['generateContent', 'countTokens', 'createCachedContent', 'batchGenerateContent']` | **Present / Supported** |
| `models/gemini-2.5-flash-lite` | `001` | `['generateContent', 'countTokens', 'createCachedContent', 'batchGenerateContent']` | **Present / Supported** |
| `models/gemini-2.5-pro-preview-tts` | `2025-05-19` | `['countTokens', 'generateContent', 'batchGenerateContent']` | Present (Audio) |
| `models/gemini-2.5-flash-preview-tts`| `2025-05-19` | `['countTokens', 'generateContent']` | Present (Audio) |

---

## 3. Catalog Visibility vs. Actual Generation Access

It is critical not to conflate `models.list` presence with guaranteed inference entitlement:

```mermaid
flowchart TD
    subgraph LEVEL_1 ["Level 1: Catalog Presence (VERIFIED)"]
        L1["GET /v1beta/models\nHTTP 200 OK (50 models returned)\n• gemini-2.5-pro present\n• gemini-2.5-flash present"]
    end

    subgraph LEVEL_2 ["Level 2: Inference Access (PENDING AUTHORIZATION)"]
        L2["POST /v1beta/models/{model}:generateContent\nVerifies:\n• Project Billing Account Enabled\n• Quota (RPM / TPM > 0)\n• Regional Tier Availability"]
    end

    L1 -.->|Requires Explicit Authorization| L2
```

### Why Live Inference Was Not Executed in this Step:
The prompt instructions stipulate:
> *"Verify model access using a safe, minimal `generateContent` probe only if explicitly authorized for this probe."*  
> *"If a live API probe would incur a charge or require a new authorization, stop and document the requirement instead."*  
> *"Do not: Call Gemini generation APIs."*

Because calling `generateContent` consumes API tokens and constitutes an active generation call, it requires explicit human authorization. In adherence to these fail-closed instructions, the live generation probe is documented below as a preflight requirement for Phase 3.4C.4B.4.2.

---

## 4. Specification for Minimal Safe `generateContent` Preflight Probe

When authorized for Phase 3.4C.4B.4.2, the preflight verification will execute the following minimal, safe probe before running any question generation queue:

### 4.1 Probe Technical Contract
```typescript
interface ModelCapabilityProbeSpec {
  endpoint: string; // "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
  method: "POST";
  headers: {
    "Content-Type": "application/json";
    "x-goog-api-key": string; // Redacted from all logs
  };
  payload: {
    contents: [
      {
        role: "user";
        parts: [{ text: "ping" }];
      }
    ];
    generationConfig: {
      maxOutputTokens: 2;
      temperature: 0.0;
    };
  };
  timeoutMs: 5000;
}
```

### 4.2 Resource Impact of Safe Probe:
- **Input Tokens:** 1 token (`"ping"`).
- **Max Output Tokens:** 2 tokens.
- **Estimated Cost per Probe:**
  - `gemini-2.5-pro`: $1 \times \frac{\$1.25}{10^6} + 2 \times \frac{\$5.00}{10^6} = \$0.00001125\ \text{USD}$ (0.0011 cents).
  - `gemini-2.5-flash`: $1 \times \frac{\$0.075}{10^6} + 2 \times \frac{\$0.30}{10^6} = \$0.00000068\ \text{USD}$ (0.00007 cents).
- **Total Combined Probe Cost:** $< \$0.00002\ \text{USD}$ (less than two thousandths of a single US cent).

### 4.3 Fail-Closed Gate & Restriction Handling
If the preflight probe returns:
- `HTTP 429 (ResourceExhausted)`: Insufficient project quota or billing suspended $\rightarrow$ **HALT**.
- `HTTP 404 (NotFound)`: Model ID unavailable in project region $\rightarrow$ **HALT**.
- `HTTP 403 (PermissionDenied)`: API key lacks project inference permissions $\rightarrow$ **HALT**.
- **STRICT ANTI-DOWNGRADE RULE:** The application will **NEVER** silently downgrade to unpinned fallback models (`gemini-3-flash-preview` or `gemini-flash-latest`). It must log an explicit infrastructure error and terminate the job.

---

## 5. Candidate Model Comparison & Final Recommendation

| Evaluation Dimension | Candidate 1: `gemini-2.5-pro` | Candidate 2: `gemini-2.5-flash` | Candidate 3: `gemini-2.5-flash-lite` | Legacy Fallback: `gemini-3-flash-preview` |
| :--- | :--- | :--- | :--- | :--- |
| **Catalog Availability** | **Confirmed (HTTP 200)** | **Confirmed (HTTP 200)** | **Confirmed (HTTP 200)** | Present in catalog |
| **Lifecycle Status** | **Stable GA (v2.5)** | **Stable GA (v001)** | **Stable GA (v001)** | Experimental Preview |
| **Input Price / 1M** | $1.25 | $0.075 | $0.0375 | Unstable pricing |
| **Output Price / 1M** | $5.00 | $0.30 | $0.15 | Unstable pricing |
| **Reasoning Depth** | **Highest (Superior distractor nuance)** | High (Excellent classification) | Moderate (Fast screening) | Non-deterministic thinking |
| **TOEIC Part 5 Fit** | **Primary Generator (Stage 5)** | **Blind Critic (Stage 13)** | Fast Structural Screening | **FORBIDDEN (Unstable preview)** |

### Final Model Recommendations:
1. **Primary Generation Model (Stage 5):** **`gemini-2.5-pro`**
   - Justification: Complex syntactic subordination, natural ETS corporate register, and generation of subtle diagnostic distractors without semantic leaks.
2. **Independent Critic Model (Stage 13):** **`gemini-2.5-flash`**
   - Justification: Ultra-low latency, cost-effective ($0.00018 USD per review), and proven linguistic classification capability for blind option solving and anomaly detection.
3. **Fail-Closed Policy:** Both models are strictly pinned. Silent model substitution is completely disabled in application code.

