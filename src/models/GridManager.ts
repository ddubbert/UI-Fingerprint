import { Cell, Vector, VectorPair } from '@/models/Interfaces';
import { PatternDatabase, Patterns } from '@/models/PatternDatabase';
import hashCreator from '@/models/HashCreator';

export interface Column { x: number; height: number }
export interface Row { y: number; width: number }
export interface Grid { columns: Column[]; rows: Row[] }

export interface Interaction {
  mousePositions: Vector[];
  importantCellsIndices: Vector[];
  importantCells: Cell[];
  importantVectors: VectorPair[];
}

interface CellWithAmount {
  cell: Vector;
  amount: number;
}

export interface GridManager {
  setWindowSize(x: number, y: number): void;
  calculateGrid(): Grid;
  startMouseTracker(): void;
  stopMouseTracker(): void;
  getInteractions(): Interaction[];
  getPatterns(): Patterns;
  recalculateInteractionsWith(
    minAmountPerCell: number | undefined,
    fanOutFactor: number | undefined,
    amountCellsPerRow: number | undefined,
    samplingInterval: number | undefined,
    minMatchingFactor: number | undefined,
  ): Interaction[];
}

/**
 * @returns A GridManager, that handles the grid creation,
 * as well as all the interactions and communication to the database.
 * @param database
 * @param minAmountPerCell: Minimal time to be recognized as an important cell
 * (this * SAMPLING_INTERVAL = milliseconds). These cells can be compared to the spectrogram
 * peaks of the Shazam algorithm
 * @param fanOutFactor: An anchor point is connected to this many following points
 * @param amountCellsPerRow: Amount of cells per row also determines the cell size
 * (width and heights)
 * @param samplingInterval: Frequency for how often mouse positions are captured in a second
 * @param minMatchingFactor: Minimal factor for a vector pair to be noticed as an important
 * pattern (has to appear amountInteractions * minMatchingFactor times)
 */
export const createGridManager = (
  database: PatternDatabase,
  minAmountPerCell = 20,
  fanOutFactor = 5,
  amountCellsPerRow = 20,
  samplingInterval = 1000 / 10,
  minMatchingFactor: number | undefined,
): GridManager => {
  /**
   * Minimal time to be recognized as an important cell (this * SAMPLING_INTERVAL = milliseconds)
   * These cells can be compared to the spectrogram peaks of the Shazam algorithm
   */
  let MIN_AMOUNT_PER_CELL = minAmountPerCell;
  /** An anchor point is connected to this many following points */
  let FAN_OUT_FACTOR = fanOutFactor;
  /** Amount of cells per row also determines the cell size (width and heights) */
  let AMOUNT_CELLS_PER_ROW = amountCellsPerRow;
  /** Frequency for how often mouse positions are captured in a second */
  let SAMPLING_INTERVAL = samplingInterval;

  const pageId = database.createPage(minMatchingFactor);
  const windowSize = {
    width: 0,
    height: 0,
  };
  const currentMousePos: Vector = { x: 0, y: 0 };
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

  function mousePositionToCellPosition(m: Vector): Vector {
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
  function getImportantVectorPairsFor(importantCells: Cell[]): VectorPair[] {
    const cellSize = getCellSize();

    return importantCells.reduce((acc, cell, cellIndex) => {
      const cellsAfterCurrent = (importantCells.length - 1) - cellIndex;
      const amountConnections = (cellsAfterCurrent < FAN_OUT_FACTOR)
        ? cellsAfterCurrent
        : FAN_OUT_FACTOR;

      const presentVectorPairs: string[] = [];
      const currentVectorPairs: VectorPair[] = [];

      const start = {
        x: cell.x + cellSize / 2,
        y: cell.y + cellSize / 2,
      } as Vector;

      for (let i = 1; i <= amountConnections; i += 1) {
        const vectorPair = {
          start,
          end: {
            x: importantCells[cellIndex + i].x + cellSize / 2,
            y: importantCells[cellIndex + i].y + cellSize / 2,
          },
          importance: 1 / i,
        };

        if (!(vectorPair.start.x === vectorPair.end.x && vectorPair.start.y === vectorPair.end.y)) {
          const pairIndex = presentVectorPairs.indexOf(hashCreator.createHash(vectorPair));
          console.log(pairIndex);
          if (currentVectorPairs.indexOf(vectorPair) !== -1) {
            currentVectorPairs[pairIndex].importance = (
              currentVectorPairs[pairIndex].importance * vectorPair.importance
            ) / 2;
          } else {
            presentVectorPairs.push(hashCreator.createHash(vectorPair));
            currentVectorPairs.push(vectorPair);
          }
        }
      }

      return [...acc, ...currentVectorPairs];
    }, [] as VectorPair[]);
  }

  function getImportantCellsIndicesAt(index: number) {
    const capturedCellPositions = capturedInteractions[index]
      .mousePositions.map(mousePositionToCellPosition);

    const cellTimes = capturedCellPositions.reduce((acc, cell, cellIndex) => {
      const newAcc = { ...acc };

      if (newAcc.pos.x === cell.x && newAcc.pos.y === cell.y) {
        newAcc.count += 1;
      } else {
        newAcc.list.push({ cell: newAcc.pos, amount: newAcc.count });
        newAcc.pos = cell;
        newAcc.count = 1;
      }

      if (cellIndex === capturedCellPositions.length - 1) {
        newAcc.list.push({ cell: newAcc.pos, amount: newAcc.count });
      }

      return newAcc;
    }, { count: 0, pos: { x: 0, y: 0 } as Vector, list: [] as CellWithAmount[] }).list;

    return cellTimes
      .filter((it) => it.amount >= MIN_AMOUNT_PER_CELL)
      .map((it) => it.cell);
  }

  function evaluateInteractionAt(index: number) {
    capturedInteractions[index]
      .importantCellsIndices = getImportantCellsIndicesAt(index);
    const importantCells = getImportantCellsAt(index);
    const importantVectors = getImportantVectorPairsFor(importantCells);

    capturedInteractions[index]
      .importantCells = importantCells;

    capturedInteractions[index]
      .importantVectors = importantVectors;

    try {
      database.addImportantVectorPairsAndCellsForPage(importantVectors, importantCells, pageId);
    } catch (e) {
      console.log('Update in der Datenbank fehlgeschlagen.');
      console.error(e);
    }
  }

  /**
   * Stops the mouse tracking of the current interaction and generates important cells and vectors.
   * Also calls the database to persist those entities.
   */
  function stopMouseTracker() {
    document.removeEventListener('mousemove', setMousePosition);
    clearInterval(interval);
    evaluateInteractionAt(capturedInteractions.length - 1);
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

  /**
   * Provide new settings for pattern recognition
   * @returns Patterns / important vectors and cells that are dominant among all interactions.
   * @param minAmountPerCell: Minimal time to be recognized as an important cell
   * (this * SAMPLING_INTERVAL = milliseconds). These cells can be compared to the spectrogram
   * peaks of the Shazam algorithm
   * @param fanOutFactor: An anchor point is connected to this many following points
   * @param amountCellsPerRow: Amount of cells per row also determines the cell size
   * (width and heights)
   * @param samplingInterval: Frequency for how often mouse positions are captured in a second
   * @param minMatchingFactor: Minimal factor for a vector pair to be noticed as an important
   * pattern (has to appear amountInteractions * minMatchingFactor times)
   */
  function recalculateInteractionsWith(
    // eslint-disable-next-line no-shadow
    minAmountPerCell = 20,
    // eslint-disable-next-line no-shadow
    fanOutFactor = 5,
    // eslint-disable-next-line no-shadow
    amountCellsPerRow = 20,
    // eslint-disable-next-line no-shadow
    samplingInterval = 1000 / 10,
    // eslint-disable-next-line no-shadow
    minMatchingFactor: number | undefined,
  ): Interaction[] {
    MIN_AMOUNT_PER_CELL = minAmountPerCell;
    FAN_OUT_FACTOR = fanOutFactor;
    AMOUNT_CELLS_PER_ROW = amountCellsPerRow;
    SAMPLING_INTERVAL = samplingInterval;

    database.resetPage(pageId, minMatchingFactor);

    capturedInteractions.forEach((_, i) => {
      capturedInteractions[i].importantCellsIndices = [];
      capturedInteractions[i].importantCells = [];
      capturedInteractions[i].importantVectors = [];
      evaluateInteractionAt(i);
    });

    return capturedInteractions;
  }

  return {
    setWindowSize,
    calculateGrid,
    startMouseTracker,
    stopMouseTracker,
    getInteractions,
    getPatterns,
    recalculateInteractionsWith,
  } as GridManager;
};
