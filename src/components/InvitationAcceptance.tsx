import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building, Mail, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InvitationData {
  id: string;
  workspace: {
    id: string;
    name: string;
    description?: string;
    logo_url?: string;
  };
  email: string;
  role: string;
  invited_by_profile: {
    full_name?: string;
    email: string;
  };
  personal_message?: string;
  expires_at: string;
}

export function InvitationAcceptance() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, signInWithMagicLink } = useAuth();
  const { acceptWorkspaceInvitation } = useUserManagement();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    project_manager: 'Project Manager',
    developer: 'Developer'
  };

  const roleDescriptions: Record<string, string> = {
    admin: 'Full access to workspace management, users, projects, and tasks',
    project_manager: 'Can create and manage projects, assign tasks, and invite team members',
    developer: 'Can work on assigned tasks, create personal tasks, and view project timelines'
  };

  useEffect(() => {
    if (token) {
      fetchInvitationDetails();
    }
  }, [token]);

  useEffect(() => {
    if (user && invitation && !accepting) {
      // User is logged in and we have invitation details
      checkUserEmail();
    }
  }, [user, invitation]);

  const fetchInvitationDetails = async () => {
    if (!token) return;

    try {
      setLoading(true);

      // Fetch invitation details using the token
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select(`
          id,
          email,
          role,
          personal_message,
          expires_at,
          workspace:workspaces(
            id,
            name,
            description,
            logo_url
          ),
          invited_by_profile:user_profiles!workspace_invitations_invited_by_fkey(
            full_name,
            email
          )
        `)
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('This invitation has expired or is no longer valid.');
        } else {
          throw error;
        }
        return;
      }

      setInvitation(data as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const checkUserEmail = () => {
    if (!user || !invitation) return;

    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      setError(`This invitation is for ${invitation.email}, but you're signed in as ${user.email}. Please sign in with the correct email address.`);
      setNeedsAuth(true);
    }
  };

  const handleSendMagicLink = async () => {
    if (!invitation?.email) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: invitation.email,
        options: {
          emailRedirectTo: window.location.href
        }
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Magic Link Sent",
        description: `Check your email (${invitation.email}) for a sign-in link.`
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to send magic link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token || !user) return;

    try {
      setAccepting(true);

      const membershipId = await acceptWorkspaceInvitation(token);

      if (membershipId) {
        toast({
          title: "Welcome to the team!",
          description: `You've successfully joined ${invitation?.workspace.name}!`
        });

        // Redirect to workspace
        navigate(`/workspace/${invitation?.workspace.id}`);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to accept invitation",
        variant: "destructive"
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              This invitation may have expired or been used already.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show magic link authentication if user needs to sign in
  if (!user || needsAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <Mail className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <CardTitle>Sign In to Accept Invitation</CardTitle>
            <CardDescription>
              {needsAuth
                ? `Please sign in with ${invitation.email} to accept this invitation`
                : `Sign in with your email to join ${invitation.workspace.name}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {invitation.workspace.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{invitation.workspace.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Invited as <Badge variant="secondary">{roleLabels[invitation.role]}</Badge>
                  </p>
                </div>
              </div>
            </div>

            {emailSent ? (
              <div className="text-center space-y-3">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                <div>
                  <p className="font-medium">Check your email!</p>
                  <p className="text-sm text-muted-foreground">
                    We've sent a magic link to {invitation.email}
                  </p>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleSendMagicLink}
                className="w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Magic Link to {invitation.email}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation acceptance UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Building className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            {invitation.invited_by_profile.full_name || invitation.invited_by_profile.email} has invited you to join their workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workspace Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarFallback>
                  {invitation.workspace.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{invitation.workspace.name}</h3>
                {invitation.workspace.description && (
                  <p className="text-sm text-muted-foreground">
                    {invitation.workspace.description}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your Role:</span>
                <Badge variant="secondary">{roleLabels[invitation.role]}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {roleDescriptions[invitation.role]}
              </div>
            </div>
          </div>

          {/* Personal Message */}
          {invitation.personal_message && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium mb-1">Personal Message:</p>
              <p className="text-sm text-muted-foreground italic">
                "{invitation.personal_message}"
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleAcceptInvitation}
              className="w-full"
              disabled={accepting}
            >
              {accepting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Accept Invitation & Join Workspace
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full"
            >
              Decline
            </Button>
          </div>

          {/* Expiry Info */}
          <p className="text-xs text-muted-foreground text-center">
            This invitation expires on {new Date(invitation.expires_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
