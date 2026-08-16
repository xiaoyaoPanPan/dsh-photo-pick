//#region src/invariant.ts
const PACKAGE_NAME = "dsh-photo-pick";
/** Cordis companion plugin name. */
const name = "photo-pick-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: the abstract seam publishes no independent observation
* stream; backends enforce root containment and single-flight on each call.
*/
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
