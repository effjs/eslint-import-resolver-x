import path from 'node:path'

import { globSync } from 'fast-glob'
import { createPathsMatcher, getTsconfig } from 'get-tsconfig'
import isGlob from 'is-glob'

import { isFile } from './helpers'
import { logger } from './logger'

import type { ResolverOptions, Matcher } from './types'

const matchersMap: Map<string, Matcher[]> = new Map()

/**
 * Initialize the resolver with the given options
 * @param options internal resolver options
 * @returns matchers for options
 */
export function init(options: ResolverOptions, digestOfOptions: string): Matcher[] {
  const matchersByDigets: Matcher[] | undefined = matchersMap.get(digestOfOptions)

  logger('[INIT] Digest of options: ', digestOfOptions)

  if (matchersByDigets) {
    logger('[INIT] Use matchers from cache by digest')
    return matchersByDigets
  }

  logger('[INIT] Create matchers for current options: ', options)

  const configPaths =
    typeof options.project === 'string'
      ? [options.project]
      : Array.isArray(options.project)
        ? options.project
        : [process.cwd()]

  const ignore = ['!**/node_modules/**']

  // turn glob patterns into paths
  const projectPaths = [
    ...new Set([
      ...configPaths.filter((path) => !isGlob(path)),
      ...globSync([...configPaths.filter((path) => isGlob(path)), ...ignore]).map((p) =>
        path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)
      ),
    ]),
  ]

  const matchers: Matcher[] = []

  logger('[INIT] config paths of projects:', projectPaths)

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

  logger('[INIT] created matchers:', matchers)

  matchersMap.set(digestOfOptions, matchers)

  return matchers
}
