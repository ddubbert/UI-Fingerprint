import { Cell, VectorPair } from '@/models/Interfaces';
import hashCreator from '@/models/HashCreator';

export interface Patterns {
  vectorPairs: VectorPair[];
  cells: Cell[];
}

interface VectorPairHashMap {
  [details: string]: { vectorPair: VectorPair; amount: number };
}

interface PageDetails {
  vectorPairMap: VectorPairHashMap;
  importantCells: Cell[];
  interactionCount: number;
  minMatchingFactor: number;
}

interface CapturedPages {
  [details: string]: PageDetails;
}

export interface PatternDatabase {
  createPage(minMatchingFactor: number | undefined): string;
  addImportantVectorPairsAndCellsForPage(
    vectorPairs: VectorPair[],
    cells: Cell[], pageId: string,
  ): void;
  getPatternsForPage(pageId: string): Patterns;
  resetPage(pageId: string, minMatchingFactor: number | undefined): void;
}

/**
 * @returns A PatternDatabase, that holds all captured important vectors and cells for a page.
 * It can also calculate the most important patterns found in this data
 * (dominant vectors and cells).
 */
export const createPatternDatabase = () => {
  let pageCount = 0;
  const capturedPages: CapturedPages = {};

  /**
   * Creates a Page.
   * @returns The pages id which is needed for all interactions (adding vectors, cells
   * or requesting patterns)
   * @param minMatchingFactor: Minimal factor for a vector pair to be noticed as an important
   * pattern (has to appear amountInteractions * minMatchingFactor times)
   */
  function createPage(minMatchingFactor = 1 / 2): string {
    const id = pageCount.toString();
    pageCount += 1;
    capturedPages[id] = {
      vectorPairMap: {} as VectorPairHashMap,
      importantCells: [],
      interactionCount: 0,
      minMatchingFactor,
    };
    return id;
  }

  function addVector(vector: VectorPair, pageId: string) {
    const hash = hashCreator.createHash(vector);

    if (hash in capturedPages[pageId].vectorPairMap) {
      capturedPages[pageId].vectorPairMap[hash].vectorPair.importance = (capturedPages[pageId]
        .vectorPairMap[hash].vectorPair.importance + vector.importance) / 2;
      capturedPages[pageId].vectorPairMap[hash].amount += 1;
    } else capturedPages[pageId].vectorPairMap[hash] = { vectorPair: vector, amount: 1 };
  }

  /**
   * Add important vectorPairs and cells of ONE interaction.
   * @param vectorPairs
   * @param cells
   * @param pageId
   */
  function addImportantVectorsAndCellsForPage(
    vectorPairs: VectorPair[],
    cells: Cell[],
    pageId: string,
  ) {
    if (!(pageId in capturedPages)) throw new Error('Page with pageId does not exist');
    capturedPages[pageId].interactionCount += 1;
    capturedPages[pageId].importantCells = [...capturedPages[pageId].importantCells, ...cells];
    vectorPairs.forEach((it) => { addVector(it, pageId); });
  }

  /**
   * @returns Patterns / dominant vectors and cells that were found within the data of ONE page.
   * @param pageId
   */
  function getPatternsForPage(pageId: string): Patterns {
    const vectorPairs = Object.keys(capturedPages[pageId].vectorPairMap)
      .reduce((acc, key) => {
        const newAcc = [...acc];
        if (capturedPages[pageId].vectorPairMap[key].amount
          >= capturedPages[pageId].interactionCount * capturedPages[pageId].minMatchingFactor) {
          newAcc.push(capturedPages[pageId].vectorPairMap[key].vectorPair);
        }
        return newAcc;
      }, [] as VectorPair[]);

    const cells = capturedPages[pageId].importantCells;

    return { vectorPairs, cells };
  }

  /**
   * Resets data for ONE page and sets a new minMatchingFactor if provided
   * @param pageId
   * @param minMatchingFactor: Minimal factor for a vector pair to be noticed as an important
   * pattern (has to appear amountInteractions * minMatchingFactor times)
   */
  function resetPage(pageId: string, minMatchingFactor: number | undefined) {
    if (!(pageId in capturedPages)) throw new Error('Page with pageId does not exist');
    capturedPages[pageId] = {
      vectorPairMap: {} as VectorPairHashMap,
      importantCells: [],
      interactionCount: 0,
      minMatchingFactor: minMatchingFactor || capturedPages[pageId].minMatchingFactor,
    };
  }

  return {
    createPage,
    addImportantVectorPairsAndCellsForPage: addImportantVectorsAndCellsForPage,
    getPatternsForPage,
    resetPage,
  } as PatternDatabase;
};
