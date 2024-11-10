import fs from 'node:fs'
import path from 'node:path'

import { hashObject } from 'eslint-module-utils/hash'

/**
 * Remove any trailing querystring from module id
 * @param {string} specifier specifier of import
 * @returns {string}
 */
export function removeQuerystring(specifier: string): string {
  const querystringIndex = specifier.lastIndexOf('?')
  if (querystringIndex >= 0) {
    return specifier.slice(0, querystringIndex)
  }
  return specifier
}

/**
 * Check path is file
 * @param path system path
 * @returns {boolean} true if path is a file, false otherwise
 */
export const isFile = (path: string): boolean => {
  try {
    return !!(path && fs.statSync(path, { throwIfNoEntry: false })?.isFile())
  } catch {
    return false // Node 12 does not support throwIfNoEntry.
  }
}

/**
 * Check if path is a valid module (package.json exists)
 * @param modulePath path of module
 * @returns {boolean} true if modulePath is a valid module, false otherwise
 */
export function isModule(modulePath: string): boolean {
  return !!modulePath && isFile(path.resolve(modulePath, 'package.json'))
}

/**
 * Create a hash for an object
 * @param value object to hash
 * @returns {string} hash of the object
 */
export function digestHashObject(value: object | null | undefined): string {
  return hashObject(value ?? {}).digest('hex')
}
