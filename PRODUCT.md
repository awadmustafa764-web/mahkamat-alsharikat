# Product

<!-- impeccable:product-schema 1 -->

> Source: every fact below was confirmed by the student during the brainstorming sessions and the approved design spec `docs/superpowers/specs/2026-11-24-mahkamat-alsharikat-design.md` (approved 2026-11-24). No separate init interview was run; the spec served as that round.

## Platform

web

## Stack

delegated: Vite static build + vanilla ES modules, GSAP, three.js, pdf.js; deployed to GitHub Pages; a Cloudflare Worker (Plan 3) holds the Gemini key. Chosen by Claude because the student asked Claude to decide and the professor must open it from any device with no key.

## Users

- **The professor** of a university "Financial Statement Analysis" course (Palestine/Jordan). Opens the link on a laptop, gets a one-minute explanation from the student, then explores and tests it alone. Expert reader of financial statements; will probe any number ("where does this come from?").
- **The student** who presents it and must be able to defend every formula without the site.
- Secondary: accounting students and small investors who want a sector-aware reading of a listed company.

## Product Purpose

Turn a listed company's published statements and disclosures into a structured "case": sector-appropriate ratios, line-item anomalies, cross-statement consistency checks, academic models (Piotroski, Altman Z″), auditor-report findings, a financial-health rating, and three questions for management. The professor judges each piece of evidence; the verdict deed records both the model's and the judge's rating. Success: the professor says it is real, accurate, useful and unlike the dashboards of previous semesters.

## Positioning

Not a ratio dashboard: a court of evidence. The engine chooses measures by sector and explains exclusions, every number carries its formula and source page, the judge's decision has a visible consequence, and the site states its own limits.

## Operating Context

Presented live in class or opened by the professor on his own laptop; venue Wi-Fi is unreliable, so preloaded cases work offline. Real data: five audited FY2025 PEX companies (Aziza/Palestine Poultry, Bank of Palestine, Paltel, National Insurance, PRICO) and a 47-company PEX benchmark sample.

## Capabilities and Constraints

- Arabic only, RTL.
- No AI at runtime in the browser; all judgement is deterministic JS (`src/engine`, 114 tests). Plan 3 adds PDF upload read by Gemini via a Worker, extraction only.
- Never an investment recommendation; the rating is about the company's financial health, not the share.
- Higgsfield free plan: ~10 credits, enough for one 5-second video.

## Brand Commitments

- Name: «محكمة الشركات».
- Voice: the court's voice, plain accounting Arabic, no marketing phrases, no exclamation marks; the AI appears as "المدقق" writing in red ink, never as "AI".
- Fixed disclaimer: «تحليل تعليمي مبني على القوائم المنشورة، لا يشمل التقييم السعري، وليس توصية استثمارية.»
- Binding visual constraint chosen by the student: identity «ورق الأستاذ» (see the spec §7).

## Evidence on Hand

- `data/companies/*.json`: 5 audited companies, every line with a PDF page; blind audit 75/75 (`data/sources/audit-2026-11-24.md`).
- `data/pex-benchmark.json`: secondary-source sector sample, spot-checked 15/17.
- `excel/crosscheck-aziza.xlsx`, `docs/worked-example.md`.
- No testimonials, users, or press exist; never fabricate them.

## Product Principles

1. Every number is traceable: value → formula → inputs → page.
2. Admit limits before being asked.
3. The visitor decides; the model explains.
4. Sector first: a measure applied to the wrong sector is a wrong answer.
5. Craft serves the argument; nothing moves without an accounting reason.

## Accessibility & Inclusion

WCAG AA text contrast; full keyboard path through the exhibition; `prefers-reduced-motion` honoured; a non-WebGL 2D fallback with identical content.
