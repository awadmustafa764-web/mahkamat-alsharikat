# Bank of Palestine (BOP, PEX) — sources

## Document
- **doc id:** `bop-FY2025`
- **Document:** Bank of Palestine P.L.C — Annual Report 2025 (Arabic edition, "التقرير السنوي 2025"), which contains the full audited consolidated financial statements for the year ended 31 Dec 2025 (with 2024 comparatives), notes 1–57, and the independent auditor's report (EY – Middle East, Palestine branch, dated 24 March 2026).
- **URL:** https://bopwebsitestorage.blob.core.windows.net/assets/documents/FkDRMbOboipUAX358i26LsvOEx3trkgFgIwOGViE.pdf
  (linked as "Annual Report – Arabic" under 2025 on https://bankofpalestine.com/en/investor-relations/financial-results)
- **Access date:** 2026-11-24
- **Page numbers** = PDF page numbers. They match the printed page numbers in this file (254 pages).
- Unit: US dollars (unit "1"), consolidated, IFRS.

## Pages used
| Page | Content | Lines |
|---|---|---|
| 124 | Auditor's report: qualified opinion and basis for qualification (Gaza exposures, note 55) | disclosures.auditor |
| 125 | Key audit matter: adequacy of ECL on credit facilities | kams |
| 127 | Auditor's signature: Ernst & Young – Middle East, 24 March 2026 | firm, date |
| 128 | Consolidated statement of financial position | netLoans, deposits, totalAssets, totalLiabilities, totalEquity, equityParent, nci |
| 129 | Consolidated income statement | netInterestIncome, operatingExpenses (total expenses), provisionExpense, netIncome, netIncomeParent, nonInterestIncome (derived) |
| 133 | Note 1: paid-up capital 268,786,067 (2025) / 260,559,617 (2024) at nominal value USD 1 per share | shares |
| 166 | Note 8: gross direct credit facilities, suspended interest, ECL allowance | grossLoans, allowanceLoans |
| 167 | Note 8: movement of gross facilities by stage, stage 3 year-end balance | npl |
| 247 | Capital adequacy note (PMA instructions 2018/8): CAR 16.29% (2025) and 15.30% (2024) | capitalAdequacy |
| 204 | Note 44 EPS (cross-check: EPS 0.19 / (0.13); weighted shares 264,166,529 / 238,639,823) | — |

## Definitions and derivations
- `grossLoans` = total direct credit facilities and Islamic financing **before** suspended interest and ECL (note 8 total: 4,464,999,733 / 4,188,586,938).
- `netLoans` = gross − suspended interest (35,618,131 / 21,917,849) − ECL (417,348,775 / 324,028,640). This matches the SFP figure exactly.
- `npl` = gross stage 3 balance at year end (348,169,736 / 229,918,053). Gross stage 3 includes suspended interest, as presented in note 8.
- `nonInterestIncome` **(derived)** = "total income before ECL provisions and other adjustments and losses" (389,495,920 / 353,990,781) − net interest income (226,537,030 / 214,786,498) = 162,958,890 / 139,204,283. The derived figure includes net financing and investment income from Islamic operations (61,733,798 / 59,934,728), net commissions, FX gains, portfolio gains, the share of associates and other income. This derivation is **not** on the guide's allowed list. It is a clean subtotal difference on the face of the income statement, so the cost-to-income ratio is not overstated.
- `operatingExpenses` = total expenses (193,318,127 / 172,948,762): staff, other operating expenses, depreciation and amortisation, and PMA fines (22,693 in 2025).
- `provisionExpense` = the ECL and modification line for **direct credit facilities only** (127,214,256 / 87,661,411). It excludes "other ECL provisions and other asset losses, net" (2,622,377 / 138,851,186). The large 2024 figure relates to other assets.
- `capitalAdequacy` = regulatory CAR from the audited capital note: 0.1629 / 0.1530.
- `shares` = paid-up capital ÷ USD 1 nominal value (note 1). No treasury shares appear on the SFP.

## Uncertainties
1. **The English "Q4 2025 Financial Statements" PDF on the IR page differs from the audited annual report.** That file is https://bopwebsitestorage.blob.core.windows.net/assets/documents/veCiPOLcVulfZw68U861ysUF2epEfsv7XgHwwpAO.pdf (7 pages, primary statements only). It shows net facilities of 4,014,997,214 and total assets of 10,653,261,400. The audited figures are 4,012,032,827 and 10,650,923,206. It appears to be the pre-audit or preliminary set. All values here come from the audited Arabic annual report.
2. **CAR is reported differently in different documents.** The FY2025 earnings release (15 Feb 2026) reports 16.48%. The audited capital note (p.247) reports 16.29%, and that is the figure used.
3. The English annual report (https://bopwebsitestorage.blob.core.windows.net/assets/documents/8PYusm1GebxZPhdHUggNFf40Qf4KBxDWTCSdcbr5.pdf) **omits the financial statements**, so the Arabic edition was used. Its Arabic text layer is not extractable, so pages were rendered to images. Numbers were read from both the images and the numeric text layer, and they agree. All subtotals reconcile (assets = liabilities + equity; gross − suspended interest − ECL = net loans; income-statement subtotals).
4. The auditor's opinion is **qualified**. EY could not obtain sufficient evidence on the adequacy of provisions against the bank's Gaza exposures (note 55). The FY2024 opinion was qualified for the same reason. No going-concern paragraph or emphasis-of-matter paragraph was found.
5. `relatedParties`, `contingencies`, `subsequentEvents` and `policyChanges` were left empty because they were not extracted. The IAS 21 amendments adopted in 2025 had no material impact (p.135).
6. `priorPriorTotalAssets` (FY2023) was not collected.
