import { createClient } from '@/lib/supabase/client'

export type EdgeFunction =
  | 'fetch-gmail-attachments'
  | 'process-invoices'
  | 'process-bank-docs'
  | 'process-queue'
  | 'apply-setup-change'
  | 'apply-company-folder-change'
  | 'handover-super-admin'
  | 'ocr-invoice'
  | 'refile-document'
  | 'review-item'
  | 'recheck-invoice'
  | 'recheck-bank-doc'
  | 'retriage-invoices'
  | 'scan-drive-cleanup'
  | 'execute-drive-audit-action'
  | 'run-drive-audit'
  | 'backup-database'
  | 'seed-user-data'
  | 'preview-setup-change'
  | 'preview-company-folder-change'
  | 'copy-drive-folder'
  | 'fix-misfiled-invoices'
  | 'bulk-restore-skipped-docs'
  | 'store-google-token'
  | 'get-google-token'
  | 'revoke-google-token'
  | 'verify-google-apis'
  | 'verify-company-files'
  | 'list-drive-tree'
  | 'search-drive-files'
  | 'merge-drive-folders'

export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public readonly functionName: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'EdgeFunctionError'
  }
}

export async function callEdge<T = unknown>(
  name: EdgeFunction,
  body?: Record<string, unknown>
): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new EdgeFunctionError('Not authenticated', name, 401)
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let message = `Edge function ${name} failed with status ${response.status}`
    try {
      const err = await response.json()
      if (err?.error) message = err.error
      else if (err?.message) message = err.message
    } catch {
      // ignore parse errors
    }
    throw new EdgeFunctionError(message, name, response.status)
  }

  return response.json() as Promise<T>
}
