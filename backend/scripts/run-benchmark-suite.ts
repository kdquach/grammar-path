import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.error("FATAL: GEMINI_API_KEY not configured.");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const BENCHMARK_CASES = [
  {
    id: "C01",
    name: "Present continuous affirmative",
    prompt: 'Generate a TOEIC Part 5 sentence testing present continuous affirmative with clue "right now". Blank: _______. Options: A,B,C,D. Output JSON: {"prompt": "...", "options": [{"key": "A", "text": "...", "isCorrect": false}, ...], "explanationEn": "...", "explanationVi": "..."}',
    expectedRule: "Present continuous for actions in progress now",
    targetVerb: "is updating",
  },
  {
    id: "C02",
    name: "Present continuous negative",
    prompt: 'Generate a TOEIC Part 5 sentence testing present continuous negative ("is not attending"). Blank: _______. Options: A,B,C,D. Output JSON: {"prompt": "...", "options": [{"key": "A", "text": "...", "isCorrect": false}, ...], "explanationEn": "...", "explanationVi": "..."}',
    expectedRule: "Negative continuous aspect",
    targetVerb: "is not attending",
  },
  {
    id: "C03",
    name: "Present continuous questions",
    prompt: 'Generate a TOEIC Part 5 question with inverted syntax ("Is the director _______ the report?"). Blank: _______. Options: A,B,C,D. Output JSON: {"prompt": "...", "options": [{"key": "A", "text": "...", "isCorrect": false}, ...], "explanationEn": "...", "explanationVi": "..."}',
    expectedRule: "Inverted auxiliary question syntax",
    targetVerb: "reviewing",
  },
  {
    id: "C04",
    name: "Present simple versus present continuous",
    prompt: 'Generate a TOEIC Part 5 sentence contrasting routine vs temporary action ("usually works ... but this week _______"). Blank: _______. Options: A,B,C,D. Output JSON: {"prompt": "...", "options": [{"key": "A", "text": "...", "isCorrect": false}, ...], "explanationEn": "...", "explanationVi": "..."}',
    expectedRule: "Habitual routine vs temporary action (3A/3B contrast)",
    targetVerb: "is managing",
  },
  {
    id: "C05",
    name: "Subject-verb agreement",
    prompt: 'Generate a TOEIC Part 5 sentence with subject-verb agreement across an intervening prepositional phrase ("The manager along with his assistants _______\"). Blank: _______. Options: A,B,C,D. Output JSON: {"prompt": "...", "options": [{"key": "A", "text": "...", "isCorrect": false}, ...], "explanationEn": "...", "explanationVi": "..."}',
    expectedRule: "Singular concord with intervener",
    targetVerb: "is conducting",
  },
  {
    id: "C06",
    name: "Distractor plausibility",
    prompt: 'Generate a TOEIC Part 5 question where distractors represent plausible morphological learner errors (e.g. base form, past participle, noun form). Blank: _______. Options: A,B,C,D. Output JSON: {"prompt": "...", "options": [{"key": "A", "text": "...", "isCorrect": false, "distractorRationale": "..."}, ...], "explanationEn": "...", "explanationVi": "..."}',
    expectedRule: "Morphological distractor quality",
    targetVerb: "inspects / is inspecting",
  },
  {
    id: "C07",
    name: "Ambiguous sentence detection",
    prompt: 'Task: Solve this question and state whether it is ambiguous or has multiple defensible keys: "The coordinator _______ the vendor schedule." Options: (A) updates (B) is updating (C) updated (D) update. Output JSON: {"solvedKey": "...", "isAmbiguous": true, "ambiguityReason": "..."}',
    expectedRule: "Identification of dual-defensible aspect due to lack of temporal anchor",
    targetVerb: "updates / is updating",
  },
  {
    id: "C08",
    name: "Incorrect answer-key detection",
    prompt: 'Task: Audit this item: Carrier sentence: "She is _______ the client meeting right now." Proposed answer key is marked as (A) attends. Options: (A) attends (B) attending (C) attended (D) attend. Output JSON: {"isMarkedKeyCorrect": false, "actualCorrectKey": "B", "critique": "..."}',
    expectedRule: "Detection of flawed answer key and recovery of actual correct key",
    targetVerb: "attending",
  },
  {
    id: "C09",
    name: "Explanation accuracy",
    prompt: 'Task: Provide rigorous pedagogical explanation in English and Vietnamese for why "is reviewing" is the correct option in: "Mr. Davis _______ the financial records right now." Output JSON: {"explanationEn": "...", "explanationVi": "...", "grammaticalRuleCited": "..."}',
    expectedRule: "Dual-language explanation fidelity and clue citation",
    targetVerb: "is reviewing",
  },
  {
    id: "C10",
    name: "Professional workplace context",
    prompt: 'Generate a TOEIC Part 5 sentence in executive corporate governance register testing present continuous. Blank: _______. Options: A,B,C,D. Output JSON: {"prompt": "...", "options": [{"key": "A", "text": "...", "isCorrect": false}, ...], "explanationEn": "...", "explanationVi": "..."}',
    expectedRule: "ETS corporate executive register",
    targetVerb: "is overseeing",
  },
];

async function runBenchmark() {
  console.log("================================================================================");
  console.log("PHASE 3.4C.4B.4.2.2: CONTROLLED BENCHMARK ON ACCESSIBLE CANDIDATE");
  console.log("Target Model: gemini-3-flash-preview (Google AI Studio Free Tier Active)");
  console.log("================================================================================");

  const results = [];

  for (const bCase of BENCHMARK_CASES) {
    const timestamp = new Date().toISOString();
    console.log(`\n--- Running Case ${bCase.id}: ${bCase.name} ---`);
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey!,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: bCase.prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 600,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(id);

      const data: any = await res.json();
      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const usage = data.usageMetadata || {};
        console.log(`  -> HTTP 200 OK. Tokens: prompt=${usage.promptTokenCount}, cand=${usage.candidatesTokenCount}, total=${usage.totalTokenCount}`);
        results.push({
          caseId: bCase.id,
          name: bCase.name,
          success: true,
          status: 200,
          timestamp,
          usage,
          rawOutput: text,
        });
      } else {
        console.log(`  -> HTTP ${res.status} Error: ${data.error?.message?.slice(0, 150)}`);
        results.push({
          caseId: bCase.id,
          name: bCase.name,
          success: false,
          status: res.status,
          error: data.error,
          timestamp,
        });
      }
    } catch (err: any) {
      clearTimeout(id);
      console.log(`  -> Exception: ${err.message}`);
      results.push({
        caseId: bCase.id,
        name: bCase.name,
        success: false,
        error: err.message,
        timestamp,
      });
    }

    await sleep(1500); // 1.5s rate-limit pacing
  }

  console.log("\n================================================================================");
  console.log(`BENCHMARK COMPLETED: ${results.filter((r) => r.success).length}/${BENCHMARK_CASES.length} cases executed successfully.`);
  console.log("================================================================================");

  console.log("RAW_BENCHMARK_OUTPUTS_JSON:");
  console.log(JSON.stringify(results, null, 2));
}

runBenchmark().catch(console.error);

