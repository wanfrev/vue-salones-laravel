interface StampSource {
  approval_code?: string | null
  approved_at?: string | null
  approver_name?: string | null
}

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
