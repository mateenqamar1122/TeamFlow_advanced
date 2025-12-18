# Supabase Functions Configuration

# Required environment variables for edge functions:

# Email Service (using Resend)
RESEND_API_KEY=your_resend_api_key_here

# Site URL for invitation links
SITE_URL=http://localhost:5173

# Supabase Configuration (automatically provided)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Deploy the functions using:
# supabase functions deploy send-invitation
# supabase functions deploy accept-invitation

# Set environment variables using:
# supabase secrets set RESEND_API_KEY=your_api_key
# supabase secrets set SITE_URL=https://yourdomain.com
