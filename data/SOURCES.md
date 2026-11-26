# مصادر البيانات

| doc id | الشركة | الوثيقة | الرابط | تاريخ الوصول | ملاحظات |
|---|---|---|---|---|---|
| NIC-FY2025 | التأمين الوطنية (NIC) | القوائم المالية الموحدة الأساسية 2025 + تقرير المدقق (إنجليزي) | https://www.nic-pal.com/uc_files/download/app_files/custom-fields/file/nic_conslidated_fs_december_31_2025_englishpdf_17869779378618847510631.pdf?vsig=e58dcfa0ffce2989deeccd134fe0f019 | 2026-11-24 | صفحات 3–13؛ بلا اشتقاقات؛ تفاصيل في data/sources/insurer.md |
| NIC-FY2024 | التأمين الوطنية (NIC) | التقرير السنوي 2024 (عربي) | https://www.nic-pal.com/uc_files/download/app_files/custom-fields/file/nic_webpdf_17442076574341574080770.pdf?vsig=4c106a75c704b3ec026da979ea23ed3d | 2026-11-24 | صفحة 60: مجموع الموجودات 2023 فقط |
| bop-FY2025 | بنك فلسطين (BOP) | التقرير السنوي 2025 (عربي) متضمناً القوائم المالية الموحدة المدققة 2025 | https://bopwebsitestorage.blob.core.windows.net/assets/documents/FkDRMbOboipUAX358i26LsvOEx3trkgFgIwOGViE.pdf | 2026-11-24 | ص 124-129، 133، 166-167، 204، 247؛ nonInterestIncome محسوب؛ تفاصيل في data/sources/bop.md |
| aziza-FY2025 | دواجن فلسطين (AZIZA) | التقرير السنوي 2025 مع القوائم المالية المدققة (عربي) | https://api.pex.ps/FileManager/Default.aspx?AID=1&UID=1&DocAction=610&PathCode=1&HashCode=58981&TRID=142909&TID=1977&WFID=5 | 2026-11-24 | صفحات 42–46، 55–61؛ التفاصيل والاشتقاقات في data/sources/aziza.md |
| aziza-FY2024 | دواجن فلسطين (AZIZA) | التقرير السنوي 2024 (عربي) — لمجموع موجودات 2023 فقط | https://archiveapi.pex.ps/FileManager/Default.aspx?AID=1&UID=1&DocAction=610&PathCode=1&HashCode=14649&TRID=121391&TID=1977&WFID=5 | 2026-11-24 | صفحة 39 |
| PRICO-FY2025 | فلسطين للاستثمار العقاري (PRICO) | التقرير السنوي 2025 (عربي) متضمناً القوائم المالية الموحدة المدققة وتقرير EY | https://api.pex.ps/FileManager/Default.aspx?AID=1&UID=1&DocAction=610&PathCode=1&HashCode=58895&TRID=142763&TID=1977&WFID=5 | 2026-11-24 | صفحات PDF ‏27–31، 50، 54، 55؛ otherCurrentAssets وotherNonCurrentAssets وotherNonCurrentLiabilities محسوبة؛ تفاصيل في data/sources/distressed.md |

## عينة المقارنة القطاعية (data/pex-benchmark.json)
- قائمة الشركات والقطاعات: واجهة بورصة فلسطين الرسمية `webapi.pex.ps` (47 شركة).
- البنود التفصيلية: StockAnalysis (بيانات S&P Global) لـ 25 شركة، والمؤشرات الرسمية من البورصة لـ 22 شركة أخرى. السنة FY2025 للجميع.
- **هذه بيانات من مصدر ثانوي**، وليست مطابقة بنداً بنداً كالشركات الخمس الجاهزة. المطابقة العيّنية: 15 من 17 مقارنة تطابقت، والفرقان المتبقيان أقل من 0.2% (التفاصيل في `data/sources/benchmark-spotcheck.md`).
- لا توجد في العينة نسبة القروض المتعثرة ولا كفاية رأس المال للبنوك، ولا نتيجة خدمة التأمين؛ هذه تُقيَّم بالحدود المرجعية المعلنة.
