# RecallMap: AI Provider Comparison (contingency for DR-18)

**STATUS: IN PROGRESS. NOT COMPLETE. NOT A DECISION.** Last updated 2026-11-07. Candidate categories were listed earlier; this document records what has actually been verified so far and what is still open. Do not treat any provider as approved or compliant: a published policy that *permits* minor-facing products is not the same as being compliant (owner instruction), and provider terms change.

**Disclosure of a conflict of interest.** The assistant writing this is Claude, made by Anthropic, one of the providers compared. To compensate, every provider was checked against its own official pages, items that could not be verified are marked as such, and the interim recommendation below is deliberately limited to "what to verify next". Weigh any ranking accordingly and rely on the evaluation harness (section 4) and qualified legal review, not on this assistant's preference.

Labels: **Verified** (official page read on the date given), **Third-party** (not official), **Not verified**.

## 1. Question that matters most: may RecallMap's audience use it?

RecallMap's audience (owner, 2026-11-05): secondary-school students, independent candidates and other learners; not adults-only.

| Provider / surface | What its published terms say about applications used by under-18s | Label |
|---|---|---|
| **Gemini Developer API** | You must be 18+, **and** must not use the Services in an application "directed towards or likely to be accessed by individuals under the age of 18" (Additional Terms effective 2026-03-23; page updated 2026-04-28). Paid tier does not remove this. Unpaid tier additionally: content used to improve products. Source: https://ai.google.dev/gemini-api/terms | Verified (2026-11-05) |
| **Google Cloud / Vertex AI (Gemini)** | Archived Google Cloud "Additional terms for Generative AI Preview products" (2023 versions) contain the **same** prohibition for preview products. The **current GA** Service Specific Terms (sections on Generative AI Services and Use Restrictions for AI/ML Services) were **not read**. Switching to Vertex AI must **not** be assumed to resolve the restriction. Sources: https://cloud.google.com/archive/terms/genai-preview-products-20230925 and https://cloud.google.com/terms/service-terms | Archived text verified; current terms **Not verified** |
| **Anthropic API** | Anthropic's consumer terms exclude under-18s, but its Usage Policy lets **organizations** incorporate the API into products used by minors if they meet its safeguards. The published guidance (updated 2026-03-16) asks organizations serving minors to: comply with applicable child-safety and privacy law (for example COPPA) and say so publicly; **disclose to users that they are interacting with an AI**; and implement technical safeguards that "may include" age verification, content moderation and filtering, monitoring and reporting, and educational resources; Anthropic may provide a child-safety system prompt, will audit periodically, and may suspend accounts with a high violation rate that do not comply. Usage Policy defines a minor as under 18 regardless of jurisdiction. Sources: https://support.claude.com/en/articles/9307344 and https://www.anthropic.com/news/updating-our-usage-policy | Verified (2026-11-07) |
| **OpenAI API** | Official "Under 18 API Guidance": developers serving minors must add safeguards beyond the usage policies, comply with child-protection and privacy law (including COPPA), keep content safe and age-appropriate, and **should not use OpenAI services to process personal data of children under 13 (or the applicable age of digital consent) without first implementing zero data retention in the API**. Consumer terms: 13+, parental permission under 18. Whether ZDR is available to a small account is **not verified**. Source: https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance | Verified (2026-11-07), ZDR eligibility Not verified |
| Mistral, Azure OpenAI, AWS Bedrock (hosting several models), Cohere, open-weight models (self-hosted or third-party hosted) | Not researched | Not verified |

## 2. Other criteria (what is known so far)

| Criterion | Gemini Developer API | Vertex AI (Gemini) | Anthropic API | OpenAI API |
|---|---|---|---|---|
| Data retention and training use | Verified: unpaid content may be used to improve products and read by reviewers; paid not used for improvement, short abuse-detection retention (read 2026-11-05) | Not verified | **Not verified** (read the commercial terms and privacy centre) | **Not verified** (read the platform data-controls and ZDR pages) |
| DPA | Verified: the terms reference a data processing addendum for paid services | Not verified | Not verified | Not verified |
| Available in Nigeria | **Verified** (available-regions page updated 2026-10-22) | Not verified | **Verified**: Nigeria is on the official Supported Regions list for commercial API access (https://www.anthropic.com/supported-countries; docs page https://platform.claude.com/docs/en/api/supported-regions) | Official country list exists (https://developers.openai.com/api/docs/supported-countries) but Nigeria was **not seen** in what I read; a third-party blog says it is supported: **Not verified** |
| Pricing and free allowance | Free tier exists on selected models (third-party price trackers, Oct 2026); official pricing page not read | Not verified | Not researched | Not researched |
| Payment practicalities from Nigeria | Not researched | Not researched | Third-party report that local cards are often declined for international AI APIs: verify before choosing any paid provider | same |
| Tutor quality and reasoning | Not verified (needs our evaluation) | same | same | same |
| Structured-output reliability | Not verified (needs our evaluation); our gateway validates every output with Zod regardless | same | same | same |
| Embeddings | Verified: `gemini-embedding-2` and `-001` | Not verified | **Not verified**; I am not certain Anthropic offers a first-party embedding model | Not verified |
| Document understanding / OCR | Not verified (our pipeline does not depend on it; OCR approach is DR-07) | same | same | same |
| Rate limits, production suitability | Verified: per project, tier-based (2026-11-04); free tier low | Not verified | Not researched | Not researched |

## 3. Interim recommendation (provisional)

1. Keep the Gemini Developer API **only** for synthetic-data development, as the owner decided. Do not use it for any learner-facing production feature.
2. For features that real minors would use, the two providers whose **published terms expressly contemplate minor-facing products with safeguards** are Anthropic and OpenAI. Both require things RecallMap already plans anyway (AI disclosure, a public statement of regulatory compliance, content moderation, child-safety design). Neither is approved; Vertex AI and other providers are undetermined.
3. Do not choose yet. Still to verify from official sources: data retention and training terms, DPA and zero-data-retention eligibility for a small account, pricing and free allowances, payment feasibility from Nigeria, OpenAI's Nigeria listing, embeddings, and the current Google Cloud GA terms. Then run the evaluation below.
4. Legal review remains mandatory (DR-16, DR-18): "terms permit it" is not compliance, and the Nigeria Data Protection Act and parental-consent questions are unchanged.
5. Architecture already supports the switch: `AiProvider` interface, slot/fallback logic and the data-mode guard are vendor-neutral. A new vendor means one adapter plus its failure-kind mapping. Adapter work starts only after DR-18 narrows the candidates.

## 4. Evaluation plan (to be built in B5, synthetic data only)

A provider-neutral harness over the `AiProvider` interface with versioned datasets: grounded tutor answers including wrong-premise and prompt-injection cases; concept and prerequisite extraction from sample materials; question generation validity and ambiguity; short-answer grading agreement with human labels; structured-output validity rate without repair; latency; cost per 1,000 tasks; behaviour on under-18 safety scenarios (age-appropriate tone, refusal of unsafe requests, no dependency-building). Results (with dates and model versions) go in this document; no ranking is published without them.

## 5. Sources and dates checked

Gemini API terms and regions (2026-11-05); Anthropic minors guidance, usage-policy announcement, supported regions (2026-11-07); OpenAI Under-18 API guidance (2026-11-07); Google Cloud archived generative AI preview terms (2026-11-07). Everything else in section 2 marked Not verified has not been checked.
