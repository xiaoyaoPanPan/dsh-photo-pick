import { defineConfig } from 'tsdown'

/**
 * Consumer-side build for git installs (`prepare`): transpile from `src`
 * without harness project references. Types are not emitted here.
 */
export default defineConfig({
  entry: ['src/index.ts', 'src/invariant.ts', 'src/bin.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  tsconfig: 'tsconfig.prepare.json',
})
