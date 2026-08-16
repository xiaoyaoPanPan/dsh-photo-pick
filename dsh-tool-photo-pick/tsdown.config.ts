import { defineConfig } from 'tsdown'

/** Bundle Host runtime from tsc emit. Declarations come from `tsc -b`. */
export default defineConfig({
  entry: [
    'lib/types/index.js',
    'lib/types/invariant.js',
  ],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
