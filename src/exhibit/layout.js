import { HALLS } from '../engine/constants.js';

export const HALL_TITLES = {
  intro: 'قاعة التعريف بالمتهم', profitability: 'قاعة الربحية', liquidity: 'قاعة السيولة', solvency: 'قاعة الملاءة والمديونية',
  efficiency: 'قاعة الكفاءة والنشاط', quality: 'قاعة جودة الأرباح', disclosures: 'قاعة الإفصاحات وتقرير المدقق', verdict: 'قاعة الحكم',
};

export const GEOM = { halfWidth: 3.2, slotGap: 3.4, hallGap: 5, eye: 1.6, standOff: 2.6 };

/**
 * Pure layout of the exhibition along −z. Every hall is kept (empty ones get a plaque); the surprise is the last exhibit before the verdict.
 * @returns {{ halls:{id,titleAr,empty,z0,z1,slots:{evidenceId,position:number[],wall:'left'|'right'}[]}[],
 *            stops:{evidenceId:string|null,hallId:string,position:number[],target:number[]}[], length:number }}
 */
export function buildLayout(caseObj) {
  const { halfWidth: W, slotGap, hallGap, eye, standOff } = GEOM;
  const halls = [];
  const stops = [];
  let z = -4;
  const surpriseId = caseObj.surprise?.id ?? null;

  for (const id of HALLS) {
    let items = (caseObj.halls[id] ?? []).filter((e) => e.id !== surpriseId);
    if (id === 'disclosures' && caseObj.surprise) items = [...items, caseObj.surprise];
    const z0 = z;
    // hall entrance stop: read the hall plaque
    stops.push({ evidenceId: null, hallId: id, position: [0, eye, z0 + 1.5], target: [0, eye + 0.6, z0 - 1.2] });
    z -= 2.2;
    const slots = items.map((e, i) => {
      const wall = i % 2 === 0 ? 'right' : 'left';   // RTL reading: start on the right wall
      const pz = z - Math.floor(i / 2) * slotGap;
      const x = wall === 'right' ? W : -W;
      const position = [x, eye, pz];
      stops.push({ evidenceId: e.id, hallId: id, position: [x * 0.18, eye, pz + standOff * 0.35], target: position });
      return { evidenceId: e.id, position, wall };
    });
    z -= Math.max(1, Math.ceil(items.length / 2)) * slotGap;
    halls.push({ id, titleAr: HALL_TITLES[id], empty: items.length === 0, z0, z1: z, slots });
    z -= hallGap;
  }
  const vz = z;
  stops.push({ evidenceId: null, hallId: 'verdict', position: [0, eye, vz + 4], target: [0, 1.4, vz - 2] });
  halls.push({ id: 'verdict', titleAr: HALL_TITLES.verdict, empty: false, z0: vz + 2, z1: vz - 8, slots: [] });
  return { halls, stops, length: -(vz - 8) };
}
