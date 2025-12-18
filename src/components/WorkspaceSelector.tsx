import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useSidebar } from '@/components/ui/sidebar';
import { ChevronDown, Plus, Building, Settings, Users, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface CreateWorkspaceData {
  name: string;
  slug: string;
  description: string;
}

export function WorkspaceSelector() {
  const {
    workspaces,
    currentWorkspace,
    currentMembership,
    loading,
    switchWorkspace,
    createWorkspace,
    fetchWorkspaces
  } = useWorkspaceContext();

  // Get sidebar state to hide workspace section when collapsed
  const { state: sidebarState } = useSidebar();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState<CreateWorkspaceData>({
    name: '',
    slug: '',
    description: ''
  });

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name.trim() || !newWorkspace.slug.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both name and slug for the workspace.",
        variant: "destructive",
      });
      return;
    }

    setCreateLoading(true);
    try {
      console.log('Creating workspace from component:', newWorkspace);
      const result = await createWorkspace(newWorkspace);
      console.log('Workspace creation result:', result);

      if (result) {
        setShowCreateDialog(false);
        setNewWorkspace({ name: '', slug: '', description: '' });

        // Force refresh the workspaces
        setTimeout(() => {
          fetchWorkspaces();
        }, 500);

        toast({
          title: "Workspace Created",
          description: `"${newWorkspace.name}" workspace has been created successfully.`,
        });
      } else {
        throw new Error('Failed to create workspace');
      }
    } catch (error) {
      console.error('Error in handleCreateWorkspace:', error);
      toast({
        title: "Error",
        description: "Failed to create workspace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Debug effect to monitor workspace changes
  useEffect(() => {
    console.log('WorkspaceSelector - workspaces:', workspaces.length);
    console.log('WorkspaceSelector - currentWorkspace:', currentWorkspace?.name);
    console.log('WorkspaceSelector - loading:', loading);
  }, [workspaces, currentWorkspace, loading]);

  // Add a debug button to manually test workspace fetching
  // const testWorkspaceFetch = async () => {
  //   console.log('=== MANUAL WORKSPACE FETCH TEST ===');
  //   try {
  //     await fetchWorkspaces();
  //     console.log('Manual fetch completed');
  //   } catch (error) {
  //     console.error('Manual fetch failed:', error);
  //   }
  // };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setNewWorkspace(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  if (loading && !currentWorkspace) {
    return (
      <div className="flex items-center gap-2 p-2 mx-4 my-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading workspaces...</span>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="px-4 py-4 border-b bg-muted/30">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
            No Workspace Selected
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Create or join a workspace to get started
          </p>
          {/*<Button onClick={testWorkspaceFetch} variant="outline" className="w-full mb-2">*/}
          {/*  Test Workspace Fetch*/}
          {/*</Button>*/}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    value={newWorkspace.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="My Awesome Workspace"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Workspace Slug</Label>
                  <Input
                    id="slug"
                    value={newWorkspace.slug}
                    onChange={(e) => setNewWorkspace(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="my-awesome-workspace"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newWorkspace.description}
                    onChange={(e) => setNewWorkspace(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your workspace..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleCreateWorkspace} disabled={createLoading} className="w-full">
                  {createLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Workspace
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Hide workspace section when sidebar is collapsed
  if (sidebarState === 'collapsed') {
    return null;
  }

  return (
    <div className="px-4 py-4 border-b bg-muted/30">
      {/* Current Workspace Display */}
      <div className="mb-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
          Current Workspace
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentWorkspace.logo_url} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {currentWorkspace.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg truncate">{currentWorkspace.name}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentMembership?.role}
              </Badge>
              <span className="text-xs text-muted-foreground">/{currentWorkspace.slug}</span>
            </div>
            {currentWorkspace.description && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {currentWorkspace.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <span className="text-sm">Switch Workspace</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64" align="start">
          <div className="p-2">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentWorkspace.logo_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentWorkspace.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{currentWorkspace.name}</p>
                <p className="text-xs text-muted-foreground">/{currentWorkspace.slug}</p>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {workspaces.filter(w => w.id !== currentWorkspace.id).map(workspace => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => switchWorkspace(workspace.id)}
              className="p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={workspace.logo_url} />
                  <AvatarFallback className="text-xs">
                    {workspace.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{workspace.name}</span>
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <Dialog>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workspace
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    value={newWorkspace.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="My Awesome Workspace"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Workspace Slug</Label>
                  <Input
                    id="slug"
                    value={newWorkspace.slug}
                    onChange={(e) => setNewWorkspace(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="my-awesome-workspace"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newWorkspace.description}
                    onChange={(e) => setNewWorkspace(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your workspace..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleCreateWorkspace} disabled={createLoading} className="w-full">
                  {createLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Workspace
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenuItem asChild>
            <Link to="/workspace/settings">
              <Settings className="h-4 w-4 mr-2" />
              Workspace Settings
            </Link>
          </DropdownMenuItem>

          {/*<DropdownMenuItem>*/}
          {/*  <Users className="h-4 w-4 mr-2" />*/}
          {/*  Manage Members*/}
          {/*</DropdownMenuItem>*/}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

