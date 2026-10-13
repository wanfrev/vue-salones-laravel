interface StampSource {
  approval_code?: string | null
  approved_at?: string | null
  approver_name?: string | null
}

/**
 * The only image shape the backend stores and the print templates embed (see SignatureImage.php):
 * a PNG data URL. Anything else (SVG, a URL, markup) is never placed in a document.
 */
export const isSignatureDataUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)

const pad = (n: number) => String(n).padStart(2, '0')

/** "Aprobada por Ana Pérez · 08/10/2026 14:32 · Código NOM-7F3K-92QA", or null when the week has no stamp. */
export const formatApprovalStamp = (week: StampSource | null | undefined): string | null => {
  if (!week?.approval_code) return null

  const parts = [`Aprobada por ${week.approver_name || '—'}`]
  if (week.approved_at) {
    const d = new Date(week.approved_at)
    if (!Number.isNaN(d.getTime())) {
      parts.push(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`)
    }
  }
  parts.push(`Código ${week.approval_code}`)
  return parts.join(' · ')
}
