import fs from 'node:fs'
import path from 'node:path'

import FastGlob from 'fast-glob'
import { sortPackageJson } from 'sort-package-json'

import pkg from '../package.json' assert { type: 'json' }

let newPackageJson = pkg

newPackageJson.scripts = {}
delete newPackageJson.packageManager

newPackageJson.files = FastGlob.globSync('*', { cwd: path.resolve(process.cwd(), 'dist') })

newPackageJson.publishConfig = {
  access: 'public',
}

newPackageJson = sortPackageJson(newPackageJson)

fs.writeFileSync('dist/package.json', JSON.stringify(newPackageJson, null, 2))
