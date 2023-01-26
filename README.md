# cellmachine-tools

My collection of JavaScript/TypeScript tools for working with Cell Machine and its levels. Use it for whatever, if you make something cool with it lmk (or make a PR)

## Jell Machine API

The Jell Machine API can be imported and used in Deno. Install `deno`, then run `deno task build` to fetch and apply the codemod to Jell Machine. It can then be imported like this:

```ts
import { load as loadRegistry } from '@jell/extensions/jm.core.ts'
import { CellGrid } from '@jell/core/cells/grid.ts'
loadRegistry()

const grid = CellGrid.createEmpty()
console.log(grid.toString('V3'))
```