'use client'

import { useT } from '@/lib/i18n/utils'
import { Input } from '@/components/ui/input'

interface DateRangePickerProps {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
}

export function DateRangePicker({ from, to, onFromChange, onToChange }: DateRangePickerProps) {
  const t = useT()
  return (
    <div className="flex items-center gap-3">
      <div>
        <label className="block text-[11px] text-fg-tertiary uppercase tracking-wider mb-1">{t('reports.from_date')}</label>
        <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="h-9 w-36" />
      </div>
      <div className="text-fg-tertiary mt-4">—</div>
      <div>
        <label className="block text-[11px] text-fg-tertiary uppercase tracking-wider mb-1">{t('reports.to_date')}</label>
        <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="h-9 w-36" />
      </div>
    </div>
  )
}

export function defaultRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const to = now.toISOString().slice(0, 10)
  return { from, to }
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h] ?? ''
        const s = String(val)
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
      }).join(','),
    ),
  ]
  return lines.join('\n')
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
