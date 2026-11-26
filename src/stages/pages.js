import { docket } from '../app/cases.js';

/** Plain reading pages written on the same folio: method and limits. Facts only from data/SOURCES.md and the audit. */
const PAGES = {
  method: {
    title: 'كيف تأكّدنا من الأرقام',
    body: () => `
      <p>كل رقم في القضايا الخمس منقول من القوائم المالية المدقّقة للسنة المالية <bdi class="n">2025</bdi> كما نُشرت على نظام إفصاح بورصة فلسطين أو موقع الشركة، ومعه رقم الصفحة التي أُخذ منها.</p>
      <ol>
        <li><strong>فحص سلامة القراءة.</strong> قبل أي تحليل يتحقق النظام أن الأصول تساوي الخصوم مع حقوق الملكية، وأن المجاميع تساوي بنودها، وأن حركة النقد متسلسلة، بهامش تقريب لا يتجاوز وحدتين أو <bdi class="n">0.05%</bdi>.</li>
        <li><strong>تدقيق مستقل أعمى.</strong> أُعيد إدخال <bdi class="n">15</bdi> رقماً من كل شركة من التقرير الأصلي دون النظر إلى الأرقام المدخلة، ثم قورنت: تطابق <bdi class="n">75</bdi> من <bdi class="n">75</bdi>.</li>
        <li><strong>اختبارات تلقائية.</strong> كل نسبة ونموذج له حالة محسوبة يدوياً تُختبر مع كل تعديل في الشيفرة.</li>
        <li><strong>ملف Excel مستقل.</strong> المعادلات نفسها مكتوبة كمعادلات Excel على أرقام عزيزة، وتطابق نتائج النظام حتى ست خانات عشرية.</li>
        <li><strong>الصيغ من مصادرها.</strong> Piotroski من ورقته الأصلية (<bdi class="n">2000</bdi>)، وAltman Z″ للشركات غير الصناعية والأسواق الناشئة (<bdi class="n">1995</bdi>)، ونسبة المستحقات من Sloan (<bdi class="n">1996</bdi>).</li>
      </ol>
      <p>مقارنة القطاع مبنية على عينة من <bdi class="n">45</bdi> شركة مدرجة، أرقامها من مصدر ثانوي، وطابقت <bdi class="n">15</bdi> من <bdi class="n">17</bdi> مقارنة عيّنية مع التقارير الرسمية، والفرقان المتبقيان أقل من <bdi class="n">0.2%</bdi>.</p>`,
  },
  limits: {
    title: 'ما لا يستطيع النموذج قوله',
    body: () => `
      <ul>
        <li>لا يعرف سعر السهم، فلا يحكم على الاستثمار؛ حكمه على الصحة المالية للشركة فقط.</li>
        <li>لا يرى ما لم يُفصح عنه، ولا يعرف المستقبل.</li>
        <li>مقارنة القطاع محدودة بعدد الشركات المدرجة؛ حيث تقل العينة عن أربع شركات يستخدم حدوداً مرجعية معلنة، ويقول ذلك عند الدليل.</li>
        <li>نماذج Piotroski وAltman لا تنطبق على البنوك وشركات التأمين، فتُستبعد ويُذكر السبب.</li>
        <li>بعض الملفات المنشورة لا تحتوي الإيضاحات؛ عندها تكون قائمة الأطراف ذات العلاقة والقضايا فارغة لأن البيانات غير متاحة، لا لأنها غير موجودة.</li>
        <li>تصنيف «رأي المدقق» يغيّر الحكم بقاعدة مبسّطة؛ الرأي الحقيقي يعتمد أيضاً على طبيعة البند واستجابة الإدارة.</li>
      </ul>
      <p class="disclaimer">${docket()[0]?.case.disclaimer ?? ''}</p>`,
  },
};

export const pageStage = (id) => ({
  mount(el, ctx) {
    const p = PAGES[id];
    el.tabIndex = -1;
    el.innerHTML = `
      <article class="folio folio--read">
        <div class="folio-rules" aria-hidden="true"></div>
        <h1 class="read-title">${p.title}</h1>
        <div class="read-body">${p.body()}</div>
        <p class="folio-foot"><a href="#landing" data-back>العودة إلى السجل</a></p>
      </article>`;
    el.querySelector('[data-back]').addEventListener('click', (e) => { e.preventDefault(); ctx.go('landing'); });
  },
});
