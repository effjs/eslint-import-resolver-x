// @ts-check
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/index.ts',
  output: [
    {
      format: 'esm',
      dir: 'dist',
      entryFileNames: 'index.js',
      plugins: [terser()],
    },
    {
      format: 'cjs',
      dir: 'dist',
      entryFileNames: 'index.cjs',
      plugins: [terser()],
    },
  ],
  external: [/node_modules/],
  plugins: [nodeResolve(), commonjs(), typescript()],
}
