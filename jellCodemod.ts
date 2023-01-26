import {
  emptyDir,
  ensureDir,
  walk,
} from 'https://deno.land/std@0.159.0/fs/mod.ts'
import {
  basename,
  dirname,
  join,
  relative,
} from 'https://deno.land/std@0.159.0/path/posix.ts'
import ts from 'npm:typescript'


// source: https://www.edgedb.com/blog/how-we-converted-our-node-js-library-to-deno-using-deno#writing-a-deno-ifier
// quite modified and simplifed though
const normalisePath = (path: string) => path.replace(/\\/g, '/')

async function convertToDeno({
  sourceDir,
  destDir,
  sourceFilter,
  importReplacer,
}: {
  sourceDir: string
  destDir: string
  sourceFilter?: (path: string) => boolean
  importReplacer?: (
    importPath: string,
    sourcePath: string
  ) => string | undefined | void
}) {
  console.log(`Denoifying ${sourceDir}...`)
  await emptyDir(destDir)

  const sourceFilePathMap = new Map<string, string>()

  for await (const entry of walk(sourceDir, { includeDirs: false })) {
    const sourcePath = normalisePath(entry.path)
    if (sourceFilter && !sourceFilter(sourcePath)) {
      continue
    }
    sourceFilePathMap.set(sourcePath, resolveDestPath(sourcePath))
  }

  for (const [sourcePath, destPath] of sourceFilePathMap) {
    compileFileForDeno(sourcePath, destPath)
  }

  async function compileFileForDeno(sourcePath: string, destPath: string) {
    const file = await Deno.readTextFile(sourcePath)
    await ensureDir(dirname(destPath))

    const parsedSource = ts.createSourceFile(
      basename(sourcePath),
      file,
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS
    )

    const rewrittenFile: string[] = []
    let cursor = 0
    parsedSource.forEachChild((node: any) => {
      if (
        (node.kind === ts.SyntaxKind.ImportDeclaration ||
          node.kind === ts.SyntaxKind.ExportDeclaration) &&
        node.moduleSpecifier
      ) {
        const pos = node.moduleSpecifier.pos + 2
        const end = node.moduleSpecifier.end - 1

        rewrittenFile.push(file.slice(cursor, pos))
        cursor = end

        const importPath = file.slice(pos, end)

        let resolvedImportPath = resolveImportPath(importPath, sourcePath)

        rewrittenFile.push(resolvedImportPath)
      }
    })
    rewrittenFile.push(file.slice(cursor))
    let contents = rewrittenFile.join('')

    await Deno.writeTextFile(destPath, contents)
  }

  function resolveDestPath(sourcePath: string) {
    return join(destDir, sourcePath)
  }

  function resolveImportPath(importPath: string, sourcePath: string) {
    // check the replacer
    if (importReplacer) {
      const result = importReplacer(importPath, sourcePath)
      if (result) return result
    }

    // then resolve normally
    let resolvedPath = join(dirname(sourcePath), importPath)

    if (!sourceFilePathMap.has(resolvedPath)) {
      // If importPath doesn't exist, first try appending '.ts'
      resolvedPath = join(dirname(sourcePath), importPath + '.ts')

      if (!sourceFilePathMap.has(resolvedPath)) {
        // If that path doesn't exist, next try appending '/index.ts'
        resolvedPath = join(dirname(sourcePath), importPath + '/index.ts')

        if (!sourceFilePathMap.has(resolvedPath)) {
          return `${importPath}.ignored`
        }
      }
    }

    const relImportPath = relative(
      dirname(sourceFilePathMap.get(sourcePath)!),
      sourceFilePathMap.get(resolvedPath)!
    )
    return relImportPath.startsWith('../')
      ? relImportPath
      : './' + relImportPath
  }
}


await convertToDeno({
  sourceDir: './jell-machine/src',
  destDir: './modded',
  sourceFilter: path => path.endsWith('.ts'),
  importReplacer: path => {
    if (
      ['@tauri-apps/api', 'svelte/store', 'create-arr', 'pako'].includes(path)
    ) {
      return `npm:${path}`
    }
    if (path.startsWith('@')) return `${path}.ts`
  },
})
console.log('Done with codemod')