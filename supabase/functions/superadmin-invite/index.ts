import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const slugify = (value: string) => {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `biz-${Date.now()}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase config.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer', '').trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid session.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || callerProfile?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Forbidden.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const action = body.action || 'create'

    // ─── CREATE BUSINESS ──────────────────────────────────────
    if (action === 'create') {
      const businessName = String(body.businessName || '').trim()
      const ownerEmail = String(body.ownerEmail || '').trim()
      const ownerPassword = String(body.ownerPassword || '').trim()
      const nicheType = String(body.nicheType || 'salon').trim()

      if (!businessName || !ownerEmail || !ownerPassword) {
        return new Response(JSON.stringify({ error: 'businessName, ownerEmail, and ownerPassword are required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (ownerPassword.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Create the auth user FIRST so duplicate email is caught before any DB writes
      const { data: ownerData, error: ownerError } = await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true,
        user_metadata: {
          full_name: `Admin ${businessName}`,
          role: 'admin',
        },
      })

      if (ownerError || !ownerData?.user?.id) {
        return new Response(JSON.stringify({ error: ownerError?.message || 'Unable to create user.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const baseSlug = slugify(businessName)
      let slug = baseSlug
      let suffix = 1
      while (true) {
        const { data: existing } = await supabaseAdmin
          .from('businesses')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()

        if (!existing) break
        suffix += 1
        slug = `${baseSlug}-${suffix}`
      }

      const { data: business, error: businessError } = await supabaseAdmin
        .from('businesses')
        .insert({
          name: businessName,
          slug,
          niche_type: nicheType || 'salon',
        })
        .select('*')
        .single()

      if (businessError || !business) {
        // Rollback: delete the auth user we just created
        await supabaseAdmin.auth.admin.deleteUser(ownerData.user.id)
        return new Response(JSON.stringify({ error: businessError?.message || 'Unable to create business.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Update user metadata with the business_id now that business is created
      await supabaseAdmin.auth.admin.updateUserById(ownerData.user.id, {
        user_metadata: {
          full_name: `Admin ${businessName}`,
          business_id: business.id,
          role: 'admin',
        },
      })

      return new Response(JSON.stringify({ business, invitedUserId: ownerData.user.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── UPDATE BUSINESS ─────────────────────────────────────
    if (action === 'update_business') {
      const businessId = String(body.business_id || '').trim()
      if (!businessId) {
        return new Response(JSON.stringify({ error: 'business_id is required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const allowed: Record<string, unknown> = {}
      const fields = ['name', 'phone', 'address', 'timezone', 'currency', 'niche_type', 'active', 'ves_exchange_rate', 'theme_config', 'terminology', 'multi_branch_enabled', 'features']
      for (const f of fields) {
        if (body[f] !== undefined) allowed[f] = body[f]
      }

      if (Object.keys(allowed).length === 0) {
        return new Response(JSON.stringify({ error: 'No valid fields to update.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data, error: updateError } = await supabaseAdmin
        .from('businesses')
        .update({ ...allowed, updated_at: new Date().toISOString() })
        .eq('id', businessId)
        .is('deleted_at', null)
        .select('*')
        .single()

      if (updateError || !data) {
        return new Response(JSON.stringify({ error: updateError?.message || 'Unable to update business.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ business: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── SUSPEND BUSINESS ─────────────────────────────────────
    if (action === 'suspend_business') {
      const businessId = String(body.business_id || '').trim()
      if (!businessId) {
        return new Response(JSON.stringify({ error: 'business_id is required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await supabaseAdmin
        .from('businesses')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', businessId)
        .is('deleted_at', null)

      await supabaseAdmin
        .from('profiles')
        .update({ active: false })
        .eq('business_id', businessId)

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── RESUME BUSINESS ──────────────────────────────────────
    if (action === 'resume_business') {
      const businessId = String(body.business_id || '').trim()
      if (!businessId) {
        return new Response(JSON.stringify({ error: 'business_id is required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await supabaseAdmin
        .from('businesses')
        .update({ active: true, updated_at: new Date().toISOString() })
        .eq('id', businessId)
        .is('deleted_at', null)

      await supabaseAdmin
        .from('profiles')
        .update({ active: true })
        .eq('business_id', businessId)

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── DELETE BUSINESS (soft delete) ────────────────────────
    // En lugar de borrar físicamente todas las tablas hijas (propenso a errores
    // cuando se agregan nuevas tablas), marcamos el negocio como eliminado y
    // desactivamos sus perfiles. Los datos financieros/históricos se conservan.
    if (action === 'delete_business') {
      const businessId = String(body.business_id || '').trim()

      if (!businessId) {
        return new Response(JSON.stringify({ error: 'business_id is required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 1. Soft-delete the business
      const { error: bizError } = await supabaseAdmin
        .from('businesses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', businessId)
        .is('deleted_at', null)

      if (bizError) {
        return new Response(JSON.stringify({ error: bizError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 2. Deactivate profiles so users can't log in
      await supabaseAdmin
        .from('profiles')
        .update({ active: false })
        .eq('business_id', businessId)

      // 3. Get profile IDs to clean up auth.users
      const { data: profilesToDelete } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('business_id', businessId)

      // 4. Hard-delete auth.users (no data loss, just login credentials)
      if (profilesToDelete) {
        for (const p of profilesToDelete) {
          await supabaseAdmin.auth.admin.deleteUser(p.id)
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
