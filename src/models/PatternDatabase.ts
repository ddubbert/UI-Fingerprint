import { Cell, Vector } from '@/models/Interfaces';

export interface Patterns {
  vectors: Vector[];
  cells: Cell[];
}

interface PatternHashMap {
  [details: string]: { vector: Vector; amount: number };
}

interface PageDetails {
  vectorMap: PatternHashMap;
  importantCells: Cell[];
  interactionCount: number;
}

interface CapturedPages {
  [details: string]: PageDetails;
}

export interface PatternDatabase {
  createPage(): string;
  addImportantVectorsAndCellsForPage(vectors: Vector[], cells: Cell[], pageId: string): void;
  getPatternsForPage(pageId: string): Patterns;
}

const MIN_MATCHING_FACTOR = 1 / 2;

/**
 * @returns A PatternDatabase, that holds all captured important vectors and cells for a page.
 * It can also calculate the most important patterns found in this data
 * (dominant vectors and cells).
 */
export const createPatternDatabase = () => {
  let pageCount = 0;
  const capturedPages: CapturedPages = {};

  /** Creates a hash for vectors to be recognizable in a Hash-Map */
  function createHash(vector: Vector): string {
    return `${vector.start.x}${vector.start.y}${vector.end.x}${vector.end.y}`;
  }

  /**
   * Creates a Page.
   * @returns The pages id which is needed for all interactions (adding vectors, cells
   * or requesting patterns)
   */
  function createPage(): string {
    const id = pageCount.toString();
    pageCount += 1;
    capturedPages[id] = {
      vectorMap: {} as PatternHashMap,
      importantCells: [],
      interactionCount: 0,
    };
    return id;
  }

  function addVector(vector: Vector, pageId: string) {
    const hash = createHash(vector);

    if (hash in capturedPages[pageId].vectorMap) {
      capturedPages[pageId].vectorMap[hash].vector.importance = (capturedPages[pageId]
        .vectorMap[hash].vector.importance + vector.importance) / 2;
      capturedPages[pageId].vectorMap[hash].amount += 1;
    } else capturedPages[pageId].vectorMap[hash] = { vector, amount: 1 };
  }

  /**
   * Add important vectors and cells of ONE interaction.
   * @param vectors
   * @param cells
   * @param pageId
   */
  function addImportantVectorsAndCellsForPage(vectors: Vector[], cells: Cell[], pageId: string) {
    if (!(pageId in capturedPages)) throw new Error('Page with pageId does not exist');
    capturedPages[pageId].interactionCount += 1;
    capturedPages[pageId].importantCells = [...capturedPages[pageId].importantCells, ...cells];
    vectors.forEach((it) => { addVector(it, pageId); });
  }

  /**
   * @returns Patterns / dominant vectors and cells that were found within the data of ONE page.
   * @param pageId
   */
  function getPatternsForPage(pageId: string): Patterns {
    const vectors = Object.keys(capturedPages[pageId].vectorMap)
      .reduce((acc, key) => {
        const newAcc = [...acc];
        if (capturedPages[pageId].vectorMap[key].amount
          >= capturedPages[pageId].interactionCount * MIN_MATCHING_FACTOR) {
          newAcc.push(capturedPages[pageId].vectorMap[key].vector);
        }
        return newAcc;
      }, [] as Vector[]);

    const cells = capturedPages[pageId].importantCells;

    return { vectors, cells };
  }

  return {
    createPage,
    addImportantVectorsAndCellsForPage,
    getPatternsForPage,
  } as PatternDatabase;
};
