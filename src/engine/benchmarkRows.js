import { buildBenchmarks } from './benchmarks.js';

/**
 * Convert compact one-year benchmark rows (data/pex-benchmark.json) into minimal CompanyData objects,
 * so the very same ratio definitions compute the peer values.
 */
export function rowsToCompanies(rows) {
  return rows.map((r) => ({
    meta: { id: r.ticker, sector: r.sector, years: [r.year, r.year - 1], unit: r.unit, currency: r.currency },
    years: { [String(r.year)]: { bs: r.bs ?? {}, is: r.is ?? {}, cf: r.cf ?? {}, capitalAdequacy: r.capitalAdequacy, shares: r.shares } },
  }));
}

/** Sector benchmarks from data/pex-benchmark.json content. */
export function benchmarksFromFile(json) {
  return buildBenchmarks(rowsToCompanies(json.rows ?? []));
}
