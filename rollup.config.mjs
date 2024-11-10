// @ts-check
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

export default [
  {
    input: 'src/index.ts',
    output: {
      format: 'esm',
      dir: 'dist',
      entryFileNames: 'index-esm.js',
    },
    external: [/node_modules/],
    plugins: [nodeResolve(), commonjs(), typescript()],
  },
  {
    input: 'src/index.ts',
    output: {
      format: 'cjs',
      dir: 'dist',
      entryFileNames: 'index-cjs.js',
    },
    external: [/node_modules/],
    plugins: [nodeResolve(), commonjs(), typescript()],
  },
]
