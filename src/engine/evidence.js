/**
 * Evidence = one exhibit in a hall.
 * @typedef {{ id:string, hall:string, axis:string|null, titleAr:string, value:number|null, displayAr:string,
 *   formulaAr:string, basisAr:string, inputs:{labelAr,value,src}[], benchmark:object|null,
 *   severity:'info'|'watch'|'alert', prosecutionAr:string, defenseAr:string, meaningAr:string, quote?:string, page?:number }} Evidence
 */
export function makeEvidence(o) {
  return {
    axis: null, value: null, displayAr: '', formulaAr: '', basisAr: '', inputs: [], benchmark: null,
    severity: 'info', prosecutionAr: '', defenseAr: '', meaningAr: '',
    ...o,
  };
}
