import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== INVITATION FUNCTION START ===')

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get and log raw request body
    const rawBody = await req.text()
    console.log('Raw request body:', rawBody)

    // Parse JSON
    let requestData: any
    try {
      requestData = JSON.parse(rawBody)
      console.log('Parsed request data:', JSON.stringify(requestData, null, 2))
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract fields with explicit logging
    const workspaceId = requestData.workspaceId
    const email = requestData.email
    const role = requestData.role
    const invitedBy = requestData.invitedBy
    const workspaceName = requestData.workspaceName || 'Workspace'
    const inviterName = requestData.inviterName || 'Team Member'
    const message = requestData.message

    console.log('=== EXTRACTED FIELDS ===')
    console.log('workspaceId:', workspaceId, typeof workspaceId)
    console.log('email:', email, typeof email)
    console.log('role:', role, typeof role)
    console.log('invitedBy:', invitedBy, typeof invitedBy)
    console.log('workspaceName:', workspaceName)
    console.log('inviterName:', inviterName)

    // Comprehensive validation
    const errors: string[] = []

    if (!workspaceId || workspaceId === 'null' || workspaceId === 'undefined') {
      errors.push(`workspaceId is invalid: ${workspaceId} (${typeof workspaceId})`)
    }
    if (!email || typeof email !== 'string') {
      errors.push(`email is invalid: ${email} (${typeof email})`)
    }
    if (!role || typeof role !== 'string') {
      errors.push(`role is invalid: ${role} (${typeof role})`)
    }
    if (!invitedBy || invitedBy === 'null' || invitedBy === 'undefined') {
      errors.push(`invitedBy is invalid: ${invitedBy} (${typeof invitedBy})`)
    }

    if (errors.length > 0) {
      console.error('Validation errors:', errors)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: errors,
          received: requestData
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate invitation token and expiration
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    console.log('Generated token:', token)
    console.log('Expires at:', expiresAt.toISOString())

    // Create the database record with explicit field mapping
    const dbRecord = {
      workspace_id: String(workspaceId), // Ensure it's a string
      email: String(email),
      role: String(role),
      permissions: getDefaultPermissions(String(role)),
      invited_by: String(invitedBy),
      token: String(token),
      expires_at: expiresAt.toISOString()
    }

    console.log('=== DATABASE RECORD ===')
    console.log('Final record to insert:', JSON.stringify(dbRecord, null, 2))

    // Validate one more time that workspace_id is not null
    if (!dbRecord.workspace_id || dbRecord.workspace_id === 'null' || dbRecord.workspace_id === 'undefined') {
      console.error('FATAL: workspace_id is still null after processing!')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'workspace_id processing failed',
          debugInfo: {
            original: workspaceId,
            processed: dbRecord.workspace_id,
            requestData: requestData
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Insert into database
    console.log('=== DATABASE INSERT ===')
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('workspace_invitations')
      .insert(dbRecord)
      .select()
      .single()

    if (invitationError) {
      console.error('Database error:', invitationError)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${invitationError.message}`,
          code: invitationError.code,
          details: invitationError.details
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Database insert successful:', invitation)

    // Generate invitation URL
    const baseUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/invite/accept?token=${token}`

    console.log('Invitation URL:', invitationUrl)

    // Send email (if Resend is configured)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (resendApiKey) {
      console.log('=== SENDING EMAIL ===')

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TeamFlow <noreply@teamflow.com>',
          to: [email],
          subject: `You're invited to join ${workspaceName} on TeamFlow`,
          html: generateInvitationEmailHTML({
            workspaceName: workspaceName,
            inviterName: inviterName,
            invitationUrl: invitationUrl,
            role: role,
            message: message,
            expiresAt: expiresAt
          })
        })
      })

      if (!emailResponse.ok) {
        const emailError = await emailResponse.text()
        console.error('Email sending failed:', emailError)

        // Don't fail the whole process, just log the error
        console.log('Email failed, but invitation record was created successfully')
      } else {
        const emailResult = await emailResponse.json()
        console.log('Email sent successfully:', emailResult)
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping email')
    }

    console.log('=== SUCCESS ===')
    return new Response(
      JSON.stringify({
        success: true,
        invitationId: invitation.id,
        message: 'Invitation created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('=== FUNCTION ERROR ===', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Helper function for permissions
function getDefaultPermissions(role: string): Record<string, any> {
  const basePermissions = {
    tasks: { read: true, create: true, update: true, delete: false },
    projects: { read: true, create: false, update: false, delete: false },
    workspace: { read: true, create: false, update: false, delete: false },
    members: { read: true, create: false, update: false, delete: false }
  }

  switch (role.toLowerCase()) {
    case 'admin':
      return {
        tasks: { read: true, create: true, update: true, delete: true },
        projects: { read: true, create: true, update: true, delete: true },
        workspace: { read: true, create: true, update: true, delete: false },
        members: { read: true, create: true, update: true, delete: true }
      }
    case 'project_manager':
      return {
        tasks: { read: true, create: true, update: true, delete: true },
        projects: { read: true, create: true, update: true, delete: false },
        workspace: { read: true, create: false, update: false, delete: false },
        members: { read: true, create: true, update: false, delete: false }
      }
    default:
      return basePermissions
  }
}

// HTML email template
function generateInvitationEmailHTML(params: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>TeamFlow Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .btn { display: inline-block; background: #007bff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 TeamFlow</h1>
        </div>
        
        <h2>You're invited to join ${params.workspaceName}!</h2>
        
        <p><strong>${params.inviterName}</strong> has invited you to collaborate on <strong>${params.workspaceName}</strong>.</p>
        
        <p><strong>Role:</strong> ${params.role}</p>
        ${params.message ? `<p><strong>Message:</strong> ${params.message}</p>` : ''}
        
        <div style="text-align: center;">
            <a href="${params.invitationUrl}" class="btn">Accept Invitation</a>
        </div>
        
        <div class="footer">
            <p>This invitation expires on ${params.expiresAt.toDateString()}</p>
            <p>If the button doesn't work, copy this link: ${params.invitationUrl}</p>
        </div>
    </div>
</body>
</html>`
}
