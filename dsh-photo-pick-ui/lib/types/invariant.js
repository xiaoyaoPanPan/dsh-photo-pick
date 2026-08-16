/**
 * Package-owned invariant companion for `dsh-photo-pick-ui`.
 * @module dsh-photo-pick-ui/invariant
 */
const PACKAGE_NAME = 'dsh-photo-pick-ui';
/** Cordis companion plugin name. */
export const name = 'photo-pick-ui-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: nav section + HTTP client form with no owned
 * cross-plugin mutable relation on the Host half.
 */
const install = () => { };
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
//# sourceMappingURL=invariant.js.map