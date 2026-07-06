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

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid session.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, business_id')
      .eq('id', caller.id)
      .single()

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: 'Caller has no profile.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const action: string = body.action || 'create'
    const email = String(body.email || '').trim().toLowerCase()
    const password = body.password || undefined
    const userMetadata: Record<string, unknown> = body.user_metadata || {}

    if (action === 'create') {
      if (!email) {
        return new Response(JSON.stringify({ error: 'Email is required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!password || String(password).length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Verify caller can create users in this business
      // superadmin can create anywhere; admin only in their own business
      const targetBusinessId = userMetadata.business_id || callerProfile.business_id
      if (callerProfile.role !== 'superadmin' && targetBusinessId !== callerProfile.business_id) {
        return new Response(JSON.stringify({ error: 'Forbidden: cannot create users outside your business.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Only superadmin can create other superadmins
      if (userMetadata.role === 'superadmin' && callerProfile.role !== 'superadmin') {
        return new Response(JSON.stringify({ error: 'Forbidden: only superadmin can create superadmins.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Admin can only create 'empleado' role
      if (callerProfile.role === 'admin' && userMetadata.role && userMetadata.role !== 'empleado') {
        return new Response(JSON.stringify({ error: 'Forbidden: admin can only create employees.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          ...userMetadata,
          business_id: targetBusinessId,
        },
      })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ user: data.user }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      const userId = body.user_id
      if (!userId) {
        return new Response(JSON.stringify({ error: 'user_id is required for update.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validate caller can manage this target user
      if (callerProfile.role !== 'superadmin') {
        const { data: targetProfile } = await supabaseAdmin
          .from('profiles')
          .select('business_id, role')
          .eq('id', userId)
          .single()

        if (!targetProfile) {
          return new Response(JSON.stringify({ error: 'Target user not found.' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        if (targetProfile.business_id !== callerProfile.business_id) {
          return new Response(JSON.stringify({ error: 'Forbidden: cannot manage users outside your business.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        if (callerProfile.role === 'admin' && targetProfile.role !== 'empleado') {
          return new Response(JSON.stringify({ error: 'Forbidden: admin can only manage employees.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      if (password) {
        const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
        if (pwdErr) {
          return new Response(JSON.stringify({ error: pwdErr.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      if (body.email) {
        const { error: emailErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: body.email,
          email_confirm: true,
        })
        if (emailErr) {
          return new Response(JSON.stringify({ error: emailErr.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      if (Object.keys(userMetadata).length > 0) {
        const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: userMetadata,
        })
        if (metaErr) {
          return new Response(JSON.stringify({ error: metaErr.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const userId = body.user_id
      if (!userId) {
        return new Response(JSON.stringify({ error: 'user_id is required for delete.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validate caller can manage this target user
      if (callerProfile.role !== 'superadmin') {
        const { data: targetProfile } = await supabaseAdmin
          .from('profiles')
          .select('business_id, role')
          .eq('id', userId)
          .single()

        if (!targetProfile) {
          return new Response(JSON.stringify({ error: 'Target user not found.' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        if (targetProfile.business_id !== callerProfile.business_id) {
          return new Response(JSON.stringify({ error: 'Forbidden: cannot delete users outside your business.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        if (callerProfile.role === 'admin' && targetProfile.role !== 'empleado') {
          return new Response(JSON.stringify({ error: 'Forbidden: admin can only delete employees.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
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
