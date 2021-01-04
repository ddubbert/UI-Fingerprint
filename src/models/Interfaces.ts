export interface Vector { x: number; y: number }

export interface Cell {
  x: number;
  y: number;
  size: number;
}
export interface VectorPair {
  start: Vector;
  end: Vector;
  importance: number;
}
