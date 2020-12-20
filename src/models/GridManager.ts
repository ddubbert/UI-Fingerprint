export interface MousePosition { x: number; y: number }
export interface Column { x: number; height: number }
export interface Row { y: number; width: number }
export interface Grid { columns: Column[]; rows: Row[] }
export interface Cell {
  x: number;
  y: number;
  size: number;
}
export interface Vector {
  start: MousePosition;
  end: MousePosition;
  importance: number;
}
export interface Interaction {
  mousePositions: MousePosition[];
  importantCellsIndices: MousePosition[];
  importantCells: Cell[];
  importantVectors: Vector[];
}

const MIN_AMOUNT_PER_CELL = 20;
const AMOUNT_CONNECTIONS = 5;
const AMOUNT_CELLS_PER_ROW = 20;
const SAMPLING_INTERVAL = 1000 / 10;
const MIN_MATCHING_FACTOR = 1 / 2;

let interval: number | undefined;
const windowSize = {
  width: 0,
  height: 0,
};

const currentMousePos: MousePosition = { x: 0, y: 0 };

const capturedInteractions: Interaction[] = [];

function setWindowSize(x: number, y: number) {
  windowSize.width = x;
  windowSize.height = y;
}

function getCellSize() {
  return windowSize.width / AMOUNT_CELLS_PER_ROW;
}

function calculateGrid(): Grid {
  const width = getCellSize();
  const columns = [];
  const rows = [];
  for (let i = 0; i < AMOUNT_CELLS_PER_ROW; i += 1) {
    columns.push({ x: width * i, height: windowSize.height });
    rows.push({ y: width * i, width: windowSize.width });
  }
  return { columns, rows };
}

function setMousePosition(e: MouseEvent) {
  currentMousePos.x = e.x;
  currentMousePos.y = e.y;
}

function startMouseTracker() {
  capturedInteractions.push({
    mousePositions: [],
    importantCellsIndices: [],
    importantCells: [],
    importantVectors: [],
  });

  document.addEventListener('mousemove', setMousePosition);

  clearInterval(interval);
  interval = setInterval(() => {
    const cur = { ...currentMousePos };
    capturedInteractions[capturedInteractions.length - 1].mousePositions.push(cur);
  }, SAMPLING_INTERVAL);
}
function mousePositionToCellPosition(m: MousePosition): MousePosition {
  const cellSize = getCellSize();
  const cellX = Math.floor(m.x / cellSize);
  const cellY = Math.floor(m.y / cellSize);
  return { x: cellX, y: cellY };
}

interface CellWithAmount {
  cell: MousePosition;
  amount: number;
}

function getImportantCells(index: number): Cell[] {
  const cellSize = getCellSize();
  return capturedInteractions[index].importantCellsIndices.map((it) => ({
    x: it.x * cellSize,
    y: it.y * cellSize,
    size: cellSize,
  }));
}

function getImportantVectors(index: number): Vector[] {
  const cellSize = getCellSize();
  const { importantCells } = capturedInteractions[index];
  return importantCells.reduce((acc, cell, cellIndex) => {
    const cellsAfterCurrent = (importantCells.length - 1) - cellIndex;
    const amountConnections = (cellsAfterCurrent < AMOUNT_CONNECTIONS)
      ? cellsAfterCurrent
      : AMOUNT_CONNECTIONS;

    const currentPointVectors: Vector[] = [];

    const start = {
      x: cell.x + cellSize / 2,
      y: cell.y + cellSize / 2,
    } as MousePosition;

    for (let i = 1; i <= amountConnections; i += 1) {
      currentPointVectors.push({
        start,
        end: {
          x: importantCells[cellIndex + i].x + cellSize / 2,
          y: importantCells[cellIndex + i].y + cellSize / 2,
        },
        importance: 1 / i,
      });
    }

    return [...acc, ...currentPointVectors];
  }, [] as Vector[]);
}

function stopMouseTracker() {
  document.removeEventListener('mousemove', setMousePosition);
  clearInterval(interval);
  const capturedCellPositions = capturedInteractions[capturedInteractions.length - 1]
    .mousePositions.map(mousePositionToCellPosition);
  const cellTimes = capturedCellPositions.reduce((acc, cell, index) => {
    const newAcc = { ...acc };

    if (newAcc.pos.x === cell.x && newAcc.pos.y === cell.y) {
      newAcc.count += 1;
    } else {
      newAcc.list.push({ cell: newAcc.pos, amount: newAcc.count });
      newAcc.pos = cell;
      newAcc.count = 1;
    }

    if (index === capturedCellPositions.length - 1) {
      newAcc.list.push({ cell: newAcc.pos, amount: newAcc.count });
    }

    return newAcc;
  }, { count: 0, pos: { x: 0, y: 0 } as MousePosition, list: [] as CellWithAmount[] }).list;

  capturedInteractions[capturedInteractions.length - 1].importantCellsIndices = cellTimes
    .filter((it) => it.amount >= MIN_AMOUNT_PER_CELL)
    .map((it) => it.cell);

  capturedInteractions[capturedInteractions.length - 1]
    .importantCells = getImportantCells(capturedInteractions.length - 1);

  capturedInteractions[capturedInteractions.length - 1]
    .importantVectors = getImportantVectors(capturedInteractions.length - 1);
}

interface VectorHashMap {
  [details: string]: Vector[];
}

function findPatterns(): Vector[] {
  const patterns = capturedInteractions.reduce((acc, interaction) => {
    const newAcc = { ...acc };
    interaction.importantVectors.forEach((vector) => {
      const hash = `${vector.start.x}${vector.start.y}${vector.end.x}${vector.end.y}`;
      if (hash in newAcc) newAcc[hash].push(vector);
      else newAcc[hash] = [vector];
    });
    return newAcc;
  }, {} as VectorHashMap);

  return Object.keys(patterns)
    .reduce((acc, key) => {
      const newAcc = [...acc];
      if (patterns[key].length >= capturedInteractions.length * MIN_MATCHING_FACTOR) {
        newAcc.push({
          start: patterns[key][0].start,
          end: patterns[key][0].end,
          importance: patterns[key]
            .reduce((sum, v) => sum + v.importance, 0) / patterns[key].length,
        });
      }
      return newAcc;
    }, [] as Vector[]);
}

function getInteractions(): Interaction[] {
  return capturedInteractions;
}

export interface GridManager {
  setWindowSize(x: number, y: number): void;
  calculateGrid(): Grid;
  startMouseTracker(): void;
  stopMouseTracker(): void;
  getInteractions(): Interaction[];
  findPatterns(): Vector[];
}

export const gridManager = {
  setWindowSize,
  calculateGrid,
  startMouseTracker,
  stopMouseTracker,
  getInteractions,
  findPatterns,
} as GridManager;

export default gridManager;
