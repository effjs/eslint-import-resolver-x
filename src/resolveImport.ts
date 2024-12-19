import fs from 'node:fs'
import path from 'node:path'

import isNodeCoreModule from '@nolyfill/is-core-module'
import { getTsconfig } from 'get-tsconfig'
import { isBunModule } from 'is-bun-module'

import { JS_EXT_PATTERN, RELATIVE_PATH_PATTERN } from './constants'
import { defaultExtensions } from './default'
import { isFile, isModule, removeQuerystring } from './helpers'
import { logger } from './logger'

import type { InternalResolverOptions, Matcher, ResolvedResult } from './types'
import type { Resolver } from 'enhanced-resolve'
import type { TsConfigResult } from 'get-tsconfig'
import type { Version } from 'is-bun-module'

const fileTsJsConfigCache: Map<string, TsConfigResult> = new Map()
const possiblePathsBySpecifier: Map<string, { paths: string[]; path: TsConfigResult['path'] }> = new Map()

/**
 * Resolve an import specifier to a path
 * @param {Matcher[]} matchers matchers by digest of options
 * @param {string} specifier specifier of import to resolve
 * @param {string} file path of the file importing the specifier
 * @param {InternalResolverOptions} options options for the resolver
 * @param {Resolver} resolver resolver to use for resolving
 * @returns {ResolvedResult} whether the import was found and the resolved path
 */
export function resolveImport(
  matchers: Matcher[],
  specifier: string,
  file: string,
  options: InternalResolverOptions,
  resolver: Resolver
): ResolvedResult {
  logger('Resolving:', `'${specifier}'`, 'from:', file)

  specifier = removeQuerystring(specifier)

  if (isNodeCoreModule(specifier) || isBunModule(specifier, (process.versions.bun ?? 'latest') as Version)) {
    logger('is core module:', specifier)

    return {
      found: true,
      path: null,
    }
  }

  const mappedPath = getMappedPath(matchers, specifier, file, options.extensions)

  if (mappedPath) {
    logger('matched ts path:', mappedPath)
  }

  // note that even if we map the path, we still need to do a final resolve
  let foundNodePath
  try {
    foundNodePath = resolver.resolveSync({}, path.dirname(path.resolve(file)), mappedPath ?? specifier) || null
  } catch {
    foundNodePath = null
  }

  // naive attempt at `@types/*` resolution,
  // if path is neither absolute nor relative
  if (
    (JS_EXT_PATTERN.test(foundNodePath!) || (options.alwaysTryTypes && !foundNodePath)) &&
    !/^@types[/\\]/.test(specifier) &&
    !path.isAbsolute(specifier) &&
    !specifier.startsWith('.')
  ) {
    const definitelyTyped = resolveImport(
      matchers,
      '@types' + path.sep + mangleScopedPackage(specifier),
      file,
      options,
      resolver
    )
    if (definitelyTyped.found) {
      return definitelyTyped
    }
  }

  if (foundNodePath) {
    logger('matched node path:', foundNodePath)

    return {
      found: true,
      path: foundNodePath,
    }
  }

  logger("didn't find ", specifier)

  return {
    found: false,
  }
}

/**
 * For a scoped package, we must look in `@types/foo__bar` instead of `@types/@foo/bar`.
 * @param {string} moduleName the module name to mangle
 * @returns {string} the mangled scoped package name
 */
function mangleScopedPackage(moduleName: string): string {
  if (moduleName.startsWith('@')) {
    const replaceSlash = moduleName.replace(path.sep, '__')
    if (replaceSlash !== moduleName) {
      return replaceSlash.slice(1) // Take off the "@"
    }
  }
  return moduleName
}

/**
 * Get the mapped path for a given import specifier
 * @param {Matcher[]} matchers matchers by digest of options
 * @param {string} specifier specifier of import to resolve
 * @param {string} file path of the file importing the specifier
 * @param {string[]} extensions extensions to try
 * @returns mapped path if found, undefined otherwise
 */
function getMappedPath(
  matchers: Matcher[],
  specifier: string,
  file: string,
  extensions = defaultExtensions
): string | undefined {
  const originalExtensions = extensions

  extensions = ['', ...extensions]

  if (RELATIVE_PATH_PATTERN.test(specifier)) {
    const resolved = path.resolve(path.dirname(file), specifier)
    if (isFile(resolved)) {
      return resolved
    }
    return undefined
  }

  let projectConfig: TsConfigResult | null = null

  const { ext, dir } = path.parse(file)

  if (!/node_modules/.test(dir)) {
    // get ts config by file path for resolving it and find closest mapper
    projectConfig = getTsconfig(file, ext.includes('js') ? 'jsconfig.json' : 'tsconfig.json', fileTsJsConfigCache)
  }

  if (projectConfig) {
    fileTsJsConfigCache.set(file, projectConfig)
    logger('project config by file path:', projectConfig?.path)
  }

  const closestMatcher = matchers?.find((matcher) => {
    return matcher.path === projectConfig?.path
  })

  if (closestMatcher) {
    logger('found closest matcher by config path:', closestMatcher.path)
  }

  const matcherResult = closestMatcher
    ? closestMatcher.matcher(specifier)
    : matchers.map((mapper) => mapper?.matcher(specifier)).flat()

  const matcherPaths = matcherResult
    .map((item) => [
      ...extensions.map((ext) => `${item}${ext}`),
      ...originalExtensions.map((ext) => `${item}/index${ext}`),
    ])
    .flat()

  logger('matcher paths:', matcherPaths)

  const possiblePaths = possiblePathsBySpecifier.get(specifier)

  if (possiblePaths && possiblePaths.path === closestMatcher?.path) {
    logger(
      `found matching paths from cache by specifier ${specifier} and config ${possiblePaths.path} path:`,
      possiblePaths.paths
    )
    return possiblePaths.paths[0]
  }

  const paths = matcherPaths.filter((mappedPath) => {
    try {
      const stat = fs.statSync(mappedPath, { throwIfNoEntry: false })
      if (stat === undefined) return false
      if (stat.isFile()) return true
      if (stat.isDirectory()) {
        return isModule(mappedPath)
      }
    } catch {
      return false
    }

    return false
  })

  if (closestMatcher) {
    possiblePathsBySpecifier.set(specifier, { paths, path: closestMatcher.path })
  }

  if (paths.length > 1) {
    logger('found multiple matching paths:', paths)
  } else {
    logger('found matching paths:', paths)
  }

  return paths[0]
}
