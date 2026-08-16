//#region src/invariant.ts
const PACKAGE_NAME = "dsh-photo-pick-app";
/** Cordis companion plugin name. */
const name = "photo-pick-app-bundle-invariant";
/** Service required before the companion can register. */
const inject = ["invariants"];
/** No runtime invariant: the package is a static patch-list carrier. */
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
