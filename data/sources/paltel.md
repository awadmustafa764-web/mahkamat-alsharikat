# Paltel (PALTEL, PEX) — source record

| Field | Value |
|---|---|
| doc id | `paltel-FY2025` |
| Document | Palestine Telecommunications Company P.L.C. — Consolidated Financial Statements, December 31, 2025 (English, audited), with Independent Auditor's Report |
| URL | https://static.mubasher.info/File.Mix_Announcement_File/0959509D-BFA1-4784-941C-C6A956E66AA3.pdf |
| Access date | 2026-11-24 |
| Auditor | Ernst & Young – Middle East (Ramallah, licence 206/2012); report dated March 26, 2026; FS authorised by the Board on March 25, 2026 |
| PDF | 55 pages; pages 2–6 (auditor's report) are scanned images (read by rendering), the rest has a text layer |
| Unit / currency | JD thousands (`unit: "1000"`, JOD), consolidated, IFRS |

Not used: the "Preliminary Financial Statements 2025" on the company site (https://paltelgroup.jawwal.ps/uploads/qurters/Preliminary_Financial_Statements_2025_-_Arabic.pdf). It is a scanned preliminary version dated Feb 11, 2026, so it predates the audit. The audited FY2025 annual report on paltelgroup.jawwal.ps is only available as a flipbook.

## Pages used (PDF page numbers)
- 2: auditor's opinion (unmodified), emphasis of matter (Note 37, Gaza war), KAM intro
- 3: KAM — revenue recognition (airtime subscription/usage)
- 4: KAM — ECL on accounts receivable
- 6: signature, firm, date
- 7: statement of financial position (all bs lines)
- 8: income statement (all is lines except depreciation)
- 10: statement of changes in equity (cross-check)
- 11: cash-flow statement (cfo, cfi, cff, capex, dividends, D&A, cash roll)
- 36–44: notes 10–29 (receivables 12, payables 20, loans 18/21, other liabilities 19/23, opex 26, other revenues 27, finance costs 28, EPS 29, commitments 30, contingencies 31)
- 39: Note 17, dividends (JD 0.30/share, JD 39,487,500 each year)
- 38: Note 15, share capital, 131,625,000 shares
- 44–45: Note 32, related parties
- 54–55: Note 37, war on the Gaza Strip
- 14: changes in accounting policies (only the IAS 21 "lack of exchangeability" amendment, which the company says had no material impact, so it is not recorded as a policy change)

## Derivations
- `otherCurrentAssets` = total current assets − cash − receivables − inventory. 2025: 193,950 − 69,795 − 58,729 − 1,590 = 63,836, which is current materials 16,095 + other current assets 47,556 + FVTPL 185. 2024: 47,282.
- `otherNonCurrentAssets` = total assets − current assets − PPE. 2025: 178,372; 2024: 180,717.
- `otherCurrentLiabilities` = current liabilities − payables − credit facilities/current loans. 2025: 123,900, which is income-tax provision 14,869 + other current liabilities 109,031. 2024: 124,406.
- `otherNonCurrentLiabilities` = total liabilities − current liabilities − non-current loans. 2025: 62,009; 2024: 46,139. Both equal the presented line.
- `grossProfit` = the unlabelled subtotal printed on the income statement (revenue − direct cost of sales): 242,602 / 206,505.
- `operatingIncome` = gross subtotal − operating and administrative expenses. 2025: 242,602 − 176,328 = 66,274; 2024: 206,505 − 163,985 = 42,520. The income statement shows no operating profit line. "Other revenues, net" (4,600 / 12,752) is excluded. That line contains ECL recoveries on associate loans, FX, impairments and forward-contract results. Reconciliation: 66,274 + 320 − 7,348 + 4,600 = 63,846 PBT, which matches.

## Classification choices / uncertainties
- `inventory` = the "Inventories" line only (1,590 / 910: SIM and scratch cards, handsets). Current "Materials" (network materials, 16,095 / 18,116) are left in otherCurrentAssets.
- `payables` = the "Accounts payable" line as presented (40,315 / 36,709). It includes subscribers' deposits (5,667) and accrued governmental fees (2,852), per Note 20.
- `shortTermDebt` = credit facilities (bank overdrafts 47,847) + current portion of long-term loans (17,311). Lease liabilities are excluded and stay in "other": 837 current and 754 non-current.
- `sga` = "Operating and administrative expenses" as presented. This includes depreciation (43,864) and amortisation (10,201) and the ECL charge (10,377).
- `depreciation` = the CF add-back "Depreciation and amortization" (54,065 / 51,771).
- `capex` = "Net increase in projects in progress, property, plant and equipment and materials" (55,658 / 52,388). It is a net figure that includes materials. Purchases of intangible assets (4,750 / 1,421) are a separate line and are **not** included.
- `interestExpense` = finance costs 7,348 / 6,870 (includes lease finance cost 125 / 182).
- `shares` = 131,625,000 (actual count; financial lines are in JD thousands).
- The cash-flow statement notes that non-cash receivable/payable movements were excluded from working-capital changes.
- No subsequent-events note exists in the statements. `priorPriorTotalAssets` (FY2023) was not extracted.
