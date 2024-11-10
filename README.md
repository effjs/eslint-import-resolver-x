# eslint-import-resolver-x

This resolver adds [`TypeScript`][] or [`JavaScript`][] import support to [`eslint-plugin-import`][] with `tsconfig.json` or `jsconfig.json` aliases (`compilerOptions.paths`)

This is fork of [`eslint-import-resolver-typescript`][] but much faster **(~30-40%)**

For example we can use `strace` package for count of [fstat](`https://nodejs.org/api/fs.html#fsfstatsyncfd-options`) call when linting you codebase

Example you codebase has multiple packages with 100k LOC and more

| syscall    | eslint-import-resolver-x | eslint-import-resolver-typescript |
| ---------- | ------------------------ | --------------------------------- |
| access     | 85 027                   |
| chdir      | 1                        |
| execve     | 78                       |
| faccessat2 | 1                        |
| getcwd     | 3                        |
| mkdir      | 2                        |
| newfstatat | 31 761                   |
| openat     | 86 287                   |
| readlink   | 1 183 633                |
| statfs     | 2                        |
| statx      | 1 081 306                |
| unlink     | 3                        |

We are interested in how many accesses to the file system occurred during the linting process. We can pay attention to `statx` syscall.

`eslint-import-resolver-x` makes calls `statx` 100 times less.

**If you notice an increase in linting performance in your CI on large code bases, write your feedback [here](https://github.com/helljs/eslint-import-resolver-x/discussions/1)**

## Description

You can:

- `import`/`require` files with extension any extenstions of `js` or `ts`
- Use [`paths`](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping) defined in `tsconfig.json` or `jsconfig.json`
- Multiple tsconfigs or jsconfigs support
- `imports/exports` fields support in `package.json`

## Installation

```sh
# npm
npm i -D eslint-plugin-import @helljs/eslint-import-resolver-x

# pnpm
pnpm i -D eslint-plugin-import @helljs/eslint-import-resolver-x

# yarn
yarn add -D eslint-plugin-import @helljs/eslint-import-resolver-x
```

## Configuration

Add the following to your `.eslintrc` config:

### TypeScript

```jsonc
{
  "plugins": ["import"],
  "rules": {
    // turn on errors for missing imports
    "import/no-unresolved": "error",
  },
  "settings": {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      "x": {
        "alwaysTryTypes": true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`

        // Choose from one of the "project" configs below or omit to use <root>/tsconfig.json by default

        // use <root>/path/to/folder/tsconfig.json
        "project": "path/to/folder",

        // Multiple tsconfigs (Useful for monorepos)

        // use a glob pattern
        "project": "packages/*/tsconfig.json",

        // use an array
        "project": ["packages/module-a/tsconfig.json", "packages/module-b/tsconfig.json"],

        // use an array of glob patterns
        "project": ["packages/*/tsconfig.json", "other-packages/*/tsconfig.json"],
      },
    },
  },
}
```

### JavaScript

```jsonc
{
  "plugins": ["import"],
  "rules": {
    // turn on errors for missing imports
    "import/no-unresolved": "error",
  },
  "settings": {
    "import/parsers": {
      "@babel/eslint-parser": [".js", ".mjs"],
    },
    "import/resolver": {
      "x": {
        // use <root>/path/to/folder/jsconfig.json
        "project": "path/to/folder",

        // Multiple jsconfigs (Useful for monorepos)

        // use a glob pattern
        "project": "packages/*/jsconfig.json",

        // use an array
        "project": ["packages/module-a/jsconfig.json", "packages/module-b/jsconfig.json"],

        // use an array of glob patterns
        "project": ["packages/*/jsconfig.json", "other-packages/*/jsconfig.json"],
      },
    },
  },
}
```

## Options from [`enhanced-resolve`][]

#### `conditionNames` - [See default](src/default.ts)

#### `extensions` - [See default](src/default.ts)

#### `extensionAlias` - [See default](src/default.ts)

### `mainFields` - [See default](src/default.ts)

### Other options

You can pass through other options of [`enhanced-resolve`][] directly

## License

[ISC][]

[`eslint-plugin-import`]: https://www.npmjs.com/package/eslint-plugin-import
[`enhanced-resolve`]: https://www.npmjs.com/package/enhanced-resolve
[`typescript`]: https://www.typescriptlang.org
[`javascript`]: https://ecma-international.org/
[isc]: https://opensource.org/licenses/ISC
