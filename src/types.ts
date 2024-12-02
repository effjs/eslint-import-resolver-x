import type { ResolveOptions } from 'enhanced-resolve'
import type { TsConfigJsonResolved } from 'get-tsconfig'

export interface ResolverOptions extends Omit<ResolveOptions, 'fileSystem' | 'useSyncFileSystemCalls'> {
  alwaysTryTypes?: boolean
  project?: string[] | string
  extensions?: string[]
  performanceToLog?: boolean
}

export type InternalResolverOptions = Required<
  Pick<ResolveOptions, 'conditionNames' | 'extensionAlias' | 'extensions' | 'mainFields' | 'useSyncFileSystemCalls'>
> &
  ResolveOptions &
  ResolverOptions

export type Matcher = {
  matcher: (specifier: string) => string[]
  path: string
  config: TsConfigJsonResolved
}

export type ResultNotFound = {
  found: false
  path?: undefined
}

export type ResultFound = {
  found: true
  path: string | null
}

export type ResolvedResult = ResultNotFound | ResultFound
