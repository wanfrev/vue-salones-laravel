import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const cronSecret = Deno.env.get('CRON_SECRET')

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase config.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (cronSecret && token !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const now = new Date()

    // ============================================================
    // 1. Generate reminders: appointments starting in ~24h
    // ============================================================
    const in22h = new Date(now.getTime() + 22 * 60 * 60 * 1000)
    const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000)

    const { data: appointments, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select('*, clients(full_name, phone), services(name)')
      .is('reminder_sent_at', null)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', in22h.toISOString())
      .lte('start_time', in26h.toISOString())

    if (apptError) {
      return new Response(JSON.stringify({ error: apptError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let totalGenerated = 0
    const appointmentIds: string[] = []

    if (appointments && appointments.length > 0) {
      for (const appt of appointments) {
        const client = appt.clients as { full_name: string; phone: string } | null
        const service = appt.services as { name: string } | null
        if (!client || !service) continue

        const notifications = []

        // Notify assigned employee
        notifications.push({
          business_id: appt.business_id,
          appointment_id: appt.id,
          profile_id: appt.employee_id,
          type: 'reminder',
          title: 'Recordatorio de cita',
          message: `El cliente ${client.full_name} tiene cita de ${service.name}`,
          client_name: client.full_name,
          client_phone: client.phone,
          service_name: service.name,
          appointment_time: appt.start_time,
        })

        // Notify admins
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('business_id', appt.business_id)
          .eq('role', 'admin')
          .eq('active', true)

        if (admins) {
          for (const admin of admins) {
            if (admin.id !== appt.employee_id) {
              notifications.push({
                business_id: appt.business_id,
                appointment_id: appt.id,
                profile_id: admin.id,
                type: 'reminder',
                title: 'Recordatorio de cita',
                message: `El cliente ${client.full_name} tiene cita de ${service.name}`,
                client_name: client.full_name,
                client_phone: client.phone,
                service_name: service.name,
                appointment_time: appt.start_time,
              })
            }
          }
        }

        const { error: insertError } = await supabaseAdmin
          .from('notifications')
          .insert(notifications)

        if (!insertError) {
          totalGenerated += notifications.length
          appointmentIds.push(appt.id)
        }
      }

      if (appointmentIds.length > 0) {
        await supabaseAdmin
          .from('appointments')
          .update({ reminder_sent_at: new Date().toISOString() })
          .in('id', appointmentIds)
      }
    }

    // ============================================================
    // 2. Generate unpaid alerts: confirmed >24h ago, not paid
    // ============================================================
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Find confirmed appointments whose start_time was >24h ago and are still unpaid
    const { data: unpaidAppts, error: unpaidError } = await supabaseAdmin
      .from('appointments')
      .select('*, clients(full_name, phone), services(name)')
      .eq('status', 'confirmed')
      .neq('payment_status', 'paid')
      .lte('start_time', twentyFourHoursAgo.toISOString())

    if (unpaidError) {
      console.error('[generate-reminders] unpaid query error:', unpaidError.message)
    }

    let unpaidGenerated = 0

    if (unpaidAppts && unpaidAppts.length > 0) {
      for (const appt of unpaidAppts) {
        const client = appt.clients as { full_name: string; phone: string } | null
        const service = appt.services as { name: string } | null
        if (!client || !service) continue

        // Check if an unpaid_alert already exists for this appointment
        const { data: existingAlerts } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('appointment_id', appt.id)
          .eq('type', 'unpaid_alert')

        if (existingAlerts && existingAlerts.length > 0) continue

        // Notify all active admins
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('business_id', appt.business_id)
          .eq('role', 'admin')
          .eq('active', true)

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: { id: string }) => ({
            business_id: appt.business_id,
            appointment_id: appt.id,
            profile_id: admin.id,
            type: 'unpaid_alert',
            title: 'Cita confirmada sin cobrar',
            message: `Cita de ${client.full_name} — ${service.name} confirmada hace más de 24h sin cobro`,
            client_name: client.full_name,
            client_phone: client.phone,
            service_name: service.name,
            appointment_time: appt.start_time,
          }))

          const { error: insertError } = await supabaseAdmin
            .from('notifications')
            .insert(notifications)

          if (!insertError) {
            unpaidGenerated += notifications.length
          }
        }
      }
    }

    // ============================================================
    // 3. Low stock alerts: products at or below reorder_point
    // ============================================================
    const { data: lowStockProducts, error: lowStockError } = await supabaseAdmin
      .rpc('get_low_stock_products')

    let lowStockGenerated = 0

    if (lowStockError) {
      console.error('[generate-reminders] low stock query error:', lowStockError.message)
    }

    if (lowStockProducts && lowStockProducts.length > 0) {
      const byBiz = new Map<string, { count: number; names: string[] }>()
      for (const row of lowStockProducts) {
        const bizId = row.business_id
        if (!byBiz.has(bizId)) {
          byBiz.set(bizId, { count: 0, names: [] })
        }
        const entry = byBiz.get(bizId)!
        entry.count++
        if (entry.names.length < 5) {
          entry.names.push(row.name)
        }
      }

      for (const [bizId, info] of byBiz.entries()) {
        await supabaseAdmin
          .from('notifications')
          .delete()
          .eq('business_id', bizId)
          .eq('type', 'low_stock')

        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('business_id', bizId)
          .eq('role', 'admin')
          .eq('active', true)

        if (admins && admins.length > 0) {
          const extra = info.count > info.names.length ? ` y ${info.count - info.names.length} más` : ''
          const message = `${info.count} producto(s) con stock bajo: ${info.names.join(', ')}${extra}`

          const notifications = admins.map((admin: { id: string }) => ({
            business_id: bizId,
            appointment_id: null,
            profile_id: admin.id,
            type: 'low_stock',
            title: 'Stock bajo',
            message,
            client_name: null,
            client_phone: null,
            service_name: null,
            appointment_time: null,
            metadata: { product_count: info.count },
          }))

          const { error: insertError } = await supabaseAdmin
            .from('notifications')
            .insert(notifications)

          if (!insertError) {
            lowStockGenerated += notifications.length
          }
        }
      }
    }

    return new Response(JSON.stringify({
      generated: totalGenerated,
      unpaid_alerts: unpaidGenerated,
      low_stock_alerts: lowStockGenerated,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
