import fs from 'node:fs'

import enhancedResolve from 'enhanced-resolve'

import { defaultConditionNames, defaultExtensionAlias, defaultExtensions, defaultMainFields } from './default'
import { digestHashObject } from './helpers'
import { logger } from './logger'
import { resolveImport } from './resolveImport'

import type { InternalResolverOptions, ResolverOptions } from './types'
import type { Resolver } from 'enhanced-resolve'

const times = []

let cachedOptions: InternalResolverOptions
let previousOptionsHash: ReturnType<typeof digestHashObject>
let optionsHash: ReturnType<typeof digestHashObject>
let resolverCachedOptions: InternalResolverOptions
let resolver: Resolver | undefined

export const interfaceVersion = 2

/**
 * @param specifier the module to resolve; i.e './some-module'
 * @param file the importing file's full path; i.e. '/usr/local/bin/file.js'
 * @param options
 */
export function resolve(
  specifier: string,
  file: string,
  options?: ResolverOptions | undefined | null
): { found: boolean; path?: string | null } {
  let t0: DOMHighResTimeStamp = 0

  if (options?.performanceToLog) t0 = performance.now()

  if (!cachedOptions || previousOptionsHash !== (optionsHash = digestHashObject(options))) {
    previousOptionsHash = optionsHash
    cachedOptions = {
      ...options,
      conditionNames: options?.conditionNames ?? defaultConditionNames,
      extensions: options?.extensions ?? defaultExtensions,
      extensionAlias: options?.extensionAlias ?? defaultExtensionAlias,
      mainFields: options?.mainFields ?? defaultMainFields,
      fileSystem: new enhancedResolve.CachedInputFileSystem(fs, 5 * 1000),
      useSyncFileSystemCalls: true,
    }
  }

  if (!resolver || resolverCachedOptions !== cachedOptions) {
    resolver = enhancedResolve.ResolverFactory.createResolver(cachedOptions)
    resolverCachedOptions = cachedOptions
  }

  const result = resolveImport(specifier, file, cachedOptions, resolver)

  if (options?.performanceToLog) {
    const t1 = performance.now()
    times.push(t1 - t0)
    logger('time resolve:', t1)
  }

  return result
}
