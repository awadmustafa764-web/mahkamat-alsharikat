/** The exhibition follows the argument: what is for, what is against, what the auditor says, then the verdict. */
export const ARG_HALLS = ['against', 'for', 'mustKnow'];

export const HALL_TITLES = {
  for: 'لماذا نعم', against: 'لماذا لا', mustKnow: 'ما يجب أن تعرفه', verdict: 'قاعة الحكم',
  // card labels for evidence opened from the archive
  intro: 'التعريف بالمتهم', profitability: 'الربحية', liquidity: 'السيولة', solvency: 'الملاءة والمديونية',
  efficiency: 'الكفاءة والنشاط', quality: 'جودة الأرباح', disclosures: 'الإفصاحات وتقرير المدقق',
};

export const GEOM = { halfWidth: 3.4, slotGap: 4, hallGap: 6, eye: 1.6, standOff: 2.6 };

/**
 * Pure layout along −z.
 * @returns {{ halls:{id,titleAr,empty,z0,z1,slots:{evidenceId,position:number[],wall:'left'|'right'}[]}[],
 *            stops:{evidenceId:string|null,hallId:string,side:'for'|'against'|null,position:number[],target:number[]}[], length:number }}
 */
export function buildLayout(caseObj) {
  const { halfWidth: W, slotGap, hallGap, eye, standOff } = GEOM;
  const halls = [];
  const stops = [];
  let z = -4;
  const arg = caseObj.argument;
  const sideOf = (hallId, e) => (hallId === 'for' ? 'for' : hallId === 'against' ? 'against' : e.severity === 'alert' ? 'against' : null);

  for (const id of ARG_HALLS) {
    const items = arg[id] ?? [];
    const z0 = z;
    stops.push({ evidenceId: null, hallId: id, side: null, position: [0, eye, z0 + 1.5], target: [0, eye + 0.5, z0 - 1.4] });
    z -= 2.4;
    const slots = items.map((e, i) => {
      const wall = i % 2 === 0 ? 'right' : 'left';
      const pz = z - Math.floor(i / 2) * slotGap;
      const x = wall === 'right' ? W : -W;
      const position = [x, eye, pz];
      stops.push({ evidenceId: e.id, hallId: id, side: sideOf(id, e), position: [x * 0.12, eye, pz + standOff * 0.3], target: position });
      return { evidenceId: e.id, position, wall };
    });
    z -= Math.max(1, Math.ceil(items.length / 2)) * slotGap;
    halls.push({ id, titleAr: HALL_TITLES[id], empty: items.length === 0, z0, z1: z, slots });
    z -= hallGap;
  }
  const vz = z;
  stops.push({ evidenceId: null, hallId: 'verdict', side: null, position: [0, eye, vz + 4], target: [0, 1.4, vz - 2] });
  halls.push({ id: 'verdict', titleAr: HALL_TITLES.verdict, empty: false, z0: vz + 2, z1: vz - 8, slots: [] });
  return { halls, stops, length: -(vz - 8) };
}
