import fs from 'node:fs'
import path from 'node:path'

import isNodeCoreModule from '@nolyfill/is-core-module'
import { getTsconfig } from 'get-tsconfig'
import { isBunModule } from 'is-bun-module'

import { JS_EXT_PATTERN, RELATIVE_PATH_PATTERN } from './constants'
import { defaultExtensions } from './default'
import { isFile, isModule, removeQuerystring } from './helpers'
import { init } from './init'
import { logger } from './logger'

import type { InternalResolverOptions, Matcher } from './types'
import type { Resolver } from 'enhanced-resolve'
import type { Version } from 'is-bun-module'

const fileTsConfigCache = new Map()

/**
 * Resolve an import specifier to a path
 * @param {string} specifier specifier of import to resolve
 * @param {string} file path of the file importing the specifier
 * @param {InternalResolverOptions} options options for the resolver
 * @param {Resolver} resolver resolver to use for resolving
 * @returns { found: boolean; path?: string | null } whether the import was found and the resolved path
 */
export function resolveImport(
  specifier: string,
  file: string,
  options: InternalResolverOptions,
  resolver: Resolver
): { found: boolean; path?: string | null } {
  logger('Resolving:', `'${specifier}'`, 'from:', file)

  specifier = removeQuerystring(specifier)

  if (isNodeCoreModule(specifier) || isBunModule(specifier, (process.versions.bun ?? 'latest') as Version)) {
    logger('is core module:', specifier)

    return {
      found: true,
      path: null,
    }
  }

  const currentMatchersOfCwd = init(options)

  const mappedPath = getMappedPath(currentMatchersOfCwd, specifier, file, options.extensions)

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
    const definitelyTyped = resolveImport('@types' + path.sep + mangleScopedPackage(specifier), file, options, resolver)
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
 * @param {string} specifier specifier of import to resolve
 * @param {string} file path of the file importing the specifier
 * @param {string[]} extensions extensions to try
 * @returns mapped path if found, undefined otherwise
 */
function getMappedPath(
  currentMatchersOfCwd: Matcher[],
  specifier: string,
  file: string,
  extensions = defaultExtensions
): string | undefined {
  const originalExtensions = extensions

  extensions = ['', ...extensions]

  let paths: string[] = []

  if (RELATIVE_PATH_PATTERN.test(specifier)) {
    const resolved = path.resolve(path.dirname(file), specifier)
    if (isFile(resolved)) {
      paths = [resolved]
    }
  } else {
    let projectConfig
    const isJsconfig = currentMatchersOfCwd.every((mapper) => mapper.path.includes('jsconfig'))

    const fromCache = fileTsConfigCache.get(file)

    if (fromCache) {
      projectConfig = fromCache
    } else {
      projectConfig = getTsconfig(file, isJsconfig ? 'jsconfig.json' : 'tsconfig.json')
    }

    if (projectConfig) logger('project config by file path:', projectConfig?.path)

    const closestMapper = currentMatchersOfCwd?.find((mapper) => {
      return mapper.path === projectConfig?.path
    })

    if (closestMapper) {
      logger('found closest mapper by config path:', closestMapper.path)
    }

    const possiblePaths = (
      closestMapper
        ? closestMapper.matcher(specifier)
        : currentMatchersOfCwd.map((mapper) => mapper?.matcher(specifier)).flat()
    )
      .map((item) => [
        ...extensions.map((ext) => `${item}${ext}`),
        ...originalExtensions.map((ext) => `${item}/index${ext}`),
      ])
      .flat()

    logger('possible paths:', possiblePaths)

    paths = possiblePaths.filter((mappedPath) => {
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

    logger('paths', paths)
  }

  if (paths.length > 1) {
    logger('found multiple matching ts paths:', paths)
  }

  return paths[0]
}
