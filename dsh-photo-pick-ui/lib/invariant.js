//#region src/invariant.ts
const PACKAGE_NAME = "dsh-photo-pick-ui";
/** Cordis companion plugin name. */
const name = "photo-pick-ui-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: nav section + HTTP client form with no owned
* cross-plugin mutable relation on the Host half.
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
