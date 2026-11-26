import { COMMON } from './common.js';
import { BANK, INSURANCE } from './financial.js';

/** Every ratio definition, by id. */
export const RATIOS = Object.fromEntries([...COMMON, ...BANK, ...INSURANCE].map((r) => [r.id, r]));
