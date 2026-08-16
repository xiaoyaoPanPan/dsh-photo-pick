/**
 * Package-owned invariant companion for `dsh-photo-pick-app`.
 * @module dsh-photo-pick-app/invariant
 */
const PACKAGE_NAME = 'dsh-photo-pick-app';
/** Cordis companion plugin name. */
export const name = 'photo-pick-app-bundle-invariant';
/** Service required before the companion can register. */
export const inject = ['invariants'];
/** No runtime invariant: the package is a static patch-list carrier. */
const install = () => { };
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map