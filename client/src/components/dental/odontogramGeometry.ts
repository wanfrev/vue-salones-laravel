import type { DentalFace } from '../../types/database'

export interface ToothLayout {
  tooth: number
  arch: 'upper' | 'lower'
  /** Half of the arch this tooth sits in, viewer's perspective — used to derive mesial/distal side. */
  half: 'left' | 'right'
}

/**
 * Display order per arch mirrors how dental charts are conventionally drawn: patient's right side
 * (quadrants 1/4) on the viewer's left, patient's left side (quadrants 2/3) on the viewer's right,
 * both arches fanning outward from the midline in the center of the row.
 */
export const UPPER_ARCH: ToothLayout[] = [
  ...[18, 17, 16, 15, 14, 13, 12, 11].map((tooth): ToothLayout => ({ tooth, arch: 'upper', half: 'left' })),
  ...[21, 22, 23, 24, 25, 26, 27, 28].map((tooth): ToothLayout => ({ tooth, arch: 'upper', half: 'right' })),
]

export const LOWER_ARCH: ToothLayout[] = [
  ...[48, 47, 46, 45, 44, 43, 42, 41].map((tooth): ToothLayout => ({ tooth, arch: 'lower', half: 'left' })),
  ...[31, 32, 33, 34, 35, 36, 37, 38].map((tooth): ToothLayout => ({ tooth, arch: 'lower', half: 'right' })),
]

/**
 * Maps the 4 geometric sides of a tooth cell (top/bottom/left/right, as drawn) to their clinical
 * face name. Upper arch: top faces outward (vestibular), bottom faces the tongue (lingual/palatino).
 * Lower arch is mirrored. Left/right map to mesial/distal depending on which side of the midline
 * the tooth sits on — the side closest to the midline is always mesial.
 */
export function facesForTooth(layout: ToothLayout): Record<'top' | 'bottom' | 'left' | 'right', DentalFace> {
  const top: DentalFace = layout.arch === 'upper' ? 'vestibular' : 'lingual'
  const bottom: DentalFace = layout.arch === 'upper' ? 'lingual' : 'vestibular'
  // Left half of the row: its RIGHT side touches the midline (mesial). Right half: its LEFT side does.
  const mesialSide: 'left' | 'right' = layout.half === 'left' ? 'right' : 'left'
  const distalSide: 'left' | 'right' = mesialSide === 'left' ? 'right' : 'left'
  return {
    top,
    bottom,
    [mesialSide]: 'mesial',
    [distalSide]: 'distal',
  } as Record<'top' | 'bottom' | 'left' | 'right', DentalFace>
}

/**
 * Tooth silhouettes (see `odontogramShapes.ts`) are all drawn in one canonical orientation
 * (vestibular on top, mesial on the right). This returns the mirroring needed to place that
 * canonical silhouette correctly for a given tooth: flip vertically for the lower arch, flip
 * horizontally when this tooth's mesial side is actually on the left (the other half of the row).
 */
export function mirrorFor(layout: ToothLayout): { flipX: 1 | -1; flipY: 1 | -1 } {
  const faces = facesForTooth(layout)
  return {
    flipX: faces.right === 'mesial' ? 1 : -1,
    flipY: layout.arch === 'upper' ? 1 : -1,
  }
}

/** Generates the 5 clickable shapes (4 trapezoids + 1 center square) for a tooth cell of size `s` at (x, y). */
export function toothCellShapes(x: number, y: number, s: number) {
  const inset = s * 0.32
  const outer = s
  return {
    center: `${x + inset},${y + inset} ${x + outer - inset},${y + inset} ${x + outer - inset},${y + outer - inset} ${x + inset},${y + outer - inset}`,
    top: `${x},${y} ${x + outer},${y} ${x + outer - inset},${y + inset} ${x + inset},${y + inset}`,
    bottom: `${x},${y + outer} ${x + inset},${y + outer - inset} ${x + outer - inset},${y + outer - inset} ${x + outer},${y + outer}`,
    left: `${x},${y} ${x + inset},${y + inset} ${x + inset},${y + outer - inset} ${x},${y + outer}`,
    right: `${x + outer},${y} ${x + outer},${y + outer} ${x + outer - inset},${y + outer - inset} ${x + outer - inset},${y + inset}`,
  }
}
