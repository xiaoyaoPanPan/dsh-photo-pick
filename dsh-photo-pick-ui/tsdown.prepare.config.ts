import { prepareClientBundle } from './tsdown.client-standalone.ts'

/**
 * Consumer-side build for git installs (`prepare`): node half + client.js from
 * `src/` without harness `packages/client/tsdown.client.ts`.
 */
export default prepareClientBundle('dsh-photo-pick-ui')
