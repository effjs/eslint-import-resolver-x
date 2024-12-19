import fs from 'node:fs'

import { CachedInputFileSystem, ResolverFactory } from 'enhanced-resolve'

import { defaultConditionNames, defaultExtensionAlias, defaultExtensions, defaultMainFields } from './default'
import { digestHashObject } from './helpers'
import { init } from './init'
import { logger } from './logger'
import { resolveImport } from './resolveImport'

import type { InternalResolverOptions, Matcher, ResolvedResult, ResolverOptions } from './types'
import type { Resolver } from 'enhanced-resolve'

const times = []

let cachedOptions: InternalResolverOptions
let previousOptionsHash: ReturnType<typeof digestHashObject> | undefined
let optionsHash: ReturnType<typeof digestHashObject> | undefined
let resolverCachedOptions: InternalResolverOptions
let resolver: Resolver | undefined

export const interfaceVersion = 2

/**
 * @param specifier the module to resolve; i.e './some-module'
 * @param file the importing file's full path; i.e. '/usr/local/bin/file.js'
 * @param options
 */
export function resolve(specifier: string, file: string, options?: ResolverOptions): ResolvedResult {
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
      fileSystem: new CachedInputFileSystem(fs, 5 * 1000),
      useSyncFileSystemCalls: true,
    }
  }

  const matchers: Matcher[] = init(options ?? {}, optionsHash ?? digestHashObject(options))

  if (!resolver || resolverCachedOptions !== cachedOptions) {
    resolver = ResolverFactory.createResolver(cachedOptions)
    resolverCachedOptions = cachedOptions
  }

  const result = resolveImport(matchers, specifier, file, cachedOptions, resolver)

  if (options?.performanceToLog) {
    const t1 = performance.now()
    times.push(t1 - t0)
    logger('time resolve:', t1)
  }

  return result
}

export function createImportResolver(options: ResolverOptions) {
  if (!cachedOptions || previousOptionsHash !== (optionsHash = digestHashObject(options))) {
    previousOptionsHash = optionsHash
    cachedOptions = {
      ...options,
      conditionNames: options?.conditionNames ?? defaultConditionNames,
      extensions: options?.extensions ?? defaultExtensions,
      extensionAlias: options?.extensionAlias ?? defaultExtensionAlias,
      mainFields: options?.mainFields ?? defaultMainFields,
      fileSystem: new CachedInputFileSystem(fs, 5 * 1000),
      useSyncFileSystemCalls: true,
    }
  }

  const matchers: Matcher[] = init(options, optionsHash ?? digestHashObject(options))
  const resolver = ResolverFactory.createResolver(cachedOptions)

  return {
    name: 'eslint-import-resolver-x',
    interfaceVersion: 3,
    resolve(modulePath: string, source: string) {
      let t0: DOMHighResTimeStamp = 0

      if (options?.performanceToLog) t0 = performance.now()

      const result = resolveImport(matchers, modulePath, source, cachedOptions, resolver)

      if (options?.performanceToLog) {
        const t1 = performance.now()
        times.push(t1 - t0)
        logger('time resolve:', t1)
      }

      return result
    },
  }
}
