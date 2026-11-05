# RecallMap: Legal and Compliance Overview

**Status: PLANNING. Not legal advice. Every regulatory statement here is a starting point for qualified legal review; nothing here claims RecallMap is compliant or certified.** Last updated 2026-11-04.

## 1. Required legal and information pages (not yet built)

Privacy Policy, Terms of Service, AI Transparency Notice, Cookie Policy (accurate to cookies actually used; the session cookie is strictly necessary, analytics/advertising cookies must not be claimed if absent), Acceptable Use Policy, Copyright and Content Policy, Data Deletion Policy, Accessibility Statement, Child Safety / Minor Protection information.

Plan: real pages in the existing design at `/legal/*`, linked from the footer and account settings, written to describe the **actual** software and processors, reviewed by counsel before launch. Drafting starts in B2 (a privacy policy must exist before real sign-ins) and completes before B8. None exist today.

## 2. Content each page must cover (summary)

- **Privacy:** data collected and why, processing, storage, who processes it (Google sign-in, Aiven, Cloudflare R2, Gemini and the hosting provider; the secondary Gemini credential belongs to a third party and must be disclosed as such if enabled), retention, deletion, user rights, security practices, contact and request procedure, international transfers.
- **Terms:** account duties, acceptable use, AI limitations, educational disclaimer, copyright, availability, suspension/termination, liability limits where lawful.
- **AI transparency:** where AI is used, that outputs can be wrong, how uploaded content is processed, that **deterministic evidence rules decide learner states while AI only explains and personalizes**, how to read recommendations.
- **Copyright/content:** ownership of uploads, user responsibility for rights to uploaded material, complaint and takedown procedure.
- **Child safety:** see 4.

## 3. Regulatory assessment (to verify with counsel)

| Area | Starting points to verify (not conclusions) |
|---|---|
| Nigeria Data Protection Act 2023 and regulator guidance | whether RecallMap is a data controller/processor "of major importance" and any registration duty; lawful bases; data subject rights; retention; cross-border transfer conditions (Aiven region, Cloudflare, Google); breach notification duty and timeline; appointment of a data protection officer |
| Other target markets (**not yet decided which**) | GDPR/UK GDPR, COPPA/FERPA-type regimes if learners in those regions are targeted: DR-14 |
| Third-party processors | data processing terms and transfer mechanisms with each provider; documented in `THIRD_PARTY_PROCESSORS.md` |
| Copyright | notice-and-takedown process; liability positions for user-uploaded educational material |
| AI-specific | disclosure duties; accuracy claims |

## 4. Child safety and minors

RecallMap may be used by school-age learners. No minimum age is invented here. Required review: appropriate minimum age, parental/guardian consent obligations under the applicable law, privacy implications for minors' data (including what is sent to AI providers), safe AI interaction (content controls, no emotional-dependency design, escalation wording), and age-related account safeguards. The memory/profile design avoids storing a minor's age by default; whether onboarding asks for age or education level only is DR-15.

## 5. Compliance checklist (status as of 2026-11-04)

| Item | Status |
|---|---|
| Privacy policy | Not started |
| Terms of service | Not started |
| AI transparency notice | Not started |
| Cookie policy and consent decision | Not started (depends on final cookie inventory) |
| Acceptable use / copyright / deletion policies | Not started |
| Accessibility statement | Not started (needs real audit results) |
| Child safety review | Not started; blocked on DR-15 |
| Data inventory (what, where, why, retention) | Draft in `DATABASE_SCHEMA.md` and `THIRD_PARTY_PROCESSORS.md` |
| Processor list and terms | Draft; Gemini terms and tiers **unverified** |
| Deletion procedure | Designed (`DATABASE_SCHEMA.md` section 7); not implemented |
| Breach response procedure | Not started (B8) |
| Legal review | **Not performed** |

Planned companion documents: `PRIVACY_REQUIREMENTS.md`, `LEGAL_REVIEW_CHECKLIST.md`, `DATA_RETENTION_POLICY.md`, `DATA_DELETION_PROCEDURE.md`, `CHILD_SAFETY_REVIEW.md` (created when their milestone arrives, not as empty placeholders).
