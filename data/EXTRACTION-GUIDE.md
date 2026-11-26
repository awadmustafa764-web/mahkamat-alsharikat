# Extraction guide — CompanyData JSON

Read `src/engine/schema.js` (keys per sector) and `tests/fixtures/industrial.json` (shape). Real data differs from fixtures in one way: **every line is `{ "v": number, "src": { "page": <PDF page number>, "doc": "<doc id>" } }`**. `doc` ids are listed in `data/SOURCES.md` with URL and access date.

## Rules (accuracy is the whole point)
- Values **exactly as published**, in the published unit (`meta.unit`: `"1"` or `"1000"`), the published currency, **consolidated** statements when they exist (`meta.consolidated`).
- Two fiscal years: latest audited year + its comparative. `meta.years = [latest, comparative]`. Add `priorPriorTotalAssets` from the previous year's report if you can get it (else omit).
- Negative numbers stay negative only where the schema expects a signed value (`cfi`, `cff`, `netChangeCash`, `netReinsuranceResult`, losses). Expenses (`cogs`, `sga`, `interestExpense`, `tax`, `capex`, `dividendsPaid`, `depreciation`) are **positive** amounts.
- When a line is not presented but is a clean derivation, compute it and add `"note": "محسوب: <formula>"` inside `src` (page = page of the inputs). Allowed derivations only:
  - `otherCurrentAssets` = total current assets − cash − receivables − inventory
  - `otherCurrentLiabilities` = total current liabilities − payables − shortTermDebt
  - `otherNonCurrentLiabilities` = total liabilities − total current liabilities − longTermDebt
  - `otherNonCurrentAssets` = total assets − total current assets − ppeNet
  - `operatingIncome` (if not shown) = gross profit − selling, general, admin and other operating expenses (before finance costs, share of associates and tax)
  - `grossProfit` = revenue − cogs
- Definitions:
  - `receivables` = trade receivables net of ECL (include related-party trade receivables if shown separately; exclude prepayments and other receivables).
  - `payables` = trade payables (+ related-party trade payables).
  - `shortTermDebt` = bank loans, facilities, overdrafts and current portion of long-term loans. `longTermDebt` = non-current interest-bearing loans. **Lease liabilities are NOT debt here** (they fall into "other").
  - `depreciation` = depreciation + amortisation add-backs from the cash-flow statement.
  - `capex` = purchases of property, plant and equipment (+ intangibles if combined), as a positive number.
  - `cashBegin` / `cashEnd` / `netChangeCash` = as in the cash-flow statement (`fxEffect` if shown).
  - `netIncome` = profit for the year; `netIncomeParent` = attributable to owners of the parent.
  - `shares` (per year, top-level next to bs/is/cf) = shares outstanding at year end (from equity/EPS note).
  - Banks: `grossLoans` = gross direct credit facilities; `allowanceLoans` = ECL allowance on them; `netLoans` = as presented (after ECL and suspended interest); `npl` = gross stage-3 / non-performing facilities from the credit-risk note; `deposits` = customers' deposits; `capitalAdequacy` (per year, top-level) = regulatory capital adequacy ratio as a decimal (e.g. 0.152).
  - Insurance (IFRS 17): `insuranceRevenue`, `insuranceServiceExpenses` (positive), `netReinsuranceResult` (signed; usually negative), `insuranceServiceResult`, `investmentIncome` (net investment income), `totalInvestments`.
- Disclosures (`disclosures`): auditor `opinion` (`unmodified|qualified|adverse|disclaimer`), `firm`, `emphasis` (`{present, quote, page}` or null), `goingConcern` (`none|material-uncertainty`, add `goingConcernQuote`, `goingConcernPage` when present), `kams` (title + ≤ 2-sentence quote + page). `relatedParties` (material ones: party, nature, amount, page), `contingencies`, `subsequentEvents`, `policyChanges` (only real changes in the year). Quotes: short, in the report's language; keep under 40 words.
- Never guess. If a value is not in the report and not an allowed derivation, omit it.

## Done means
`node scripts/check-company.mjs data/companies/<id>.json` exits 0 (valid, integrity ok, zero unsourced lines), and you record in `data/SOURCES.md`: doc id, URL, access date, pages used, and any derivation you made.
