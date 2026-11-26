# distressed — Palestine Real Estate Investment Company (PRICO)

| Field | Value |
|---|---|
| Company | شركة فلسطين للاستثمار العقاري المساهمة العامة المحدودة — Palestine Real Estate Investment Co. (PRICO) |
| Ticker / exchange | PRICO / Palestine Exchange (PEX) |
| PEX sector | Investment Sector (real-estate investment, development, commercial services) — modelled as `investment` |
| Fiscal year | FY2025 (comparative FY2024), consolidated, JOD, unit 1 |
| Doc id | `PRICO-FY2025` |
| Document | Annual report 2025 (Arabic), includes the full audited consolidated financial statements and EY's independent auditor's report (56 PDF pages, two printed pages per PDF page) |
| URL | https://api.pex.ps/FileManager/Default.aspx?AID=1&UID=1&DocAction=610&PathCode=1&HashCode=58895&TRID=142763&TID=1977&WFID=5 |
| Where found | PEX web API `GetAllFinancialReports` (symbol PRICO), disclosure "Annual Report 2025" dated 2026-03-29 |
| Access date | 2026-11-24 |
| Auditor | Ernst & Young – Middle East (Palestine branch), signed by Saed Abdullah (licence 105/2003), Ramallah, 29 March 2026 |

## Why it qualifies
1. **Material uncertainty related to going concern** (PDF p.27, heading «شكوك جوهرية حول الاستمرارية»): accumulated losses JOD 51,930,697 and current liabilities exceeding current assets by JOD 1,705,578 «تلقي بشكوك جوهرية حول قدرة المجموعة على الاستمرار». The opinion stays unmodified.
2. **Emphasis of matter: war on the Gaza Strip** (PDF p.27, «فقرة توكيدية – الحرب على قطاع غزة»), referring to note 44.
3. **Net loss**: JOD (548,648) in 2025 and (1,730,158) in 2024 (PDF p.30).

## Pages used (PDF page numbers)
- 27: auditor's report (opinion, basis, going-concern MU, Gaza emphasis)
- 28: key audit matter (expected credit losses), other information, responsibilities
- 29: auditor signature (right half) + consolidated statement of financial position (left half)
- 30: consolidated income statement (right half) + comprehensive income (left half)
- 31: changes in equity (right half) + consolidated cash flows (left half)
- 50: note 35 EPS (weighted shares 63,749,719) and note 36 related parties
- 54: note 39 segments (revenue from external customers 3,709,269 / 3,552,150)
- 55: note 40 commitments and contingencies, note 41 accumulated losses (management's plans), notes 42–45 (Gaza, subsequent events)

Numbers were read from the rendered page images and checked against the PDF's text layer (pdftotext). The English "faces" file in the same disclosure (HashCode=58896) has the same figures but no auditor's report; it was used only for cross-checking.

## Mapping and derivations
- `revenue` = revenue from contracts with customers 330,119 + rent and service revenues 3,379,150 = 3,709,269. This total is presented as one figure in note 39 (p.54); 2024: 145,953 + 3,406,197 = 3,552,150.
- `inventory` = «بضاعة وعقارات جاهزة للبيع» (inventories and properties ready for sale).
- `receivables` = current accounts receivable (net). Long-term receivables (749,213 / 722,693) sit in non-current assets.
- `otherCurrentAssets` (derived) = total current assets − cash − receivables − inventory. It includes other current assets plus FVTPL assets (950 / 1,065).
- `otherNonCurrentAssets` (derived) = total assets − total current assets − PPE.
- `shortTermDebt` = current portion of long-term loans. `longTermDebt` = long-term loans. Lease liabilities are excluded (left in "other").
- `otherNonCurrentLiabilities` (derived) = total liabilities − total current liabilities − long-term loans. It ties to deferred tax + employees' indemnity + long-term leases + other non-current liabilities.
- `payables` / `otherCurrentLiabilities`: not given. Trade payables are not shown separately on the face (they sit inside «مطلوبات متداولة أخرى» 14,303,523). Note 26 was not broken down, so nothing was derived.
- `retainedEarnings` = accumulated losses (negative).
- `depreciation` = depreciation and amortisation add-back in cash flow (768,091 / 1,000,702). The income-statement line «استهلاكات» (12,880 / 20,368) is only part of it; the rest is inside operating costs.
- `interestExpense` = finance costs (480,113 / 1,216,661).
- `capex` = purchase of PPE only (21,091 / 6,867). Spending on projects in progress (2,468,011 / 750,231) is reported separately and was **not** added.
- `shares` = weighted average shares used for EPS (issued 63,762,486 less treasury 12,767). It is unchanged in both years, so it equals year-end shares outstanding.
- `dividendsPaid`: none in either year. `fairValueGains` was left out; the investment-property fair-value change is a loss of (523,029) / (523,073).

## Uncertainties / notes
- Cash tie (soft check): balance-sheet cash 1,624,789 / 2,201,456 vs cash-flow cash 1,544,019 / 2,095,174. The cash-flow statement has a "change in restricted cash" line, so the gap is very likely restricted balances (note 16). This was not confirmed line by line.
- Sector: PEX lists PRICO under the Investment sector. Its income is largely operating (rents, services, hotel/commercial), so the `services` template would also have been defensible. `investment` follows the exchange's classification.
- Management's note 44 says it sees no material uncertainty from the Gaza events. The auditor's MU paragraph is based on note 41 (accumulated losses and the working-capital deficit). The parent company (PADICO) states an intention to provide financial support (note 41).
- Quotes use Western digits in place of the report's Arabic-Indic digits. One elision (…) in the going-concern quote removes «كما في 31 كانون الأول 2025».
- `priorPriorTotalAssets` was omitted (the FY2024 report was not read).

## تحديث 2026-11-24
- الإنفاق الرأسمالي (`capex`) صار = شراء ممتلكات وآلات ومعدات + مشاريع تحت التنفيذ: 2025 = 21,091 + 2,468,011 = 2,489,102؛ 2024 = 6,867 + 750,231 = 757,098 (ص 31). هذا يلغي الملاحظة السابقة.
