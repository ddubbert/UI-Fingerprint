export interface MousePosition { x: number; y: number }

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
