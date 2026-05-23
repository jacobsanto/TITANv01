import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

function buildFilingPath(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? key)
}

function buildFilename(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? key)
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId, setupId } = await getUserFromRequest(req, supabase)
    if (!setupId) return errorResponse('No active setup', 400)

    const { batchSize = 20, invoiceIds } = await req.json().catch(() => ({}))

    const query = supabase
      .from('invoices')
      .select('*')
      .eq('org_id', orgId)
      .eq('setup_id', setupId)
      .eq('status', 'pending')
      .is('needs_review', false)

    if (invoiceIds?.length) {
      query.in('id', invoiceIds)
    } else {
      query.limit(batchSize)
    }

    const { data: invoices } = await query

    if (!invoices || invoices.length === 0) {
      return jsonResponse({ filed: 0, errors: 0 })
    }

    // Load config
    const [{ data: filingFlows }, { data: namingRules }, { data: companies }] = await Promise.all([
      supabase.from('filing_flows').select('*').eq('org_id', orgId).eq('setup_id', setupId),
      supabase.from('naming_rules').select('*').eq('org_id', orgId).eq('setup_id', setupId),
      supabase.from('companies').select('id,name,afm,drive_folder_id').eq('org_id', orgId).eq('setup_id', setupId),
    ])

    // Get root folder from settings
    const { data: rootSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('setting_key', 'root_folder_id')
      .maybeSingle()

    const token = await getGoogleToken(supabase, userId, orgId)
    const companyMap = new Map((companies ?? []).map(c => [c.id, c]))

    let filed = 0
    let errors = 0

    for (const invoice of invoices) {
      try {
        await supabase.from('invoices').update({ status: 'processing' }).eq('id', invoice.id)

        const company = invoice.company_id ? companyMap.get(invoice.company_id) : null
        const year = new Date(invoice.created_at).getFullYear().toString()
        const month = String(new Date(invoice.created_at).getMonth() + 1).padStart(2, '0')

        const templateVars = {
          year,
          month,
          issuer: invoice.issuer ?? 'Unknown',
          company: company?.name ?? 'General',
          afm: company?.afm ?? '',
          document_type: invoice.document_type ?? 'invoice',
          invoice_number: invoice.invoice_number ?? invoice.id.slice(0, 8),
        }

        // Find matching filing flow
        const flow = filingFlows?.find(f => f.flow_type === (invoice.document_type ?? 'invoice'))
          ?? filingFlows?.[0]

        const basePath = rootSetting?.setting_value ?? '/TITAN'
        const subPath = flow
          ? buildFilingPath(flow.path_template, templateVars)
          : `${year}/${month}/${templateVars.company}`

        const filingPath = `${basePath}/${subPath}`

        // Find matching naming rule
        const rule = namingRules?.find(r => r.rule_type === (invoice.document_type ?? 'invoice'))
          ?? namingRules?.[0]

        const newFilename = rule
          ? buildFilename(rule.pattern_template, templateVars) + '.pdf'
          : `${templateVars.issuer}_${templateVars.invoice_number}_${year}${month}.pdf`

        // Move file in Drive (find or create target folder, then move)
        let driveUrl = invoice.drive_url
        if (invoice.drive_url) {
          const fileIdMatch = invoice.drive_url.match(/[-\w]{25,}/)
          if (fileIdMatch) {
            const fileId = fileIdMatch[0]
            // Rename file
            const renameRes = await driveRequest(token, `/files/${fileId}`, {
              method: 'PATCH',
              body: JSON.stringify({ name: newFilename }),
            })
            if (renameRes.ok) {
              const renamed = await renameRes.json()
              driveUrl = renamed.webViewLink ?? driveUrl
            }
          }
        }

        await supabase.from('invoices').update({
          status: 'filed',
          new_filename: newFilename,
          filing_path: filingPath,
          drive_url: driveUrl,
        }).eq('id', invoice.id)

        filed++
      } catch (err) {
        await supabase.from('invoices').update({
          status: 'error',
        }).eq('id', invoice.id)
        errors++
      }
    }

    return jsonResponse({ filed, errors })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
