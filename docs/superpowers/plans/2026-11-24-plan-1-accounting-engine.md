# Plan 1 — Accounting Engine, Data & Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure, fully tested JavaScript engine that turns a company's structured statements + disclosures into a `Case` object (evidence per hall, model rating, judge rating, questions), plus verified data for 5 showcase companies, a PEX sector benchmark sample, and an independent Excel cross-check.

**Architecture:** Pure ES-module functions under `src/engine/`, no DOM, no network. Input = `CompanyData` JSON (schema in Task 2). Output = `Case` (Task 10), the only thing later plans (exhibition UI, upload worker) consume. Every computed number carries its formula and source chain.

**Tech Stack:** Node 22, ES modules, Vitest, exceljs + hyperformula (dev only, for the Excel cross-check), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-24-mahkamat-alsharikat-design.md` (sections 6, 9, 11).

**Later plans (not here):** Plan 2 exhibition + identity + motion; Plan 3 Cloudflare Worker + live PDF upload; Plan 4 Higgsfield video, sound, polish, publish.

## Global Constraints

- Language: JavaScript ESM with JSDoc types; no TypeScript build step.
- No AI, no network, no randomness inside `src/engine/`. Same input → same output.
- Numbers stored as plain `Number` in the company's reporting unit; comparisons use tolerance `tol(total) = max(2, 0.0005 * |total|)`.
- Balance-sheet denominators: **year-end balances** for all ratios, EXCEPT models whose original paper specifies otherwise (Piotroski: beginning-of-year assets; ΔLEVER: average assets; Sloan: average assets). Each evidence item states its basis in Arabic (`"أرصدة آخر المدة"` / `"متوسط الأصول"` / `"أصول أول المدة"`).
- Financial sectors (`bank`, `insurance`) never get Piotroski or Altman; they get an exclusion reason.
- Altman uses **Z″ without the 3.25 constant**: `Z″ = 6.56·X1 + 3.26·X2 + 6.72·X3 + 1.05·X4`, zones: safe `> 2.60`, grey `1.10–2.60`, distress `< 1.10`. Display the EM-score equivalent (`Z″ + 3.25`, zones 5.85 / 4.35) only as a note.
- Model rating labels exactly: `قوي` · `مستقر` · `تحت المراقبة` · `ضعيف`.
- Fixed disclaimer string (export as `DISCLAIMER`): `تحليل تعليمي مبني على القوائم المنشورة، لا يشمل التقييم السعري، وليس توصية استثمارية.`
- All user-facing text Arabic, no marketing phrases, no exclamation marks (spec §7.5).

## Review Focus

1. **Missing optional fields** (e.g. no `inventory` for a services firm, no `interestExpense`): ratio returns `null` with `reason`, never `NaN`/`Infinity`; evidence is skipped, not shown as 0. → Task 4 test `returns null with reason when denominator missing or zero`.
2. **Negative equity or negative net income** (loss-making showcase company): ROE/D/E must not show a misleading positive value; flag `negativeEquity`. → Task 4 test `negative equity yields null ROE and negativeEquity flag`.
3. **Only two years available** (no prior-prior total assets): Piotroski falls back to year-end assets and marks `approximation: true`. → Task 7 test `piotroski falls back to year-end assets when beginning assets missing`.
4. **Rounded published totals** (sum of components off by 1–2 units): integrity passes within tolerance, fails beyond. → Task 3 tests at both edges.
5. **Sector with fewer than 4 benchmark companies**: grading switches to reference bands and evidence says `basis: 'reference'`. → Task 9 test `uses reference bands when n < 4`.

---

## File Structure

```
package.json, vitest.config.js, .gitignore, .github/workflows/test.yml
src/engine/
  constants.js        DISCLAIMER, rating labels, tolerance, hall ids
  schema.js           validateCompany()
  get.js              val(), src(), safeDiv(), growth()
  integrity.js        runIntegrity()
  ratios/common.js    non-financial ratios
  ratios/bank.js      bank ratios
  ratios/insurance.js IFRS 17 insurance ratios
  ratios/investment.js holding/investment ratios
  sectors.js          SECTOR_RULES: applied + excluded(reason)
  trends.js           horizontalVertical(), findAnomalies()
  quality.js          redFlags() incl. Sloan, CFO/NI
  models.js           piotroski(), altmanZpp(), dupont()
  disclosures.js      disclosureEvidence(), pickSurprise()
  benchmarks.js       buildBenchmarks(), gradeRatio(), REFERENCE_BANDS
  rating.js           modelRating(), judgeRating(), confidence()
  questions.js        managementQuestions(), guesses()
  analyze.js          analyze(company, benchmarks) -> Case
  index.js            re-exports
tests/fixtures/       industrial.json, bank.json, insurance.json
tests/engine/*.test.js
data/companies/*.json, data/tickers.json, data/pex-benchmark.json, data/SOURCES.md
excel/build-crosscheck.mjs, excel/crosscheck.xlsx, tests/excel.test.js
docs/worked-example.md
```

---

### Task 1: Repo scaffold + CI

**Files:** Create `package.json`, `vitest.config.js`, `.gitignore`, `.github/workflows/test.yml`, `src/engine/constants.js`, `tests/engine/constants.test.js`

**Interfaces — Produces:** `DISCLAIMER`, `RATING_LABELS = ['قوي','مستقر','تحت المراقبة','ضعيف']`, `HALLS = ['intro','profitability','liquidity','solvency','efficiency','quality','disclosures']`, `tol(total:number):number`.

- [ ] Step 1: `git init`, `npm init -y`, set `"type":"module"`, scripts `test: vitest run`; devDeps `vitest`, `exceljs`, `hyperformula`. `.gitignore`: `node_modules/ .superpowers/ .dev.vars .wrangler/ dist/`.
- [ ] Step 2: Failing test: `tol(100) === 2`, `tol(1_000_000) === 500`, `DISCLAIMER` equals the exact Global Constraints string, `HALLS.length === 7`.
- [ ] Step 3: Implement `constants.js`. Run `npm test` → PASS.
- [ ] Step 4: CI workflow: Node 22, `npm ci`, `npm test` on push/PR.
- [ ] Step 5: Commit `chore: scaffold engine package and CI`.

### Task 2: CompanyData schema + validator

**Files:** Create `src/engine/schema.js`, `src/engine/get.js`, `tests/fixtures/industrial.json`, `tests/fixtures/bank.json`, `tests/fixtures/insurance.json`, `tests/engine/schema.test.js`

**Interfaces — Produces:**
```js
/** CompanyData = {
 *  meta:{id,nameAr,nameEn,ticker,exchange:'PEX'|'ASE',sector:'industrial'|'services'|'bank'|'insurance'|'investment',
 *        activityAr, currency, unit:'1'|'1000', consolidated:boolean, framework:'IFRS'|'IFRS17', years:[cur,prior] },
 *  years:{ [year]: { bs:{}, is:{}, cf:{}, shares:number } },   // each line = {v:number, src:{page:number, doc:string}}
 *  priorPriorTotalAssets?: {v,src},
 *  disclosures:{ auditor:{opinion:'unmodified'|'qualified'|'adverse'|'disclaimer', firm, emphasis:{present,quote,page}|null,
 *                goingConcern:'none'|'material-uncertainty', kams:[{title,quote,page}]},
 *                relatedParties:[{party,nature,amount,page}], contingencies:[{text,amount,page}],
 *                subsequentEvents:[{text,page}], policyChanges:[{text,page}] } } */
validateCompany(data) -> { ok:boolean, errors:string[], missing:string[] }
val(year, stmt, key) -> number|null ; src(year, stmt, key) -> {page,doc}|null
safeDiv(a,b) -> {value:number|null, reason?:string} ; growth(cur, prior) -> number|null
```
Line keys — non-financial `bs`: `cash, receivables, inventory, otherCurrentAssets, totalCurrentAssets, ppeNet, otherNonCurrentAssets, totalAssets, payables, shortTermDebt, otherCurrentLiabilities, totalCurrentLiabilities, longTermDebt, otherNonCurrentLiabilities, totalLiabilities, equityParent, nci, totalEquity, retainedEarnings`; `is`: `revenue, cogs, grossProfit, sga, operatingIncome, depreciation, interestExpense, pbt, tax, netIncome, netIncomeParent, nonRecurring?`; `cf`: `cfo, capex, cfi, cff, dividendsPaid, netChangeCash, fxEffect?, cashBegin, cashEnd`. Bank `bs`: `grossLoans, allowanceLoans, netLoans, npl, deposits, totalAssets, totalLiabilities, totalEquity, equityParent`; `is`: `netInterestIncome, nonInterestIncome, operatingExpenses, provisionExpense, netIncome, netIncomeParent`; plus `capitalAdequacy` (ratio, from notes). Insurance `is`: `insuranceRevenue, insuranceServiceExpenses, netReinsuranceResult, insuranceServiceResult, investmentIncome, netIncome`; `bs`: `totalInvestments, totalAssets, totalLiabilities, totalEquity, equityParent`.

**Industrial fixture values (unit 1000):**
- 2024 BS: cash 200, receivables 300, inventory 250, otherCurrentAssets 50, totalCurrentAssets 800, ppeNet 1000, otherNonCurrentAssets 200, totalAssets 2000, payables 150, shortTermDebt 100, otherCurrentLiabilities 50, totalCurrentLiabilities 300, longTermDebt 400, otherNonCurrentLiabilities 100, totalLiabilities 800, equityParent 1150, nci 50, totalEquity 1200, retainedEarnings 500.
- 2024 IS: revenue 2000, cogs 1400, grossProfit 600, sga 300, operatingIncome 300, depreciation 100, interestExpense 40, pbt 260, tax 60, netIncome 200, netIncomeParent 190. CF: cfo 150, capex 120, cfi -120, cff -50, dividendsPaid 50, netChangeCash -20, cashBegin 220, cashEnd 200. shares 1000.
- 2023 BS: cash 220, receivables 200, inventory 200, otherCurrentAssets 30, totalCurrentAssets 650, ppeNet 980, otherNonCurrentAssets 170, totalAssets 1800, payables 140, shortTermDebt 120, otherCurrentLiabilities 40, totalCurrentLiabilities 300, longTermDebt 450, otherNonCurrentLiabilities 50, totalLiabilities 800, equityParent 960, nci 40, totalEquity 1000, retainedEarnings 380.
- 2023 IS: revenue 1800, cogs 1300, grossProfit 500, sga 280, operatingIncome 220, depreciation 95, interestExpense 45, pbt 175, tax 35, netIncome 140, netIncomeParent 133. CF: cfo 210, capex 100, cfi -100, cff -90, dividendsPaid 40, netChangeCash 20, cashBegin 200, cashEnd 220. shares 1000.
- priorPriorTotalAssets 1700. Auditor unmodified, no emphasis, goingConcern none, one KAM `"تقييم المخزون"` page 12.
- Bank fixture (2024): grossLoans 640, allowanceLoans 40, netLoans 600, npl 40, deposits 800, totalAssets 1000, totalLiabilities 880, totalEquity 120, equityParent 120, netInterestIncome 40, nonInterestIncome 15, operatingExpenses 30, provisionExpense 5, netIncome 18, netIncomeParent 18, capitalAdequacy 0.16 (2023 any consistent values).
- Insurance fixture (2024): insuranceRevenue 500, insuranceServiceExpenses 430, netReinsuranceResult -30, insuranceServiceResult 40, investmentIncome 24, totalInvestments 400, netIncome 30, totalAssets 900, totalLiabilities 650, totalEquity 250, equityParent 250.

- [ ] Step 1: Failing tests: industrial fixture `ok:true`; deleting `meta.sector` → `ok:false` with error mentioning `sector`; services company without `inventory` → `ok:true` and `missing` contains `bs.inventory`; `safeDiv(1,0)` → `{value:null, reason:'المقام صفر'}`; `growth(150,100) === 0.5`; `growth(5,0) === null`.
- [ ] Step 2: Implement; required keys per sector come from one table in `schema.js`.
- [ ] Step 3: `npm test` PASS. Commit `feat(engine): company schema, accessors, fixtures`.

### Task 3: Integrity checks

**Files:** `src/engine/integrity.js`, `tests/engine/integrity.test.js`
**Interfaces — Produces:** `runIntegrity(data) -> { ok:boolean, checks:[{id, year, ok, expected, actual, diff, labelAr}] }`. Check ids: `balance` (TA = TL + TE), `currentAssetsSum`, `currentLiabilitiesSum`, `liabilitiesSum` (TL = CL + LTD + otherNCL for non-financial), `equitySum` (TE = equityParent + nci), `grossProfit` (rev − cogs), `cashRoll` (cashEnd − cashBegin = netChangeCash + fxEffect), `cashTie` (cf.cashEnd = bs.cash). Skip a check (not fail) when its inputs are absent.

- [ ] Step 1: Failing tests: fixture → all ok; `totalAssets 2002` passes (diff 2 ≤ tol); `totalAssets 2010` fails `balance` with `diff 10`; missing `cf` section → `cashRoll` absent from checks, `ok` still true.
- [ ] Step 2: Implement. Step 3: PASS. Commit `feat(engine): integrity checks with tolerance`.

### Task 4: Ratio libraries + sector rules

**Files:** `src/engine/ratios/{common,bank,insurance,investment}.js`, `src/engine/sectors.js`, `tests/engine/ratios.test.js`, `tests/engine/sectors.test.js`
**Interfaces — Produces:** each ratio = `{ id, hall, labelAr, formulaAr, better:'higher'|'lower', compute(data, year) -> {value:number|null, inputs:[{labelAr, value, src}], basisAr, reason?} }`. Export `RATIOS` map by id. `SECTOR_RULES[sector] = { applied: ratioId[], excluded: [{id, reasonAr}] }`; `rulesFor(sector)`.
Common ids & formulas: `currentRatio` CA/CL · `quickRatio` (CA−inventory)/CL · `cashRatio` cash/CL · `dso` receivables/revenue·365 · `dio` inventory/cogs·365 · `dpo` payables/cogs·365 · `ccc` dso+dio−dpo · `assetTurnover` revenue/TA · `grossMargin` GP/revenue · `operatingMargin` EBIT/revenue · `netMargin` NI/revenue · `ebitdaMargin` (EBIT+dep)/revenue · `roa` NI/TA · `roe` NIparent/equityParent · `debtToEquity` TL/TE · `debtRatio` TL/TA · `interestCoverage` EBIT/interest · `netDebtToEbitda` (STD+LTD−cash)/(EBIT+dep) · `cfoToNi` CFO/NI · `fcf` CFO−capex. Bank: `bankRoa`, `bankRoe`, `nimProxy` NII/TA (label says "إلى إجمالي الأصول"), `costToIncome` opex/(NII+nonII), `nplRatio` npl/grossLoans, `nplCoverage` allowance/npl, `loanToDeposit` netLoans/deposits, `capitalAdequacy` (disclosed). Insurance: `insServiceMargin` ISR/insRevenue, `combinedRatio` 1 − ISR/insRevenue, `investmentYield` investmentIncome/totalInvestments, `insRoe`, `equityToAssets`. Investment: `bvps` equityParent/shares, `payoutRatio` dividendsPaid/NI, plus `roe`, `debtRatio`.
Exclusions (exact reasons, Arabic): bank excludes `currentRatio` ("البنك لا يصنّف أصوله إلى متداولة وغير متداولة، والودائع مادته الخام لا دَين تشغيلي"), `dio` ("لا مخزون لدى البنوك"), `debtToEquity` ("الودائع تُضخّم المديونية بطبيعتها")、`piotroski`, `altman` ("النموذج صُمم للشركات غير المالية"); insurance excludes `grossMargin` ("لا يوجد هامش إجمالي في قوائم IFRS 17"), `dio`, `piotroski`, `altman`; services excludes `dio`, `ccc` when inventory missing ("لا مخزون جوهري").

- [ ] Step 1: Failing tests with industrial 2024: `currentRatio 2.6667` (toBeCloseTo 4), `quickRatio 1.8333`, `dso 54.75`, `dio 65.1786`, `dpo 39.1071`, `ccc 80.8214`, `grossMargin 0.3`, `roa 0.1`, `roe 0.165217`, `debtToEquity 0.6667`, `interestCoverage 7.5`, `netDebtToEbitda 0.75`, `cfoToNi 0.75`; 2023 `currentRatio 2.1667`, `dso 40.5556`. Bank: `nplRatio 0.0625`, `nplCoverage 1`, `loanToDeposit 0.75`, `costToIncome 0.545455`, `nimProxy 0.04`, `bankRoe 0.15`. Insurance: `combinedRatio 0.92`, `insServiceMargin 0.08`, `investmentYield 0.06`.
- [ ] Step 2: Review-focus tests: `returns null with reason when denominator missing or zero` (interestExpense 0 → coverage null); `negative equity yields null ROE and negativeEquity flag` (equityParent −50).
- [ ] Step 3: Sector test: `rulesFor('bank').excluded` contains `currentRatio` with non-empty `reasonAr`; no ratio is both applied and excluded in any sector.
- [ ] Step 4: Implement; PASS; commit `feat(engine): sector-aware ratio library`.

### Task 5: Horizontal/vertical analysis + anomalies

**Files:** `src/engine/trends.js`, `tests/engine/trends.test.js`
**Interfaces — Produces:** `horizontalVertical(data) -> [{stmt, key, cur, prior, change, share}]` (share = item / base, base = totalAssets for bs, revenue for is, |cfo| for cf); `findAnomalies(data) -> [{stmt,key,change,share,severity:'watch'|'alert',labelAr}]`. Rule: anomaly when `|change| ≥ 0.25` AND `share ≥ 0.05`; severity `alert` when `|change| ≥ 0.5` or sign flip; excluded keys: `totalCurrentAssets, totalAssets, totalCurrentLiabilities, totalLiabilities, totalEquity, grossProfit, pbt, cashBegin, cashEnd, netChangeCash`.

- [ ] Step 1: Failing tests (industrial): anomalies include `bs.receivables` alert (+50%), `bs.inventory` watch (+25%), `bs.otherNonCurrentLiabilities` alert (+100%, share exactly 0.05), `is.operatingIncome` watch, `is.netIncome` watch; exclude `is.tax` (share 0.03) and `bs.totalAssets`.
- [ ] Step 2: Implement; PASS; commit `feat(engine): line-item trends and anomaly detection`.

### Task 6: Earnings-quality red flags

**Files:** `src/engine/quality.js`, `tests/engine/quality.test.js`
**Interfaces — Produces:** `redFlags(data) -> [{id, severity, labelAr, detailAr, inputs}]`. Ids & rules: `niUpCfoDown` (NI growth > 0 and CFO growth < 0) · `receivablesOutpaceRevenue` (gR − gRev > 0.10) · `inventoryOutpaceCogs` (gInv − gCogs > 0.10) · `lowCfoToNi` (NI > 0 and CFO/NI < 0.8) · `highAccruals` (Sloan `(NI − CFO)/avg(TA_cur, TA_prior)` > 0.10) · `nonRecurringShare` (nonRecurring/NI > 0.30) · `impliedInterestRate` (interest/(STD+LTD) outside [0.02, 0.20] when debt/TA ≥ 0.05). Also export `sloanAccrual(data) -> number|null`.

- [ ] Step 1: Failing tests (industrial): flags include `niUpCfoDown`, `receivablesOutpaceRevenue`, `inventoryOutpaceCogs`, `lowCfoToNi`; exclude `highAccruals`; `sloanAccrual === 0.0263158` (closeTo 6). Implied rate 40/500 = 0.08 → no flag.
- [ ] Step 2: Implement; PASS; commit `feat(engine): earnings-quality red flags`.

### Task 7: Academic models (Piotroski, Altman Z″, DuPont)

**Files:** `src/engine/models.js`, `tests/engine/models.test.js`, `docs/worked-example.md`
**Interfaces — Produces:**
`piotroski(data) -> {score:0..9|null, signals:[{id, pass:boolean, value, labelAr}], approximation:boolean, excludedReason?}` — Piotroski (2000) definitions: ROA = NI/beginning TA; CFO/beginning TA > 0; ΔROA > 0; CFO/begTA > ROA; ΔLEVER = LTD/avg TA decreased; ΔLIQUID current ratio increased; no share increase; Δgross margin > 0; Δ(revenue/beginning TA) > 0.
`altmanZpp(data, year) -> {z, x1,x2,x3,x4, zone:'safe'|'grey'|'distress', emScore}` — X1 (CA−CL)/TA, X2 RE/TA, X3 EBIT/TA, X4 TE/TL.
`dupont(data, year) -> {netMargin, assetTurnover, equityMultiplier, roe}` (NI/revenue × revenue/TA × TA/TE, year-end).

- [ ] Step 1: Failing tests (industrial 2024): Piotroski `score 8`, signal `accrual` false, all others true, `approximation false`; Altman `z 5.038` (closeTo 3), `zone 'safe'`, `emScore 8.288`; DuPont `roe 0.166667`, `equityMultiplier 1.666667`.
- [ ] Step 2: Review-focus test `piotroski falls back to year-end assets when beginning assets missing`: delete `priorPriorTotalAssets` → `approximation true`, score still a number.
- [ ] Step 3: Bank data → both return `excludedReason` non-empty.
- [ ] Step 4: Implement; PASS. Write `docs/worked-example.md` (Arabic): the industrial fixture hand-calculated (current ratio, DSO, Piotroski 9 lines, Altman 4 X's), matching test values. Commit `feat(engine): Piotroski, Altman Z″, DuPont + worked example`.

### Task 8: Disclosure evidence + surprise

**Files:** `src/engine/disclosures.js`, `tests/engine/disclosures.test.js`
**Interfaces — Produces:** `disclosureEvidence(data) -> Evidence[]` (hall `disclosures`) and `pickSurprise(data, evidence) -> Evidence|null`. Priority for surprise: opinion `disclaimer` > `adverse` > goingConcern `material-uncertainty` > `qualified` > `emphasis.present` > Altman `distress` > none. Evidence severity: those = `alert`; KAMs = `info`; related parties with amount ≥ 5% revenue = `watch`.

- [ ] Step 1: Failing tests: fixture → 1 KAM evidence, surprise `null`; set `goingConcern:'material-uncertainty'` and `emphasis.present:true` → surprise id `goingConcern`; set opinion `qualified` only → surprise `qualifiedOpinion`.
- [ ] Step 2: Implement; PASS; commit `feat(engine): disclosure evidence and surprise selection`.

### Task 9: Benchmarks + grading

**Files:** `src/engine/benchmarks.js`, `tests/engine/benchmarks.test.js`
**Interfaces — Produces:** `buildBenchmarks(companies:CompanyData[]|BenchmarkRow[]) -> { [sector]: { n, ratios:{ [ratioId]: number[] } } }`; `median(xs)`; `percentileRank(x, xs) -> 0..100` (share of values strictly below + half ties, ×100); `gradeRatio(ratioId, value, sectorBench) -> {grade:'A'|'B'|'C'|'D'|'E', points:4..0, basis:'sector'|'reference', median, n, percentile}`. Grades from percentile (inverted when `better:'lower'`): ≥80 A, ≥60 B, ≥40 C, ≥20 D, else E. `REFERENCE_BANDS` (used when n < 4), cut points for A/B/C/D: currentRatio [2.0,1.5,1.2,1.0]; quickRatio [1.5,1.0,0.8,0.5]; interestCoverage [8,5,3,1.5]; debtToEquity (lower) [0.5,1.0,1.5,2.5]; netMargin [0.15,0.08,0.04,0]; roa [0.10,0.05,0.02,0]; roe [0.15,0.10,0.05,0]; cfoToNi [1.2,1.0,0.8,0.5]; nplRatio (lower) [0.03,0.05,0.08,0.12]; capitalAdequacy [0.16,0.14,0.125,0.105]; combinedRatio (lower) [0.85,0.92,0.97,1.0]. Ratios with no band and n < 4 → `grade:null`, not shown in scoring. `data/SOURCES.md` must state these are rule-of-thumb bands, not standards.

- [ ] Step 1: Failing tests: `median([3,1,2]) === 2`; `percentileRank(5,[1,2,3,4,5,6,7,8,9,10]) === 45`; with 10-company bench, `currentRatio 2.6667` → grade from percentile and `basis:'sector'`; review-focus `uses reference bands when n < 4`: 2-company bench → `basis:'reference'`, currentRatio 2.6667 → `A`; debtToEquity 0.6667 → `B`.
- [ ] Step 2: Implement; PASS; commit `feat(engine): sector benchmarks and grading`.

### Task 10: Rating, judge rating, questions, and `analyze()`

**Files:** `src/engine/rating.js`, `src/engine/questions.js`, `src/engine/analyze.js`, `src/engine/index.js`, `tests/engine/analyze.test.js`
**Interfaces — Produces:**
```js
/** Evidence = { id, hall, titleAr, value, displayAr, formulaAr, basisAr, inputs:[{labelAr,value,src}],
 *   benchmark:{grade,points,basis,median,n,percentile}|null, severity:'info'|'watch'|'alert',
 *   prosecutionAr, defenseAr, meaningAr, axis:'profitability'|'liquidity'|'solvency'|'efficiency'|'quality'|null } */
/** Case = { meta, disclaimer, integrity, sectorRule:{applied,excluded}, halls:{[hallId]:Evidence[]},
 *   surprise:Evidence|null, models:{piotroski,altman,dupont}, anomalies, redFlags,
 *   rating:{ label, points, axes:{[axis]:{grade,points}}, downgrades:string[], confidence:'high'|'medium'|'low' },
 *   strengths:Evidence[3], weaknesses:Evidence[3], questions:string[3], guesses:[{id,questionAr,answer,evidenceId}] } */
analyze(data, benchmarks) -> Case
modelRating(evidence, data) -> Case['rating']
judgeRating(caseObj, votes:{[evidenceId]:'convincing'|'unconvincing'}) -> { label, points, axes, diffAr:string[] }
managementQuestions(caseObj) -> string[3]
```
Rules: axis points = mean of graded evidence points in that axis; overall points = mean of available axes; label: ≥3.0 `قوي`, ≥2.0 `مستقر`, ≥1.0 `تحت المراقبة`, else `ضعيف`. Downgrades (applied after): opinion adverse/disclaimer → cap `ضعيف`; goingConcern material-uncertainty → cap `تحت المراقبة`; qualified → one level down; Altman distress → one level down. Confidence: `high` if integrity ok and ≥90% of the sector's required keys present; `medium` if integrity ok; else `low`. `judgeRating` recomputes axes excluding evidence voted `unconvincing`; `diffAr` lists each axis whose grade changed. Questions: first from redFlags in fixed priority `receivablesOutpaceRevenue, inventoryOutpaceCogs, niUpCfoDown, lowCfoToNi, highAccruals, nonRecurringShare, impliedInterestRate`, then `alert` anomalies, then `watch` anomalies; take 3; templated (e.g. `receivablesOutpaceRevenue` → `لماذا نمت الذمم المدينة بنسبة {gR}% بينما نمت الإيرادات {gRev}% فقط؟`). Guesses: 3 from `currentRatio`/`netMargin`/`debtToEquity` (or sector equivalents): question + true answer + evidenceId.

- [ ] Step 1: Failing tests (industrial + 10-company synthetic bench built in test): `case.disclaimer === DISCLAIMER`; every hall id present; every evidence has non-empty `formulaAr` and every input has `src` or `labelAr` containing `محسوب`; `questions.length === 3` and first mentions `الذمم`; `strengths.length === 3`; `rating.label` ∈ `RATING_LABELS`.
- [ ] Step 2: Downgrade tests: same data with `opinion:'adverse'` → label `ضعيف`; with goingConcern → not `قوي`/`مستقر`.
- [ ] Step 3: Judge test: voting every evidence with grade `D` or `E` `unconvincing` → `judgeRating(...).points ≥ case.rating.points`; empty votes → equals model points.
- [ ] Step 4: Determinism test: `analyze` twice → `JSON.stringify` equal.
- [ ] Step 5: Implement; PASS; commit `feat(engine): analyze() case assembly, ratings, judge verdict`.

### Task 11: Real data — 5 showcase companies + PEX benchmark sample

**Files:** `data/companies/{aziza,bank,insurance,services,distressed}.json`, `data/tickers.json`, `data/pex-benchmark.json`, `data/SOURCES.md`, `tests/data.test.js`

Companies: Palestine Poultry `AZIZA` (industrial); a PEX bank (e.g. Bank of Palestine `BOP`); a PEX insurer reporting under IFRS 17 (FY ≥ 2023); a services/telecom company (e.g. `PALTEL`); one company with a qualified opinion, emphasis-of-matter/going-concern paragraph, or a net loss (find via the annual reports). Use the latest fiscal year with a published audited report + its comparative year.

- [ ] Step 1: For each company, download the official audited annual report (company site or PEX disclosures) into `data/raw/` (git-ignored), record URL + access date in `SOURCES.md`.
- [ ] Step 2: Enter every required line with `src.page`. Values exactly as published, in the published unit.
- [ ] Step 3: Failing data test: for every file in `data/companies/`, `validateCompany().ok` and `runIntegrity().ok` are true; `analyze()` returns a Case without throwing; `distressed.json` produces a non-null `surprise` or a `ضعيف`/`تحت المراقبة` label.
- [ ] Step 4: Independent audit: a second agent re-reads each report and re-enters a random 15 lines per company blind; any mismatch fixed and logged in `SOURCES.md`.
- [ ] Step 5: `tickers.json`: all PEX listed companies `{ticker, nameAr, nameEn, sector}` from the PEX site. `pex-benchmark.json`: one row per PEX company, latest year, only the lines needed for applied ratios of its sector, each with `src` (secondary source allowed; spot-check ≥ 5 rows against official reports and record which in `SOURCES.md`). Sectors with < 4 rows remain and trigger reference bands.
- [ ] Step 6: PASS; commit `data: verified showcase companies and PEX benchmark sample`.

### Task 12: Independent Excel cross-check

**Files:** `excel/build-crosscheck.mjs`, `excel/crosscheck.xlsx`, `tests/excel.test.js`
**Interfaces — Consumes:** `data/companies/aziza.json`, `RATIOS`, `piotroski`, `altmanZpp`.

- [ ] Step 1: Script writes a workbook (exceljs) with sheet `البيانات` (raw lines) and sheet `الحسابات` whose cells are **Excel formulas** referencing `البيانات` (not values) for: all applied common ratios, 9 Piotroski signals + score, Altman X1–X4 + Z″.
- [ ] Step 2: Failing test: load the formulas into HyperFormula, evaluate, and assert each equals the engine's value (closeTo 6).
- [ ] Step 3: Implement; PASS; commit `test: independent Excel cross-check for Aziza`.

---

## Self-review notes (done)
- Spec §6.2–6.5 covered by Tasks 2–10, 12; §9 showcase/benchmark data by Task 11; §11 decisions 9, 11, 12, 14 by Tasks 4, 9, 11; worked example (§6.5) in Task 7.
- Not in this plan by design: UI, motion, worker, upload, video (Plans 2–4).
