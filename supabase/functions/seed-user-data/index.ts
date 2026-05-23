import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

const INTERNAL_ORG_ID = Deno.env.get('INTERNAL_ORG_ID') ?? '6ad9aa97-ccc0-4c7b-9b8b-5c26ab3ccc3b'

const SAMPLE_ISSUERS = ['Alpha Suppliers SA', 'Beta Services Ltd', 'Gamma Trading OE', 'Delta Consulting', 'Epsilon Tech IKE']
const SAMPLE_AMOUNTS = [120.50, 350.00, 1200.00, 87.30, 2400.00, 560.80, 199.99]

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack))
  return d.toISOString()
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId, setupId } = await getUserFromRequest(req, supabase)

    if (orgId !== INTERNAL_ORG_ID) {
      return errorResponse('seed-user-data is only available for internal orgs', 403)
    }

    const { scenario = 'standard' } = await req.json().catch(() => ({}))
    const counts = { minimal: 5, standard: 20, full: 50 }
    const invoiceCount = counts[scenario as keyof typeof counts] ?? 20

    // Get first company
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .eq('org_id', orgId)
      .limit(1)

    const companyId = companies?.[0]?.id ?? null

    // Seed invoices
    const invoices = Array.from({ length: invoiceCount }, (_, i) => {
      const net = randomFrom(SAMPLE_AMOUNTS)
      const vat = +(net * 0.24).toFixed(2)
      return {
        org_id: orgId,
        setup_id: setupId,
        company_id: companyId,
        invoice_number: `INV-2024-${String(i + 1).padStart(4, '0')}`,
        issuer: randomFrom(SAMPLE_ISSUERS),
        recipient: 'TITAN Demo Company',
        document_type: 'invoice',
        net_amount: net,
        vat_amount: vat,
        total_amount: +(net + vat).toFixed(2),
        currency: 'EUR',
        status: randomFrom(['filed', 'filed', 'filed', 'pending', 'error']),
        confidence: 0.75 + Math.random() * 0.25,
        needs_review: Math.random() < 0.15,
        source: 'gmail',
        created_at: randomDate(90),
        updated_at: randomDate(30),
      }
    })

    const { data: insertedInvoices, error: invError } = await supabase
      .from('invoices')
      .insert(invoices)
      .select('id')

    if (invError) throw new Error(invError.message)

    // Seed bank docs
    const bankDocs = Array.from({ length: Math.ceil(invoiceCount / 2) }, (_, i) => ({
      org_id: orgId,
      setup_id: setupId,
      company_id: companyId,
      description: `Bank transfer - ${randomFrom(SAMPLE_ISSUERS)} ref${i + 1}`,
      amount: randomFrom(SAMPLE_AMOUNTS),
      currency: 'EUR',
      tx_type: randomFrom(['debit', 'credit']),
      status: randomFrom(['matched', 'matched', 'unmatched']),
      needs_review: Math.random() < 0.1,
      created_at: randomDate(60),
    }))

    await supabase.from('bank_docs').insert(bankDocs)

    // Seed skipped docs
    const skipped = Array.from({ length: 3 }, (_, i) => ({
      org_id: orgId,
      setup_id: setupId,
      company_id: companyId,
      original_filename: `unclear_doc_${i + 1}.pdf`,
      reason: randomFrom(['Poor scan quality', 'Not an invoice', 'Duplicate detected']),
      created_at: randomDate(30),
    }))

    await supabase.from('skipped_docs').insert(skipped)

    // Seed a job run
    await supabase.from('job_runs').insert({
      org_id: orgId,
      job_type: 'process_invoices',
      status: 'completed',
      started_at: randomDate(1),
      completed_at: randomDate(1),
      metadata: { processed: invoiceCount, filed: Math.ceil(invoiceCount * 0.8) },
    })

    return jsonResponse({
      seeded: {
        invoices: insertedInvoices?.length ?? 0,
        bankDocs: bankDocs.length,
        skippedDocs: skipped.length,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
