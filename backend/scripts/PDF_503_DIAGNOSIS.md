# PDF Generation 503 Error — Diagnosis

Diagnostic only. No application files were modified.

## 1. The PDF flow code

**File:** `backend/src/services/ai.service.js`

- `generateResumePdf({ resume, selfDescription, jobDescription })` calls `ai.models.generateContent({ model: "gemini-2.5-flash", ... })` once, then pipes the returned HTML into `generatePdfFromHtml()` (Puppeteer). The 503 happens on the `ai.models.generateContent` call, before Puppeteer ever runs — confirmed by the log line `PDF generation error:` in `interview.controller.js`'s `generateResumePdfController` catch block, which only wraps the whole `generateResumePdf()` call (both the Gemini call and the Puppeteer call share one try/catch).
- **Same model, same method** is used for both flows: `gemini-2.5-flash` via `ai.models.generateContent`, `responseMimeType: "application/json"`, `maxOutputTokens: 8192`, `temperature: 0.2`. The only structural difference is the schema (`geminiResponseSchema` vs `resumePdfSchema`) and the prompt text.
- **Input size is meaningfully larger for the PDF call.** Both prompts embed the same `resume`, `selfDescription`, `jobDescription` values, but the PDF prompt (`generateResumePdf`, lines 175–216) wraps them in ~40 lines of detailed formatting/ATS/HTML instructions (5 numbered sections, each with 3–6 sub-bullets), versus the report prompt (`generateInterviewReport`, lines 130–143) which adds only ~10 lines of instructions. The PDF call is also asked to return a full self-contained HTML document as a JSON string value — structurally a heavier generation task than the report's structured-fields JSON, for a comparable `maxOutputTokens` budget. Net effect: larger prompt, more complex/longer output, likely higher latency per call.
- **No retry/backoff logic exists anywhere in `ai.service.js`.** Both `generateInterviewReport` and `generateResumePdf` call `ai.models.generateContent` exactly once; any transient Gemini-side error (503, 429, etc.) is caught, logged, and immediately re-thrown to the controller, which returns a 500 to the client. There is no exponential backoff, no retry count, and no use of any built-in retry option on the `@google/genai` client.

**File:** `backend/src/controllers/interview.controller.js`

- `generateResumePdfController` catch block (lines 92–99) only logs `error.message` and returns a generic `"Failed to generate PDF resume"` — it does not log `error.status`, `error.code`, or any structured body Gemini may have attached to the error object.

## 2. Gemini API status and quota

- `gemini-2.5-flash` is a stable, generally-available model per Google's model docs (https://ai.google.dev/gemini-api/docs/models) — it is not a preview/experimental model, so it isn't inherently under-provisioned the way a brand-new preview model would be. This lowers (but doesn't eliminate) the likelihood that "model doesn't exist / was deprecated" is the cause.
- Google's official rate-limit page (https://ai.google.dev/gemini-api/docs/rate-limits) does not publish fixed free-tier RPM/TPM/RPD numbers in the fetched content — it states limits are tier-based and visible per-project in AI Studio's rate-limit dashboard. **Action needed from the user:** check the actual free-tier RPM/RPD for the project's API key in AI Studio, since this could not be confirmed from public docs alone.
- Per Google's own developer forum threads and community reports, a Gemini API `503` with `status: "UNAVAILABLE"` specifically means **the model is transiently overloaded on Google's side** — it is explicitly *not* the same as a quota/rate-limit error. Quota exhaustion and per-minute/per-day rate limiting return **429 `RESOURCE_EXHAUSTED`**, not 503. This distinction matters: the error code observed in the Vercel logs (`503`) points away from "ran out of free-tier quota" and toward "Google's backend was momentarily unable to serve the request," which Google's own guidance says to handle with exponential-backoff retries.

## 3. Vercel function limits

**File:** `backend/vercel.json`

```json
{
    "version": 2,
    "builds": [{ "src": "server.js", "use": "@vercel/node", "config": { "maxLambdaSize": "50mb" } }],
    "routes": [{ "src": "/(.*)", "dest": "/server.js" }]
}
```

- No `maxDuration` or `functions` block is configured. This project uses the **legacy `builds`/`routes` schema**, not the modern `functions` config — and Vercel does not allow `functions` and `builds` to coexist in the same `vercel.json`. That means **this project currently has no way to raise or even explicitly set the function timeout** without first migrating off `builds`/`routes` to the `functions` config format.
- Per Vercel's current published limits (https://vercel.com/docs/functions/limitations, fetched 2026), with Fluid Compute (default for projects) the Node.js runtime default **and** Hobby maximum duration is **300 seconds**, and default memory is **2 GB / 1 vCPU**. If Fluid Compute is *not* enabled on this specific project (e.g., an older project that predates the Fluid default), the legacy Hobby ceiling was as low as 10s — this could not be confirmed remotely; it must be checked in the Vercel project's Function settings/observability tab.
- **Could Vercel be killing the function and that looks like a 503 to us?** Unlikely, based on the evidence available. A Vercel-side timeout produces its own distinct error: HTTP 504 with code `FUNCTION_INVOCATION_TIMEOUT`, and the response body would be Vercel's own error page/JSON, not `{"error":{"code":503,...}}`. The error text the user has (`PDF generation error: {"error":{"code":503,"message":...}}`) is shaped exactly like a raw Gemini API error response — the `@google/genai` SDK surfaces the upstream HTTP error body as `error.message`. That strongly suggests the request **did reach Gemini** and Gemini itself returned the 503, rather than Vercel cutting the function off before a response came back.

## 4. Error message detail & logging gap

- Current catch block in `generateResumePdf` (`ai.service.js`):
  ```js
  } catch (error) {
      console.error("generateResumePdf error:", error.message)
      throw error
  }
  ```
  and in the controller:
  ```js
  } catch (error) {
      console.error("PDF generation error:", error.message)
      res.status(500).json({ message: "Failed to generate PDF resume" })
  }
  ```
  Both only log `error.message`. For the `@google/genai` SDK, `error.message` typically already contains the stringified upstream JSON body (which is why the user's screenshot shows `{"error":{"code":503,...}}` at all) — but it can be truncated in log viewers, and it omits fields the SDK may attach separately on the error object itself, such as `error.status` (`UNAVAILABLE` vs `RESOURCE_EXHAUSTED` vs `INVALID_ARGUMENT`), `error.code`, and any `error.details`/`retryInfo` (Gemini includes a suggested retry delay in some 503/429 responses).

- **Suggested logging enhancement (not implemented):** in both catch blocks, log the full error object shape instead of just `.message` — e.g. `console.error("generateResumePdf error:", { message: error.message, status: error.status, code: error.code, details: error.details ?? error.error })` (property names should be confirmed against the actual `@google/genai` error class, e.g. by logging `Object.keys(error)` once in a non-prod test). This would let future log entries show the precise Gemini `status` string (`UNAVAILABLE` = overload, `RESOURCE_EXHAUSTED` = quota, `INVALID_ARGUMENT` = bad request) instead of a truncated generic message, without changing any user-facing behavior.

## Most likely root cause

**Transient Gemini-side model overload (`503 UNAVAILABLE`) on `gemini-2.5-flash`, made worse by having zero retry/backoff logic in `ai.service.js`.** The error shape in the logs matches Gemini's own overload error, not a Vercel timeout. Because the PDF-generation prompt is the larger/heavier of the two Gemini calls (more instructions, larger structured HTML output for the same token budget), it's more exposed to hitting Google's transient capacity limits than the shorter report-generation call — consistent with "report generation works fine, PDF generation intermittently 503s."

## Fix hypotheses (ranked by likelihood)

1. **(Most likely fix) Add retry-with-exponential-backoff around the `ai.models.generateContent` call(s), at minimum for `generateResumePdf`.** A 503 UNAVAILABLE from Gemini is explicitly documented as retryable. 2–3 retries with backoff (e.g. 1s, 2s, 4s) would very likely absorb most transient overload failures without any other change, and fits within Vercel's much larger current duration budget (300s default) with room to spare.
2. **(Likely contributing factor) Shrink/simplify the PDF-generation prompt** to reduce input+output size/latency, lowering the odds of a heavier, slower request landing during a Gemini overload window. Lower risk of regressing other behavior, but a smaller effect than retries.
3. **(Lower likelihood, but cheap to rule out) Confirm the free-tier RPM/RPD for this API key in AI Studio** and check whether the report call + immediately-following PDF call are landing close enough together to occasionally brush a per-minute limit — even though 503 (not 429) is the observed code, ruling this out removes ambiguity, and if the key is genuinely on a very low free tier, the fix would be requesting a paid tier or throttling client-side.

## Sources

- [Gemini API models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- ["Error: The model is overloaded" — Google AI Developers Forum](https://discuss.ai.google.dev/t/error-the-model-is-overloaded/48410)
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)
- [Vercel: Configuring Maximum Duration](https://vercel.com/docs/functions/configuring-functions/duration)
