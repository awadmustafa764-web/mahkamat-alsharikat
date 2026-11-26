// Builds an independent Excel cross-check: raw lines on sheet "Data", Excel FORMULAS on sheet "Calc".
// The same rows are evaluated by HyperFormula in tests and written to .xlsx by build-crosscheck.mjs.
import { val, cur, prior, priorPriorTotalAssets } from '../src/engine/get.js';

const BS = ['cash', 'receivables', 'inventory', 'totalCurrentAssets', 'totalAssets', 'payables', 'shortTermDebt', 'totalCurrentLiabilities',
  'longTermDebt', 'totalLiabilities', 'equityParent', 'totalEquity', 'retainedEarnings'];
const IS = ['revenue', 'cogs', 'operatingIncome', 'depreciation', 'interestExpense', 'netIncome', 'netIncomeParent'];
const CF = ['cfo', 'capex'];

/** @returns {{ data: any[][], calc: any[][], checks: {id:string, row:number}[] }} rows are 0-based arrays; formulas are strings starting with '=' */
export function buildCrosscheck(d) {
  const y = cur(d), p = prior(d);
  const data = [['key', 'year ' + y, 'year ' + p]];
  const row = {};
  const add = (key, a, b) => { data.push([key, a, b]); row[key] = data.length; };
  for (const k of BS) add(`bs.${k}`, val(d, y, 'bs', k) ?? 0, val(d, p, 'bs', k) ?? 0);
  for (const k of IS) add(`is.${k}`, val(d, y, 'is', k) ?? 0, val(d, p, 'is', k) ?? 0);
  for (const k of CF) add(`cf.${k}`, val(d, y, 'cf', k) ?? 0, val(d, p, 'cf', k) ?? 0);
  add('shares', val(d, y, 'top', 'shares') ?? 0, val(d, p, 'top', 'shares') ?? 0);
  add('priorPriorTotalAssets', priorPriorTotalAssets(d) ?? val(d, p, 'bs', 'totalAssets'), '');

  const C = (k) => `Data!B${row[k]}`; // current year
  const P = (k) => `Data!C${row[k]}`; // prior year
  const begC = P('bs.totalAssets'), begP = `Data!B${row.priorPriorTotalAssets}`;

  const calc = [['id', 'formula']];
  const checks = [];
  const f = (id, formula) => { calc.push([id, `=${formula}`]); checks.push({ id, row: calc.length }); };

  f('currentRatio', `${C('bs.totalCurrentAssets')}/${C('bs.totalCurrentLiabilities')}`);
  f('quickRatio', `(${C('bs.totalCurrentAssets')}-${C('bs.inventory')})/${C('bs.totalCurrentLiabilities')}`);
  f('cashRatio', `${C('bs.cash')}/${C('bs.totalCurrentLiabilities')}`);
  f('dso', `${C('bs.receivables')}/${C('is.revenue')}*365`);
  if (val(d, y, 'bs', 'inventory') !== null && val(d, y, 'is', 'cogs') !== null) {
    f('dio', `${C('bs.inventory')}/${C('is.cogs')}*365`);
    f('dpo', `${C('bs.payables')}/${C('is.cogs')}*365`);
    f('ccc', `${C('bs.receivables')}/${C('is.revenue')}*365+${C('bs.inventory')}/${C('is.cogs')}*365-${C('bs.payables')}/${C('is.cogs')}*365`);
    f('grossMargin', `(${C('is.revenue')}-${C('is.cogs')})/${C('is.revenue')}`);
  }
  f('assetTurnover', `${C('is.revenue')}/${C('bs.totalAssets')}`);
  f('operatingMargin', `${C('is.operatingIncome')}/${C('is.revenue')}`);
  f('netMargin', `${C('is.netIncome')}/${C('is.revenue')}`);
  f('roa', `${C('is.netIncome')}/${C('bs.totalAssets')}`);
  f('roe', `${C('is.netIncomeParent')}/${C('bs.equityParent')}`);
  f('debtToEquity', `${C('bs.totalLiabilities')}/${C('bs.totalEquity')}`);
  f('debtRatio', `${C('bs.totalLiabilities')}/${C('bs.totalAssets')}`);
  if (val(d, y, 'is', 'interestExpense')) f('interestCoverage', `${C('is.operatingIncome')}/${C('is.interestExpense')}`);
  if (val(d, y, 'is', 'depreciation') !== null) {
    f('ebitdaMargin', `(${C('is.operatingIncome')}+${C('is.depreciation')})/${C('is.revenue')}`);
    f('netDebtToEbitda', `(${C('bs.shortTermDebt')}+${C('bs.longTermDebt')}-${C('bs.cash')})/(${C('is.operatingIncome')}+${C('is.depreciation')})`);
  }
  if (val(d, y, 'is', 'netIncome') > 0) f('cfoToNi', `${C('cf.cfo')}/${C('is.netIncome')}`);
  f('fcf', `${C('cf.cfo')}-${C('cf.capex')}`);

  // Piotroski (2000)
  const roaC = `${C('is.netIncome')}/${begC}`, roaP = `${P('is.netIncome')}/${begP}`;
  const cfoC = `${C('cf.cfo')}/${begC}`;
  f('p_roa', `IF(${roaC}>0,1,0)`);
  f('p_cfo', `IF(${cfoC}>0,1,0)`);
  f('p_deltaRoa', `IF(${roaC}-${roaP}>0,1,0)`);
  f('p_accrual', `IF(${cfoC}-${roaC}>0,1,0)`);
  f('p_deltaLever', `IF(${C('bs.longTermDebt')}/((${begC}+${C('bs.totalAssets')})/2)-${P('bs.longTermDebt')}/((${begP}+${begC})/2)<=0,1,0)`);
  f('p_deltaLiquid', `IF(${C('bs.totalCurrentAssets')}/${C('bs.totalCurrentLiabilities')}-${P('bs.totalCurrentAssets')}/${P('bs.totalCurrentLiabilities')}>0,1,0)`);
  f('p_eqOffer', `IF(${C('shares')}-${P('shares')}<=0,1,0)`);
  f('p_deltaMargin', `IF((${C('is.revenue')}-${C('is.cogs')})/${C('is.revenue')}-(${P('is.revenue')}-${P('is.cogs')})/${P('is.revenue')}>0,1,0)`);
  f('p_deltaTurn', `IF(${C('is.revenue')}/${begC}-${P('is.revenue')}/${begP}>0,1,0)`);
  const first = checks.find((c) => c.id === 'p_roa').row;
  f('piotroski', `SUM(B${first}:B${first + 8})`);

  // Altman Z'' (1995), no constant
  f('x1', `(${C('bs.totalCurrentAssets')}-${C('bs.totalCurrentLiabilities')})/${C('bs.totalAssets')}`);
  f('x2', `${C('bs.retainedEarnings')}/${C('bs.totalAssets')}`);
  f('x3', `${C('is.operatingIncome')}/${C('bs.totalAssets')}`);
  f('x4', `${C('bs.totalEquity')}/${C('bs.totalLiabilities')}`);
  const xr = checks.find((c) => c.id === 'x1').row;
  f('altmanZpp', `6.56*B${xr}+3.26*B${xr + 1}+6.72*B${xr + 2}+1.05*B${xr + 3}`);

  return { data, calc, checks };
}
