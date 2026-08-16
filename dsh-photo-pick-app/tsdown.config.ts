import { defineConfig } from 'tsdown'

/** Bundle empty app entry plus setup-preset bin. Declarations from `tsc -b`. */
export default defineConfig({
  entry: [
    'lib/types/index.js',
    'lib/types/invariant.js',
    'lib/types/bin.js',
  ],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
