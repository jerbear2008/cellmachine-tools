import { type CellType } from '@jell/core/cells/cellType.ts'
import { load as loadRegistry } from '@jell/extensions/jm.core.ts'
import { CellGrid } from '@jell/core/cells/grid.ts'
import { Registry } from '@jell/core/registry.ts'
import { Position } from '@jell/core/coord/positions.ts'
import { Direction } from '@jell/core/coord/direction.ts'

loadRegistry()
function coreCell(name: string) {
  const cell = Registry.getCell(`jm.core.${name}`)
  if (!cell) throw new Error(`Cell ${name} not found in the registry`)
  return cell
}

const push = coreCell('push')
const generator = coreCell('generator')

const grid = CellGrid.createEmpty(100, 100)

const nuke: [[number, number], CellType, keyof typeof Direction][] = [
  [[0, 3], generator, 'Right'],
  [[1, 3], generator, 'Right'],
  [[0, 2], generator, 'Up'],
  [[1, 2], generator, 'Up'],
  [[0, 1], generator, 'Up'],
  [[1, 1], generator, 'Up'],
]
nuke.forEach(cell =>
  grid.loadCell(new Position(...cell[0]), cell[1], Direction[cell[2]])
)

for (let i = 0; i < 15; i++) grid.doStep(false)

const code = grid.toString('V3')
if (!code) throw new Error('Failed to export code')
console.log(code)

const importResult = CellGrid.loadFromString(code)
if (!importResult[0]) throw new Error('Failed to import code', { cause: importResult[1] })
const imported = importResult[1]

const topRightCell = imported.cells.get(new Position(99, 99))
console.log(
  'top right cell is',
  topRightCell?.type.id.split('.')[2],
  'facing',
  Direction[topRightCell?.direction].toLowerCase()
)