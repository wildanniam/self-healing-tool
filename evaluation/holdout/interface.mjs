/**
 * Public, evaluator-only case interface. No healer/API imports are permitted here.
 * @typedef {object} HoldoutCase
 * @property {string} id Evaluator identifier; never include in provider input.
 * @property {string} group Application-level holdout group; never split its variants.
 * @property {string} kind Evaluator condition class; never include in provider input.
 * @property {{goalExpected:'action'|'refusal',intendedRecoverable:boolean,specApplicable:boolean,recoveryExpected:boolean}} expectation Evaluator-only planned denominators, available before setup.
 * @property {'fill'|'click'} action
 * @property {string} originalSelector Original test locator, a legitimate runtime input.
 * @property {string=} value
 * @property {{description:string, scope?:string}} task Legitimate test intent only.
 * @property {string|null} contractPath Explicit consumer-owned Markdown path.
 * @property {string} expectedRevision Deployment contract revision.
 * @property {(page:import('playwright').Page)=>Promise<void>} setup
 * @property {(page:import('playwright').Page,event?:unknown)=>Promise<{semantic:'correct'|'incorrect',wrongEffect:boolean,[key:string]:unknown}>} assess
 * @property {(page:import('playwright').Page,event?:unknown)=>Promise<void>=} afterAction Invoke only after a successful wrapped action; omitted event is for native preflight.
 * @property {(page:import('playwright').Page)=>Promise<void>} reset
 */
export const CASE_INTERFACE_VERSION = 1;
