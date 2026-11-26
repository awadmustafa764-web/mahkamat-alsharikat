# AZIZA — Palestine Poultry Company Ltd (شركة دواجن فلسطين م.ع.م) — sources

## aziza-FY2025 (primary)
- Document: Annual Report 2025 (التقرير السنوي 2025), incl. EY independent auditor's report and the audited financial statements for the year ended 31 Dec 2025 (with 2024 comparatives). Disclosed on PEX 2026-03-31 ("دواجن فلسطين(AZIZA) تفصح عن تقريرها السنوي للسنة المالية 2025").
- URL: https://api.pex.ps/FileManager/Default.aspx?AID=1&UID=1&DocAction=610&PathCode=1&HashCode=58981&TRID=142909&TID=1977&WFID=5
  (found via the PEX API `POST https://webapi.pex.ps/api/GetAllFinancialReports`, CompanySymbol=AZIZA)
- Access date: 2026-11-24
- Language: Arabic. 62 PDF pages, each PDF page is a two-page print spread (PDF page n ≈ printed pages 2n-2 / 2n-1).
- Statements: standalone (the company has no subsidiaries); JOD; unit 1; IFRS. Functional currency is the Israeli shekel (presentation in JOD → large FX translation reserve / OCI).
- Pages used (PDF page numbers):
  - 42–43: independent auditor's report (EY – Middle East, Palestine branch; partner Saed Abdallah; dated 18 March 2026; unmodified opinion; one KAM: ECL on receivables; no emphasis-of-matter / going-concern paragraph)
  - 44: statement of financial position
  - 45: income statement + statement of comprehensive income
  - 46: statement of changes in equity + statement of cash flows
  - 55: notes 9–11, 14 (long-term loan granted to sister company; other current assets; cash and cash equivalents reconciliation; long-term loans)
  - 56: notes 16–19 (payables = suppliers + post-dated cheques; credit facilities, collateral)
  - 58: notes 24–28 (finance costs, other income, income tax, EPS — weighted shares 13,440,000)
  - 59: note 29 related parties
  - 61: notes 32–34 (contingent liabilities/commitments, Gaza war impact, geographic concentration)
- Derivations (each noted in `src.note`):
  - otherCurrentAssets = total current assets − cash − receivables − inventory (= current biological assets + other current assets)
  - otherNonCurrentAssets = total assets − total current assets − PP&E
  - shortTermDebt = credit facilities + current portion of long-term loans (2025: 635,965 + 334,076; 2024: 407,678 + 319,651)
  - otherCurrentLiabilities = total current liabilities − payables − shortTermDebt (includes current lease liabilities and income-tax provision)
  - otherNonCurrentLiabilities = total liabilities − total current liabilities − longTermDebt (lease liabilities, other non-current liabilities, end-of-service provision)
  - longTermDebt 2025 = 0 (shown as "–" on the face)
  - operatingIncome = the unlabeled subtotal on the income statement after G&A, ECL and selling/distribution expenses, before finance costs and other income (5,166,901 / 5,441,605) — it equals the guide's derivation.
  - equityParent / netIncomeParent = total equity / profit for the year (no subsidiaries, no NCI).
- Cross-check: the English "faces" PDF disclosed in the same PEX item (HashCode=58952, unaudited company version, 6 scanned pages) agrees with the audited Arabic statements except: it shows other current assets 2025 = 2,403,266 (= audited 1,608,908 + the 794,358 long-term granted loan, which that version omits from non-current assets — yet its subtotals are unchanged, so it is internally inconsistent) and PBT 5,108,033/5,108,036 vs audited 5,108,035. The audited Arabic figures were used.

## aziza-FY2024 (only for priorPriorTotalAssets)
- Document: Annual Report 2024 incl. audited FS for 2024 (EY report dated 24 March 2025). Disclosed on PEX 2025-03-27.
- URL: https://archiveapi.pex.ps/FileManager/Default.aspx?AID=1&UID=1&DocAction=610&PathCode=1&HashCode=14649&TRID=121391&TID=1977&WFID=5
- Access date: 2026-11-24. Language: Arabic.
- Page used: 39 (statement of financial position; 31 Dec 2023 total assets 45,739,557). Its 2024 column matches the FY2025 comparatives (no restatement).

## Uncertainties / judgement calls
- capex = purchases of PP&E only (1,731,436 / 823,177). The cash-flow statement shows a separate investing line "مشاريع قيد الإنشاء" (1,719,314 / 216,747) that is economically also capex; it is NOT included per the guide's definition. Real capex is roughly double in 2025.
- sga not filled: G&A (1,516,072 / 1,518,422) and selling & distribution (1,009,675 / 966,692) are separate lines, with ECL (225,081 / 195,810) as a third; no combined figure is presented and summing is not an allowed derivation.
- Cash-flow cash (2,478,248 / 3,215,512) is net of credit facilities and restricted cash, so it differs from balance-sheet cash (3,116,458 / 3,626,141) — reconciled in note 11 (soft cashTie check).
- 2024 cashBegin is negative (−3,229,346) as printed (net overdraft position at end-2023).
- receivables = current trade receivables net of ECL as presented (10,800,671), which include related-party trade receivables (1,100,874); long-term trade receivables/cheques (423,051) are in other non-current assets.
- Note 14 labels for 2024 (293,542 current / 319,651 non-current) appear swapped versus the balance-sheet face (319,651 current / 293,542 non-current); the face was used.
- Auditor's report text was read from rendered page images (the PDF's Arabic text layer is not extractable); numbers were also matched against the PDF text layer.
- policyChanges left empty: new IFRS amendments effective 2025 are mentioned in the policies note but no impact was identified (page 47 text not legible via text extraction; not verified visually).
- subsequentEvents: no subsequent-events note found in notes 1–34.
