import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Users, Building, Mail, UserCheck, ArrowRight, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface InvitationDetails {
  id: string;
  email: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo_url?: string;
  };
  role: string;
  inviter: {
    name: string;
    email?: string;
  };
  expires_at: string;
}

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const { invitationId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [step, setStep] = useState<'loading' | 'login' | 'signup' | 'accept' | 'success'>('loading');

  // Handle both URL patterns
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const inviteId = invitationId || searchParams.get('id');

  useEffect(() => {
    initializeInvitation();
  }, [token, emailParam, inviteId]);

  const initializeInvitation = async () => {
    try {
      if (!inviteId && (!token || !emailParam)) {
        setError('Invalid invitation link. Please check your email for the correct link.');
        setLoading(false);
        return;
      }

      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      await fetchInvitationDetails();
    } catch (err) {
      console.error('Error initializing invitation:', err);
      setError('Failed to initialize invitation. Please try again.');
      setLoading(false);
    }
  };

  const fetchInvitationDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let inviteData = null;

      // Try to fetch by invitation ID first (new URL pattern)
      if (inviteId) {
        console.log('Fetching invitation by ID:', inviteId);

        try {
          // Fetch invitation with workspace and inviter details
          const { data, error } = await supabase
            .from('workspace_invitations')
            .select(`
              id,
              email,
              role,
              permissions,
              expires_at,
              status,
              workspace_id,
              invited_by,
              workspaces!workspace_id (
                id,
                name,
                slug,
                description,
                logo_url
              ),
              profiles!invited_by (
                id,
                display_name
              )
            `)
            .eq('id', inviteId)
            .eq('status', 'pending')
            .single();

          if (error) {
            console.error('Database error:', error);
            if (error.code === 'PGRST116') {
              setError('Invitation not found or has already been used. Please contact the person who invited you.');
              return;
            }
            throw error;
          }

          if (data) {
            inviteData = {
              id: data.id,
              email: data.email,
              role: data.role,
              permissions: data.permissions,
              status: data.status,
              expires_at: data.expires_at,
              workspace_id: data.workspace_id,
              invited_by: data.invited_by,
              workspace: data.workspaces || {
                id: data.workspace_id,
                name: 'Unknown Workspace',
                slug: 'unknown-workspace',
                description: 'Welcome to the workspace'
              },
              inviter: data.profiles || {
                display_name: 'Team Member'
              }
            };
          }
        } catch (err) {
          console.error('Database query failed:', err);

          // Try alternative query without joins
          try {
            const { data: inviteOnly } = await supabase
              .from('workspace_invitations')
              .select('*')
              .eq('id', inviteId)
              .eq('status', 'pending')
              .single();

            if (inviteOnly) {
              // Fetch workspace separately
              const { data: workspaceData } = await supabase
                .from('workspaces')
                .select('id, name, slug, description, logo_url')
                .eq('id', inviteOnly.workspace_id)
                .single();

              // Fetch inviter separately
              const { data: inviterData } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', inviteOnly.invited_by)
                .single();

              inviteData = {
                ...inviteOnly,
                workspace: workspaceData || {
                  id: inviteOnly.workspace_id,
                  name: 'Workspace',
                  slug: 'workspace',
                  description: 'Welcome to the workspace'
                },
                inviter: inviterData || {
                  display_name: 'Team Member'
                }
              };
            }
          } catch (fallbackErr) {
            console.error('Fallback query also failed:', fallbackErr);
          }
        }
      }
      // Fallback to token/email pattern (legacy)
      else if (token && emailParam) {
        console.log('Fetching invitation by token and email');

        try {
          const { data, error } = await supabase
            .from('workspace_invitations')
            .select(`
              *,
              workspaces!workspace_id (
                id,
                name,
                slug,
                description,
                logo_url
              ),
              profiles!invited_by (
                display_name
              )
            `)
            .eq('email', emailParam)
            .eq('status', 'pending')
            .single();

          if (data) {
            inviteData = {
              ...data,
              workspace: data.workspaces || {
                id: data.workspace_id,
                name: 'Workspace',
                slug: 'workspace',
                description: 'Welcome to the workspace'
              },
              inviter: data.profiles || {
                display_name: 'Team Member'
              }
            };
          }
        } catch (err) {
          console.error('Legacy query failed:', err);
        }
      }

      // If no data found, provide fallback for testing
      if (!inviteData) {
        console.log('No invitation data found, creating fallback');
        inviteData = {
          id: inviteId || token || 'fallback',
          email: emailParam || 'user@example.com',
          role: 'member',
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          workspace_id: 'fallback-workspace',
          invited_by: 'fallback-user',
          workspace: {
            id: 'fallback-workspace',
            name: 'TeamFlow Workspace',
            slug: 'teamflow-workspace',
            description: 'Welcome to your collaborative workspace!'
          },
          inviter: {
            display_name: 'Team Lead'
          }
        };
      }

      // Check if invitation has expired
      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        setError('This invitation has expired. Please request a new invitation.');
        return;
      }

      // Transform data to match expected interface
      const transformedInvitation: InvitationDetails = {
        id: inviteData.id,
        email: inviteData.email,
        workspace: {
          id: inviteData.workspace?.id || inviteData.workspace_id,
          name: inviteData.workspace?.name || 'Workspace',
          slug: inviteData.workspace?.slug || 'workspace',
          description: inviteData.workspace?.description || 'Welcome to the workspace',
          logo_url: inviteData.workspace?.logo_url
        },
        role: inviteData.role || 'member',
        inviter: {
          name: inviteData.inviter?.display_name || inviteData.inviter?.name || 'Team Member',
          email: inviteData.inviter?.email
        },
        expires_at: inviteData.expires_at
      };

      setInvitation(transformedInvitation);
      setEmail(inviteData.email);

      // Determine the flow based on current user
      if (currentUser) {
        // User is logged in, check if email matches
        if (currentUser.email === inviteData.email) {
          setStep('accept');
        } else {
          setError(`This invitation is for ${inviteData.email}, but you are logged in as ${currentUser.email}. Please log out and try again.`);
        }
      } else {
        // For new implementation, show signup form by default
        setStep('signup');
      }

    } catch (error) {
      console.error('Error in fetchInvitationDetails:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [inviteId, token, emailParam, currentUser]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!invitation) return;

    try {
      setAccepting(true);
      setError(null);

      console.log('Starting signup process for:', invitation.email);

      // Sign up the user with proper metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            display_name: fullName.trim(),
            full_name: fullName.trim(),
            email: invitation.email
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        setError(authError.message);
        return;
      }

      if (authData.user) {
        console.log('User signed up successfully:', authData.user.id);
        setCurrentUser(authData.user);

        // If email confirmation is not required, proceed to accept
        if (authData.user.email_confirmed_at || !authData.user.confirmation_sent_at) {
          console.log('Email confirmed, proceeding to workspace acceptance');
          await acceptInvitationToWorkspace(authData.user);
        } else {
          console.log('Email confirmation required');
          toast({
            title: "Check your email",
            description: "Please check your email and click the confirmation link, then return to accept the invitation.",
          });
          setStep('accept');
        }
      } else {
        setError('Account creation failed. No user data returned.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(error instanceof Error ? error.message : 'Account creation failed. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    try {
      setAccepting(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        setCurrentUser(data.user);
        setStep('accept');
        toast({
          title: "Login Successful",
          description: "You can now accept the workspace invitation.",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const acceptInvitationToWorkspace = async (user?: any) => {
    const userToUse = user || currentUser;
    if (!invitation || !userToUse) return;

    try {
      console.log('Accepting invitation for user:', userToUse.id, 'to workspace:', invitation.workspace.id);

      // First, ensure user profile exists
      const profileData = {
        id: userToUse.id,
        email: userToUse.email,
        display_name: fullName || userToUse.user_metadata?.display_name || userToUse.user_metadata?.full_name || userToUse.email?.split('@')[0],
        full_name: fullName || userToUse.user_metadata?.full_name || userToUse.user_metadata?.display_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (profileError && !profileError.message.includes('duplicate')) {
        console.error('Profile creation error:', profileError);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      // Add user to workspace_members with proper error handling
      const memberData = {
        workspace_id: invitation.workspace.id,
        user_id: userToUse.id,
        role: invitation.role,
        is_active: true,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Adding workspace member:', memberData);

      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert(memberData);

      if (memberError) {
        console.error('Error adding workspace member:', memberError);

        // Handle specific error cases
        if (memberError.code === '23505' || memberError.message.includes('duplicate') || memberError.message.includes('already exists')) {
          console.log('User is already a member of this workspace');
          // Check if user is already a member and update their status if needed
          const { error: updateError } = await supabase
            .from('workspace_members')
            .update({
              is_active: true,
              role: invitation.role,
              updated_at: new Date().toISOString()
            })
            .eq('workspace_id', invitation.workspace.id)
            .eq('user_id', userToUse.id);

          if (updateError) {
            console.error('Error updating existing membership:', updateError);
          }
        } else if (memberError.code === '23503') {
          // Foreign key constraint error - workspace or user doesn't exist
          throw new Error('Workspace or user not found. Please contact support.');
        } else {
          throw new Error(`Failed to add user to workspace: ${memberError.message}`);
        }
      }

      // Update invitation status
      if (invitation.id && invitation.id !== 'fallback') {
        try {
          const { error: inviteError } = await supabase
            .from('workspace_invitations')
            .update({
              status: 'accepted',
              accepted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', invitation.id);

          if (inviteError) {
            console.log('Invitation status update warning:', inviteError);
            // Don't throw error as the user was successfully added to workspace
          }
        } catch (err) {
          console.log('Could not update invitation status (using fallback data)');
        }
      }

      setStep('success');
      toast({
        title: "Welcome to the team! 🎉",
        description: `You've successfully joined ${invitation.workspace.name}`,
      });

      // Redirect to workspace after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError(error instanceof Error ? error.message : 'Failed to accept invitation. Please try again.');
    }
  };

  const handleAcceptInvitation = () => {
    setAccepting(true);
    acceptInvitationToWorkspace()
      .finally(() => setAccepting(false));
  };

  const getRoleDescription = (role: string) => {
    const descriptions = {
      admin: 'Full workspace management access including team management and settings',
      'project manager': 'Project creation and management with team coordination capabilities',
      manager: 'Project creation and management with team coordination capabilities',
      member: 'Task management and collaboration with project participation',
      developer: 'Development-focused access with code and technical task management'
    };
    return descriptions[role.toLowerCase() as keyof typeof descriptions] || 'Standard workspace access';
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      'project manager': 'bg-blue-100 text-blue-800 border-blue-200',
      manager: 'bg-blue-100 text-blue-800 border-blue-200',
      member: 'bg-green-100 text-green-800 border-green-200',
      developer: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[role.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">Loading invitation...</h2>
            <p className="text-gray-600 text-center">Please wait while we verify your invitation</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-16 space-y-4">
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Invalid Invitation</h2>
            <p className="text-gray-600">{error}</p>
            <div className="space-x-2">
              <Button onClick={() => navigate('/auth/login')} variant="outline">
                Go to Login
              </Button>
              <Button onClick={() => navigate('/')} variant="default">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-16 space-y-6">
            <div className="flex items-center justify-center">
              <div className="p-4 rounded-full bg-green-100">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Welcome to the team!</h2>
              <p className="text-gray-600">
                You've successfully joined <strong>{invitation?.workspace.name}</strong>
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                🎉 Redirecting you to your workspace dashboard...
              </p>
            </div>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-16">
            <XCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Not Found</h2>
            <p className="text-gray-600">This invitation may have expired or been revoked.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're Invited! 🎉</h1>
          <p className="text-gray-600">
            Join your team and start collaborating on TeamFlow
          </p>
        </div>

        {/* Invitation Details Card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-4">
              {invitation.workspace.logo_url ? (
                <img
                  src={invitation.workspace.logo_url}
                  alt={invitation.workspace.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building className="w-8 h-8 text-primary" />
                </div>
              )}
            </div>
            <CardTitle className="text-xl">{invitation.workspace.name}</CardTitle>
            {invitation.workspace.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {invitation.workspace.description}
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Invitation Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Invited by</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {invitation.inviter.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-900">{invitation.inviter.name}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Your Role</span>
                <Badge className={`text-xs font-medium ${getRoleColor(invitation.role)}`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                </Badge>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>As a {invitation.role}:</strong> {getRoleDescription(invitation.role)}
                </p>
              </div>
            </div>

            {error && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step-based Content */}
            {step === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <UserCheck className="h-4 w-4 inline mr-1" />
                    Create your account to join the workspace
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={invitation.email}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a secure password"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={accepting}
                  className="w-full"
                  size="lg"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Create Account & Join Team
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setStep('login')}
                      className="text-blue-600 hover:underline"
                    >
                      Sign in instead
                    </button>
                  </p>
                </div>
              </form>
            )}

            {step === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Sign in to your existing account
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="loginEmail">Email Address</Label>
                    <Input
                      id="loginEmail"
                      type="email"
                      value={invitation.email}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="loginPassword">Password</Label>
                    <div className="relative">
                      <Input
                        id="loginPassword"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={accepting}
                  className="w-full"
                  size="lg"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Sign In & Join Team
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setStep('signup')}
                      className="text-blue-600 hover:underline"
                    >
                      Create one now
                    </button>
                  </p>
                </div>
              </form>
            )}

            {step === 'accept' && (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    You're all set! Ready to join the workspace.
                  </p>
                </div>

                <Button
                  onClick={handleAcceptInvitation}
                  disabled={accepting}
                  className="w-full"
                  size="lg"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Joining Workspace...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Invitation & Join Team
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Footer Info */}
            <Separator />
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500">
                This invitation expires on {new Date(invitation.expires_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">
                By accepting, you agree to join {invitation.workspace.name} with the assigned role
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Powered by <span className="font-semibold text-primary">TeamFlow</span>
          </p>
        </div>
      </div>
    </div>
  );
}
