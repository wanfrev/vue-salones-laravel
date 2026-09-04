/**
 * Anatomically-inspired (not clinically precise) tooth silhouettes, one per FDI position within a
 * quadrant (1 = central incisor ... 8 = third molar/wisdom) — the shape repeats identically across
 * all 4 quadrants and is mirrored for orientation, so only 8 path strings exist regardless of how
 * many teeth are drawn. Pure SVG paths, no images/canvas — same rendering cost as plain shapes.
 *
 * Canonical orientation the paths are drawn in: a 40x40 box, outer/vestibular edge at the top,
 * inner/lingual edge (tapering toward the root) at the bottom, mesial edge on the right.
 */
export type ToothShapeId =
  | 'incisor_central' | 'incisor_lateral' | 'canine'
  | 'premolar1' | 'premolar2'
  | 'molar1' | 'molar2' | 'molar3'

export const TOOTH_SHAPE_PATHS: Record<ToothShapeId, string> = {
  incisor_central: 'M11,5 C11,3 13,2 16,2 L24,2 C27,2 29,3 29,5 L29,26 C29,32 25,37 20,37 C15,37 11,32 11,26 Z',
  incisor_lateral: 'M12,5 C12,3 14,2.5 16,2.5 L24,2.5 C26,2.5 28,3 28,5 L28,25 C28,31 24.5,36 20,36 C15.5,36 12,31 12,25 Z',
  canine: 'M10,10 C10,6 13,4 16,4 L20,-1 L24,4 C27,4 30,6 30,10 L30,27 C30,33 26,38 20,38 C14,38 10,33 10,27 Z',
  premolar1: 'M8,9 C8,5 12,3 20,3 C28,3 32,5 32,9 L32,26 C32,33 27,37 20,37 C13,37 8,33 8,26 Z',
  premolar2: 'M8,9 C8,5 12,3 20,3 C28,3 32,5 32,9 L32,26 C32,33 27,37 20,37 C13,37 8,33 8,26 Z',
  molar1: 'M6,10 C6,5 11,3 20,3 C29,3 34,5 34,10 L34,25 C34,32 28,38 20,38 C12,38 6,32 6,25 Z',
  molar2: 'M6,10 C6,5 11,3 20,3 C29,3 34,5 34,10 L34,25 C34,32 28,38 20,38 C12,38 6,32 6,25 Z',
  molar3: 'M8,11 C8,6 12,4 20,4 C28,4 32,6 32,11 L32,24 C32,30 27,36 20,36 C13,36 8,30 8,24 Z',
}

/** FDI position within the quadrant (last digit of the tooth number, 1-8) -> silhouette to use. */
export const SHAPE_FOR_POSITION: Record<number, ToothShapeId> = {
  1: 'incisor_central',
  2: 'incisor_lateral',
  3: 'canine',
  4: 'premolar1',
  5: 'premolar2',
  6: 'molar1',
  7: 'molar2',
  8: 'molar3',
}

export function shapeForTooth(tooth: number): ToothShapeId {
  const position = tooth % 10
  return SHAPE_FOR_POSITION[position] ?? 'molar1'
}
