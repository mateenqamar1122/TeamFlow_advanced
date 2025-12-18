// Supabase Edge Function for accepting workspace invitations
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173'

interface AcceptInvitationRequest {
  token: string;
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use service role key for elevated permissions
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Parse request body
    const { token, email }: AcceptInvitationRequest = await req.json()

    // Validate required fields
    if (!token || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing token or email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Find the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .select(`
        *,
        workspaces (
          name,
          slug,
          owner_id
        )
      `)
      .eq('token', token)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase.auth.admin.getUserByEmail(email)

    let userId: string

    if (existingUser.user) {
      // User exists, use their ID
      userId = existingUser.user.id

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', invitation.workspace_id)
        .eq('user_id', userId)
        .single()

      if (existingMember && !memberError) {
        return new Response(
          JSON.stringify({ error: 'User is already a member of this workspace' }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else {
      // User doesn't exist, create a new account with a temporary password
      const temporaryPassword = crypto.randomUUID()

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: temporaryPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          invited_to_workspace: invitation.workspace_id,
          invitation_role: invitation.role,
          onboarding_required: true
        }
      })

      if (createError || !newUser.user) {
        console.error('Failed to create user:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      userId = newUser.user.id

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: email,
          onboarding_completed: false,
          onboarding_step: 0
        })

      if (profileError) {
        console.error('Failed to create user profile:', profileError)
      }
    }

    // Add user to workspace
    const { data: newMember, error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role: invitation.role,
        permissions: invitation.permissions,
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString(),
        is_active: true
      })
      .select()
      .single()

    if (memberError) {
      console.error('Failed to add member to workspace:', memberError)
      return new Response(
        JSON.stringify({ error: 'Failed to add user to workspace' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('workspace_invitations')
      .update({
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Failed to update invitation:', updateError)
    }

    // Generate a sign-in link for the user
    const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${SITE_URL}/dashboard?workspace=${invitation.workspaces.slug}&onboarding=true`
      }
    })

    if (signInError) {
      console.error('Failed to generate sign-in link:', signInError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        workspace: {
          id: invitation.workspace_id,
          name: invitation.workspaces.name,
          slug: invitation.workspaces.slug
        },
        member: newMember,
        sign_in_url: signInData?.properties?.action_link,
        is_new_user: !existingUser.user
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in accept-invitation function:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
