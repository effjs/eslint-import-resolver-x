import path from 'node:path'

import { globSync } from 'fast-glob'
import { createPathsMatcher, getTsconfig } from 'get-tsconfig'
import isGlob from 'is-glob'

import { isFile } from './helpers'
import { logger } from './logger'

import type { InternalResolverOptions, Matcher } from './types'

// Vscode change cwd
const cwdMappersMap: Map<string, Matcher[]> = new Map()

/**
 * Initialize the resolver with the given options
 * @param options internal resolver options
 * @returns matchers for current cwd
 */
export function init(options: InternalResolverOptions): Matcher[] {
  let matchers: Matcher[] | undefined = cwdMappersMap.get(process.cwd())

  if (matchers) {
    return matchers
  }

  logger('[MAPPER] Init mapper for current cwd', process.cwd())

  const configPaths =
    typeof options.project === 'string'
      ? [options.project]
      : Array.isArray(options.project)
        ? options.project
        : [process.cwd()]

  const ignore = ['!**/node_modules/**']

  logger('[MAPPER] options.project:', configPaths)

  // turn glob patterns into paths
  const projectPaths = [
    ...new Set([
      ...configPaths.filter((path) => !isGlob(path)),
      ...globSync([...configPaths.filter((path) => isGlob(path)), ...ignore]).map((p) =>
        path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)
      ),
    ]),
  ]

  logger('[MAPPER] config paths of projects:', projectPaths)

  matchers = []

  for (let i = 0; i < projectPaths.length; i++) {
    let tsconfigResult = null
    const projectPath = projectPaths[i]

    if (isFile(projectPath)) {
      const { dir, base } = path.parse(projectPath)
      tsconfigResult = getTsconfig(dir, base)
    } else {
      tsconfigResult = getTsconfig(projectPath)
    }

    if (tsconfigResult) {
      const noop = () => []
      matchers.push({
        ...tsconfigResult,
        matcher: createPathsMatcher(tsconfigResult) ?? noop,
      })
    }
  }

  logger('[MAPPER] created matchers:', matchers)

  cwdMappersMap.set(process.cwd(), matchers)

  return matchers
}
