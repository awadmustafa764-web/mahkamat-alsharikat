# Benchmark spot-check: StockAnalysis (aggregator) vs official FY2025 statements

Date: 2026-11-24. Aggregator values are in millions of reporting currency (rounded to 2 decimals, so a match means equal after rounding). Official documents were the audited/consolidated FY2025 statements filed on the Palestine Exchange (PEX) disclosure system (`webapi.pex.ps` -> `api.pex.ps/FileManager`) or published on the company's own site. "Page" = PDF page index within the file named in the Source column.

| Ticker | Sector | Line | Aggregator | Official | Page | Match |
|---|---|---|---|---|---|---|
| PALTEL | services | Total assets | 557.83 | JD 557,826 thousand | 7 | yes |
| PALTEL | services | Revenue | 285.58 | JD 285,584 thousand | 8 | yes |
| PALTEL | services | Operating cash flow | 118.29 | JD 118,290 thousand | 11 | yes |
| PALTEL | services | Net income (parent) | 52.01 | JD 52,012 thousand | 8 | yes |
| VOIC | industrial | Total assets | 98.01 | JD 98,013,227 | 2 | yes |
| VOIC | industrial | Revenue (sales) | 7.75 | JD 7,751,386 | 3 | yes |
| VOIC | industrial | Net income | 10.44 | JD 10,438,450 | 3 | yes |
| PADICO | investment | Total assets | 714.51 | USD 714,505 thousand | 2 | yes |
| PADICO | investment | Total equity | 493.49 | USD 493,488 thousand | 2 | yes |
| PADICO | investment | Net income (parent) | 18.37 | USD 18,368 thousand (total profit incl. NCI/discontinued 22,441) | 3 | yes |
| NIC | insurance | Total assets | 119.91 | USD 119,911,399 | 6 | yes |
| NIC | insurance | Insurance revenue ("Premiums & Annuity Revenue") | 52.12 | USD 52,124,741 (Insurance Contracts Revenue) | 7 | yes |
| NIC | insurance | Net income | 5.04 | USD 5,039,619 | 7 | yes |
| BOP | bank | Total equity | 670.83 | USD 670,832,165 | 2 | yes |
| BOP | bank | Net income | 53.36 | USD 53,357,766 | 3 | yes |
| BOP | bank | Total assets | 10,651 | USD 10,653,261,400 | 2 | no (diff 2.3m, 0.02%; PEX KPI API gives 10,650,923,206, so the filed statements and PEX KPI also differ) |
| BOP | bank | Net interest income | 226.54 | USD 226,123,337 | 3 | no (diff 0.42m, 0.2%) |

Result: 5 companies across 5 sectors, 17 comparisons: 15 match after rounding, 2 do not (both BOP, small differences of 0.02% and 0.2%, no sign of a gross error).

## Sources (official files)

- PALTEL: "Paltel Group 2025 FS - English" (PEX annual-report disclosure, HashCode=59016): https://api.pex.ps/FileManager/Default.aspx?AID=1&UID=1&DocAction=610&PathCode=1&HashCode=59016&TRID=142992&TID=2917&WFID=5
- VOIC: "English VOIC FS December faces 2025" (HashCode=58960): https://api.pex.ps/FileManager/Default.aspx?AID=1&UID=1&DocAction=610&PathCode=1&HashCode=58960&TRID=142876&TID=2917&WFID=5
- PADICO: "PADICOEN" annual-report disclosure (HashCode=59001): https://api.pex.ps/FileManager/Default.aspx?AID=1&UID=1&DocAction=610&PathCode=1&HashCode=59001&TRID=142835&TID=2917&WFID=5
- NIC: "NIC Consolidated 31 December 2025 - Preliminary English" (HashCode=58530; the final-version English file in the annual-report disclosure, HashCode=59037, is image-only and could not be text-extracted): https://api.pex.ps/FileManager/Default.aspx?AID=1&UID=1&DocAction=610&PathCode=1&HashCode=58530&TRID=142218&TID=2917&WFID=5
- BOP: Consolidated Financial Statements December 31, 2025 (bank's investor-relations site): https://bopwebsitestorage.blob.core.windows.net/assets/documents/veCiPOLcVulfZw68U861ysUF2epEfsv7XgHwwpAO.pdf

## Notes and caveats

- Text extracted with `pdftotext -layout`; for several statements the column layout is scrambled, so each official number was read from the line label together with its row position and cross-checked against the aggregator and the PEX `GetFinancialKpis` totals.
- Official PEX KPI totals (total assets, liabilities, equity, net income, operating cash flow) were compared with the aggregator for every aggregator row in the build; only QUDS (1.3%) differed by more than 1%, and PIBC by 0.6% (888.17 vs 882.99).
- BPC (Birzeit Pharmaceuticals) English FS is scanned images; only the auditor's key-audit-matter text was readable (inventories USD 12,763,777 vs aggregator 12.76, matches) and it is not counted in the table above.
- The aggregator does not provide IFRS 17 insurance service result, NPL, or capital adequacy; those lines are omitted from the benchmark, not estimated.
