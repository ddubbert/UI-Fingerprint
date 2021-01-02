import { Cell, MousePosition, Vector } from '@/models/Interfaces';
import { PatternDatabase, Patterns } from '@/models/PatternDatabase';

export interface Column { x: number; height: number }
export interface Row { y: number; width: number }
export interface Grid { columns: Column[]; rows: Row[] }

export interface Interaction {
  mousePositions: MousePosition[];
  importantCellsIndices: MousePosition[];
  importantCells: Cell[];
  importantVectors: Vector[];
}

interface CellWithAmount {
  cell: MousePosition;
  amount: number;
}

export interface GridManager {
  setWindowSize(x: number, y: number): void;
  calculateGrid(): Grid;
  startMouseTracker(): void;
  stopMouseTracker(): void;
  getInteractions(): Interaction[];
  getPatterns(): Patterns;
}

/**
 * Minimal time to be recognized as an important cell (this * SAMPLING_INTERVAL = milliseconds)
 * These cells can be compared to the spectrogram peaks of the Shazam algorithm
 */
const MIN_AMOUNT_PER_CELL = 20;
/** An anchor point is connected to this many following points */
const FAN_OUT_FACTOR = 5;
/** Amount of cells per row also determines the cell size (width and heights) */
const AMOUNT_CELLS_PER_ROW = 20;
/** Frequency for how often mouse positions are captured in a second */
const SAMPLING_INTERVAL = 1000 / 10;

/**
 * @returns A GridManager, that handles the grid creation,
 * as well as all the interactions and communication to the database.
 */
export const createGridManager = (database: PatternDatabase): GridManager => {
  const pageId = database.createPage();
  const windowSize = {
    width: 0,
    height: 0,
  };
  const currentMousePos: MousePosition = { x: 0, y: 0 };
  const capturedInteractions: Interaction[] = [];
  let interval: number | undefined;

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

  /** Starts the tracking for a new interaction */
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

  /**
   * Generates an array of important cells for the current interaction.
   * Important cells are those, that were hovered for at least the MIN_AMOUNT_PER_CELL
   */
  function getImportantCellsAt(index: number): Cell[] {
    const cellSize = getCellSize();
    return capturedInteractions[index].importantCellsIndices.map((it) => ({
      x: it.x * cellSize,
      y: it.y * cellSize,
      size: cellSize,
    }));
  }

  /**
   * Generates an array of important Vectors for the current interaction.
   * Important vectors are generated depending on the important cells of an interaction and the
   * pre defined fan-out-factor (AMOUNT_OF_CONNECTIONS)
   */
  function getImportantVectorsFor(importantCells: Cell[]): Vector[] {
    const cellSize = getCellSize();

    return importantCells.reduce((acc, cell, cellIndex) => {
      const cellsAfterCurrent = (importantCells.length - 1) - cellIndex;
      const amountConnections = (cellsAfterCurrent < FAN_OUT_FACTOR)
        ? cellsAfterCurrent
        : FAN_OUT_FACTOR;

      const currentPointVectors: Vector[] = [];

      const start = {
        x: cell.x + cellSize / 2,
        y: cell.y + cellSize / 2,
      } as MousePosition;

      for (let i = 1; i <= amountConnections; i += 1) {
        const vector = {
          start,
          end: {
            x: importantCells[cellIndex + i].x + cellSize / 2,
            y: importantCells[cellIndex + i].y + cellSize / 2,
          },
          importance: 1 / i,
        };

        currentPointVectors.push(vector);
      }

      return [...acc, ...currentPointVectors];
    }, [] as Vector[]);
  }

  /**
   * Stops the mouse tracking of the current interaction and generates important cells and vectors.
   * Also calls the database to persist those entities.
   */
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

    const importantCells = getImportantCellsAt(capturedInteractions.length - 1);
    const importantVectors = getImportantVectorsFor(importantCells);

    capturedInteractions[capturedInteractions.length - 1]
      .importantCells = importantCells;

    capturedInteractions[capturedInteractions.length - 1]
      .importantVectors = importantVectors;

    try {
      database.addImportantVectorsAndCellsForPage(importantVectors, importantCells, pageId);
    } catch (e) {
      console.log('Update in der Datenbank fehlgeschlagen.');
      console.error(e);
    }
  }

  /**
   * @returns All of the captured interactions (important cells, vectors etc.)
   */
  function getInteractions(): Interaction[] {
    return capturedInteractions;
  }

  /**
   * @returns Patterns / important vectors and cells that are dominant among all interactions.
   */
  function getPatterns(): Patterns {
    return database.getPatternsForPage(pageId);
  }

  return {
    setWindowSize,
    calculateGrid,
    startMouseTracker,
    stopMouseTracker,
    getInteractions,
    getPatterns,
  } as GridManager;
};
