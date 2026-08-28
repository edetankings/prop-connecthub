import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsFor } from "../_shared/cors.ts";


Deno.serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await userClient.rpc('has_role', {
      _user_id: callerUser.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user_id === callerUser.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get profile ID for this user
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    const profileId = profile?.id;

    // Clean up data that might not cascade automatically
    // Delete earnings (has CASCADE via FK now, but be thorough)
    await adminClient.from('earnings').delete().eq('user_id', user_id);

    // Delete transactions where user is buyer or seller
    await adminClient.from('transactions').delete().or(`buyer_id.eq.${user_id},seller_id.eq.${user_id}`);

    // Nullify referred_by references pointing to this profile
    if (profileId) {
      await adminClient.from('profiles').update({ referred_by: null }).eq('referred_by', profileId);
    }

    // Log the action before deletion
    await adminClient.from('audit_logs').insert({
      user_id: callerUser.id,
      action: 'admin_delete_user',
      details: { deleted_user_id: user_id, deleted_profile_id: profileId },
    });

    // Delete the auth user - cascades to profiles, notifications, etc.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
