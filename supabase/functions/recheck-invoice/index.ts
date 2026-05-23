import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, downloadDriveFile, geminiExtract } from '../_shared/google.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const DEFAULT_PROMPT = `Extract invoice fields as JSON: invoice_number, mark_number, issuer, recipient, document_type, net_amount, vat_amount, total_amount, withheld_tax, currency, payment_method. Return null for missing fields.`

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId, setupId } = await getUserFromRequest(req, supabase)

    const { invoiceId } = await req.json()
    if (!invoiceId) return errorResponse('invoiceId is required')

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('org_id', orgId)
      .single()

    if (error || !invoice) return errorResponse('Invoice not found', 404)

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return errorResponse('GEMINI_API_KEY not configured', 500)

    // Get drive file ID from URL
    const fileIdMatch = invoice.drive_url?.match(/[-\w]{25,}/)
    if (!fileIdMatch) return errorResponse('Cannot determine Drive file from invoice', 400)

    const token = await getGoogleToken(supabase, userId, orgId)
    const { base64, mimeType } = await downloadDriveFile(token, fileIdMatch[0])

    let prompt = DEFAULT_PROMPT
    if (setupId) {
      const { data: customPrompt } = await supabase
        .from('extraction_prompts')
        .select('prompt_text')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .eq('prompt_type', 'invoice')
        .is('superseded_by', null)
        .maybeSingle()
      if (customPrompt?.prompt_text) prompt = customPrompt.prompt_text
    }

    const { extracted, confidence } = await geminiExtract(apiKey, prompt, base64, mimeType)
    const needsReview = confidence < 0.7

    await supabase.from('invoices').update({
      invoice_number: (extracted.invoice_number as string) ?? invoice.invoice_number,
      mark_number: (extracted.mark_number as string) ?? invoice.mark_number,
      issuer: (extracted.issuer as string) ?? invoice.issuer,
      recipient: (extracted.recipient as string) ?? invoice.recipient,
      document_type: (extracted.document_type as string) ?? invoice.document_type,
      net_amount: (extracted.net_amount as number) ?? invoice.net_amount,
      vat_amount: (extracted.vat_amount as number) ?? invoice.vat_amount,
      total_amount: (extracted.total_amount as number) ?? invoice.total_amount,
      withheld_tax: (extracted.withheld_tax as number) ?? invoice.withheld_tax,
      confidence,
      needs_review: needsReview,
      status: 'pending',
    }).eq('id', invoiceId)

    return jsonResponse({ invoiceId, confidence, status: 'pending', needsReview })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
