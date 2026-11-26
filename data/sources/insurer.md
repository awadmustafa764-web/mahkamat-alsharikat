# insurer.json — source record

## Company and why
**National Insurance Company Group (التأمين الوطنية), PEX ticker NIC** — the preferred company in the brief. Its FY2025 audited consolidated statements (IFRS 17 presentation) are published on the company website, so no fallback insurer was needed.

## Documents
| doc id | Document | URL | Accessed |
|---|---|---|---|
| NIC-FY2025 | "Basic Consolidated Financial Statements and Independent Auditor's Report for the Year Ended December 31, 2025" (English, 13 PDF pages; statements only, **no notes**) | https://www.nic-pal.com/uc_files/download/app_files/custom-fields/file/nic_conslidated_fs_december_31_2025_englishpdf_17869779378618847510631.pdf?vsig=e58dcfa0ffce2989deeccd134fe0f019 | 2026-11-24 |
| NIC-FY2024 | Annual Report 2024 (Arabic, 136 PDF pages) — used only for `priorPriorTotalAssets` and to confirm 2024 comparatives were not restated | https://www.nic-pal.com/uc_files/download/app_files/custom-fields/file/nic_webpdf_17442076574341574080770.pdf?vsig=4c106a75c704b3ec026da979ea23ed3d | 2026-11-24 |

Listing page: https://www.nic-pal.com/en/content/reports-and-financial-statements

## Pages used (PDF page numbers; printed page = PDF page − 2 in NIC-FY2025)
- NIC-FY2025 p3: audit certificate (HLB PS) — English statements are extracted/translated from the Arabic audited statements, unqualified opinion dated 31 Mar 2026.
- p4–8: independent auditor's report (opinion p4; KAMs p5 insurance contract liabilities, p6 property investments; no emphasis of matter, no going-concern paragraph).
- p9: statement of financial position (cash, totals, equity attributable to parent, NCI "-").
- p10: statement of profit or loss (IFRS 17 lines, net investment income, PBT, tax, net profit).
- p12: statement of changes in equity (profit attributable to parent = full net profit; NCI column nil).
- p13: statement of cash flows.
- NIC-FY2024 p60: total assets 31/12/2023 = 110,937,890 (Arabic statement of financial position, text-extracted).

## Mapping / derivations
- `insuranceServiceResult` = "Insurance and Reinsurance Contracts Results" (after net reinsurance result): 732,268 (2025), 5,067,721 (2024).
- `insuranceServiceExpenses` = "(Insurance Contracts Expenses)" shown as positive.
- `netReinsuranceResult` = "Net Results from Reinsurance Contracts Held", signed (−8,113,634 in 2025; +3,304,381 in 2024).
- `investmentIncome` = "Net Investment Income" as presented (interest + FVTPL gains + derecognition losses + impairment recoveries). Excludes insurance finance income/expense, property investment fair-value gains/income and share of associates.
- `netIncomeParent` taken from the changes-in-equity parent column (P&L does not split attribution).
- `capex` = purchase of property and equipment only (property-investment additions of 2,885,490 / 142,956 not included).
- No computed (derived) lines.

## Uncertainties
- `totalInvestments` omitted: no total is presented and it is not an allowed derivation (investments are spread over term deposits, FVTPL, FVOCI, amortised cost, associates, property investments).
- `shares` omitted: treasury share count not disclosed in the basic statements (no notes in this PDF).
- Cash-flow cash (7,326,840 / 7,113,170) differs from balance-sheet cash (7,235,365 / 7,074,327); reason not explained in the document (likely ECL on balances or definition differences). Soft integrity check only.
- `dividendsPaid` 2024 = 764,789 is labelled "Cash Dividends Declared" in financing activities, while declared dividends in equity were 858,896; taken as the cash outflow. 2025 shows "-", so it was omitted rather than set to 0.
- `priorPriorTotalAssets` read via text extraction of the Arabic FY2024 PDF (page 60; figure appears on both total-assets and total liabilities+equity lines). Not visually verified.
- The FY2025 PDF has no text layer; values were read from rendered page images and cross-checked arithmetically (all subtotals reconcile; 2024 comparatives match the FY2024 annual report).
- Related parties, contingencies, subsequent events, policy changes: notes not included in the PDF → left empty (not "none confirmed").
