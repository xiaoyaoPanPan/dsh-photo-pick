#!/usr/bin/env node
/**
 * Copy the shipped `photo-pick` agent preset into `$DSH_HOME/.agent-presets/photo-pick`.
 * Safe to re-run: refuses to overwrite an existing directory unless `--force`.
 *
 * Zero package dependencies so `pnpm --dir <profile> exec dsh-photo-pick-setup-preset`
 * works after a plain `dsh plugin add`.
 * @module dsh-photo-pick-app/bin
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
/* v8 ignore start -- thin CLI entry; exercised by install smoke, not unit coverage */
/**
 * Resolve harness home: `$DSH_HOME` if set and non-blank, else `~/.dsh`.
 * @returns absolute harness home path
 */
function resolveDshHome() {
    const fromEnv = process.env.DSH_HOME;
    if (fromEnv !== undefined && fromEnv.trim().length > 0) {
        return resolve(fromEnv.trim());
    }
    return join(homedir(), '.dsh');
}
const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = join(PACKAGE_ROOT, 'agent-presets', 'photo-pick');
const DEST = join(resolveDshHome(), '.agent-presets', 'photo-pick');
const force = process.argv.includes('--force');
if (!existsSync(SOURCE)) {
    process.stderr.write(`dsh-photo-pick-setup-preset: shipped preset missing at ${SOURCE}\n`);
    process.exit(1);
}
if (existsSync(DEST) && !force) {
    process.stderr.write(`dsh-photo-pick-setup-preset: ${DEST} already exists (pass --force to replace)\n`);
    process.exit(0);
}
mkdirSync(dirname(DEST), { recursive: true });
cpSync(SOURCE, DEST, { recursive: true, force: true });
process.stdout.write(`dsh-photo-pick-setup-preset: installed photo-pick preset at ${DEST}\n`);
/* v8 ignore stop */
//# sourceMappingURL=bin.js.map