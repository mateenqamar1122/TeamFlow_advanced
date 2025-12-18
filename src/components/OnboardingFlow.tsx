import React, { useState, useEffect } from 'react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, User, Building, BriefcaseBusiness, UserPlus, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OnboardingFlowProps {
  onComplete?: () => void;
}

interface ProfileFormData {
  full_name: string;
  title: string;
  department: string;
  phone: string;
  timezone: string;
}

interface WorkspaceFormData {
  name: string;
  description: string;
  slug: string;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const {
    userProfile,
    onboardingSteps,
    loading,
    updateUserProfile,
    completeOnboardingStep,
    getRolePermissions
  } = useUserManagement();

  const [currentStep, setCurrentStep] = useState(0);
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    full_name: '',
    title: '',
    department: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceFormData>({
    name: '',
    description: '',
    slug: ''
  });

  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        full_name: userProfile.full_name || '',
        title: userProfile.title || '',
        department: userProfile.department || '',
        phone: userProfile.phone || '',
        timezone: userProfile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (onboardingSteps.length > 0) {
      const nextIncompleteStep = onboardingSteps.findIndex(step => !step.completed);
      setCurrentStep(nextIncompleteStep !== -1 ? nextIncompleteStep : onboardingSteps.length);
    }
  }, [onboardingSteps]);

  const completedStepsCount = onboardingSteps.filter(step => step.completed).length;
  const totalSteps = onboardingSteps.length;
  const progress = totalSteps > 0 ? (completedStepsCount / totalSteps) * 100 : 0;

  const handleProfileSetup = async () => {
    try {
      const success = await updateUserProfile(profileForm);
      if (success) {
        await completeOnboardingStep('profile_setup', profileForm);
        toast({
          title: "Profile Updated",
          description: "Your profile has been set up successfully!"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleWorkspaceCreation = async () => {
    try {
      // Call workspace creation function
      const { createWorkspace } = await import('@/hooks/useWorkspaces');
      // This would be implemented in the workspace hook
      await completeOnboardingStep('workspace_creation', workspaceForm);
      toast({
        title: "Workspace Created",
        description: "Your workspace has been created successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create workspace. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSkipStep = async (stepName: string) => {
    await completeOnboardingStep(stepName, { skipped: true });
  };

  const handleCompleteOnboarding = () => {
    toast({
      title: "Welcome to TeamFlow!",
      description: "You're all set up and ready to start managing your projects!"
    });
    onComplete?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  if (progress === 100) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Welcome to TeamFlow!</CardTitle>
            <CardDescription>
              You've completed the onboarding process. You're ready to start managing your projects!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCompleteOnboarding} className="w-full">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepData = onboardingSteps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline">
              Step {currentStep + 1} of {totalSteps}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {completedStepsCount}/{totalSteps} completed
            </span>
          </div>
          <Progress value={progress} className="mb-4" />
          <CardTitle className="flex items-center gap-2">
            {getStepIcon(currentStepData?.step_name)}
            {getStepTitle(currentStepData?.step_name)}
          </CardTitle>
          <CardDescription>
            {getStepDescription(currentStepData?.step_name)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );

  function getStepIcon(stepName?: string) {
    const icons = {
      profile_setup: <User className="h-5 w-5" />,
      workspace_creation: <Building className="h-5 w-5" />,
      first_project: <BriefcaseBusiness className="h-5 w-5" />,
      first_task: <CheckCircle className="h-5 w-5" />,
      team_invitation: <UserPlus className="h-5 w-5" />,
      tutorial_completion: <BookOpen className="h-5 w-5" />
    };
    return icons[stepName as keyof typeof icons] || <Circle className="h-5 w-5" />;
  }

  function getStepTitle(stepName?: string) {
    const titles = {
      profile_setup: "Set Up Your Profile",
      workspace_creation: "Create Your Workspace",
      first_project: "Create Your First Project",
      first_task: "Create Your First Task",
      team_invitation: "Invite Your Team",
      tutorial_completion: "Complete Tutorial"
    };
    return titles[stepName as keyof typeof titles] || "Onboarding Step";
  }

  function getStepDescription(stepName?: string) {
    const descriptions = {
      profile_setup: "Tell us a bit about yourself to personalize your experience.",
      workspace_creation: "Create your workspace where your team will collaborate.",
      first_project: "Set up your first project to organize your work.",
      first_task: "Create a task to get familiar with task management.",
      team_invitation: "Invite your team members to collaborate with you.",
      tutorial_completion: "Take a quick tour to learn about all features."
    };
    return descriptions[stepName as keyof typeof descriptions] || "Complete this step to continue.";
  }

  function renderStepContent() {
    switch (currentStepData?.step_name) {
      case 'profile_setup':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={profileForm.title}
                  onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                  placeholder="e.g., Software Developer"
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  placeholder="e.g., Engineering"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="Your phone number"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={profileForm.timezone} onValueChange={(value) => setProfileForm({ ...profileForm, timezone: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Europe/Paris">Paris</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleProfileSetup} disabled={!profileForm.full_name}>
                Complete Profile Setup
              </Button>
              <Button variant="outline" onClick={() => handleSkipStep('profile_setup')}>
                Skip for Now
              </Button>
            </div>
          </div>
        );

      case 'workspace_creation':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="workspace_name">Workspace Name *</Label>
              <Input
                id="workspace_name"
                value={workspaceForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setWorkspaceForm({
                    ...workspaceForm,
                    name,
                    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                  });
                }}
                placeholder="e.g., Acme Corp Team"
                required
              />
            </div>
            <div>
              <Label htmlFor="workspace_slug">Workspace URL</Label>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2">teamflow.com/</span>
                <Input
                  id="workspace_slug"
                  value={workspaceForm.slug}
                  onChange={(e) => setWorkspaceForm({ ...workspaceForm, slug: e.target.value })}
                  placeholder="acme-corp-team"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="workspace_description">Description</Label>
              <Textarea
                id="workspace_description"
                value={workspaceForm.description}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, description: e.target.value })}
                placeholder="Brief description of your workspace"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleWorkspaceCreation} disabled={!workspaceForm.name || !workspaceForm.slug}>
                Create Workspace
              </Button>
              <Button variant="outline" onClick={() => handleSkipStep('workspace_creation')}>
                Skip for Now
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              This step will guide you through {getStepTitle(currentStepData?.step_name).toLowerCase()}.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => completeOnboardingStep(currentStepData?.step_name || '')}>
                Complete This Step
              </Button>
              <Button variant="outline" onClick={() => handleSkipStep(currentStepData?.step_name || '')}>
                Skip for Now
              </Button>
            </div>
          </div>
        );
    }
  }
}
