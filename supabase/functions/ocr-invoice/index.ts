import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, downloadDriveFile, geminiExtract } from '../_shared/google.ts'

const DEFAULT_PROMPT = `You are an expert Greek accounting document parser. Extract the following fields from the invoice/document image and return ONLY valid JSON:
{
  "invoice_number": string or null,
  "mark_number": string or null,
  "issuer": string or null,
  "issuer_afm": string or null,
  "recipient": string or null,
  "recipient_afm": string or null,
  "document_type": "invoice" | "receipt" | "credit_note" | "other",
  "issue_date": "YYYY-MM-DD" or null,
  "net_amount": number or null,
  "vat_amount": number or null,
  "total_amount": number or null,
  "withheld_tax": number or null,
  "currency": "EUR" or other,
  "payment_method": "bank_transfer" | "cash" | "card" | "check" | null
}
For Greek documents: MARK is the myDATA registration number. Extract all numeric amounts as numbers without currency symbols.`

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId, setupId } = await getUserFromRequest(req, supabase)

    const { driveFileId, companyId } = await req.json()
    if (!driveFileId) return errorResponse('driveFileId is required')

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return errorResponse('GEMINI_API_KEY not configured', 500)

    const token = await getGoogleToken(supabase, userId, orgId)
    const { base64, mimeType } = await downloadDriveFile(token, driveFileId)

    // Fetch custom extraction prompt if available
    let prompt = DEFAULT_PROMPT
    if (setupId) {
      const { data: customPrompt } = await supabase
        .from('extraction_prompts')
        .select('prompt_text')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .eq('prompt_type', 'invoice')
        .is('superseded_by', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (customPrompt?.prompt_text) prompt = customPrompt.prompt_text
    }

    const { extracted, confidence } = await geminiExtract(apiKey, prompt, base64, mimeType)

    const needsReview = confidence < 0.7

    // Get Drive file metadata for original filename
    const { data: driveFileMeta } = await (async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=name,webViewLink`,
          { headers: { Authorization: `Bearer ${token.access_token}` } }
        )
        return { data: res.ok ? await res.json() : null }
      } catch { return { data: null } }
    })()

    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        org_id: orgId,
        setup_id: setupId ?? undefined,
        company_id: companyId ?? null,
        invoice_number: (extracted.invoice_number as string) ?? null,
        mark_number: (extracted.mark_number as string) ?? null,
        issuer: (extracted.issuer as string) ?? null,
        recipient: (extracted.recipient as string) ?? null,
        document_type: (extracted.document_type as string) ?? null,
        net_amount: (extracted.net_amount as number) ?? null,
        vat_amount: (extracted.vat_amount as number) ?? null,
        total_amount: (extracted.total_amount as number) ?? null,
        withheld_tax: (extracted.withheld_tax as number) ?? null,
        currency: (extracted.currency as string) ?? 'EUR',
        payment_method: (extracted.payment_method as string) ?? null,
        confidence,
        needs_review: needsReview,
        status: 'pending',
        drive_url: driveFileMeta?.webViewLink ?? null,
        original_filename: driveFileMeta?.name ?? null,
        source: 'gmail',
      })
      .select('id')
      .single()

    if (insertError) throw new Error(insertError.message)

    if (needsReview) {
      await supabase.from('system_flags').insert({
        org_id: orgId,
        flag_type: 'low_confidence_extraction',
        severity: 'warning',
        entity_type: 'invoices',
        entity_id: invoice!.id,
        message: `Invoice extraction confidence is ${(confidence * 100).toFixed(0)}% — manual review needed`,
        details: { driveFileId, confidence },
      })
    }

    return jsonResponse({ invoiceId: invoice!.id, confidence, needsReview })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
