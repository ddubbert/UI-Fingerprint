import { VectorPair } from '@/models/Interfaces';

/** Creates a hash for vectors to be recognizable in a Hash-Map */
const createHash = (vectorPair: VectorPair): string => `${vectorPair.start.x}${vectorPair.start.y}${vectorPair.end.x}${vectorPair.end.y}`;

export default {
  createHash,
};
