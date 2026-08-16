/**
 * Package-owned invariant companion for `dsh-tool-photo-pick`.
 * @module dsh-tool-photo-pick/invariant
 */
const PACKAGE_NAME = 'dsh-tool-photo-pick';
/** Cordis companion plugin name. */
export const name = 'tool-photo-pick-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/** No companion stream: tools register through the shared tools service. */
const install = () => { };
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
//# sourceMappingURL=invariant.js.map