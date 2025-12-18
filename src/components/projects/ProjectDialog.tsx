import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, Loader2, Sparkles, Bot, Zap } from "lucide-react";
import { Project } from "@/hooks/useProjects";
import { ProjectTemplate } from "./ProjectTemplates";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject: Project | null;
  selectedTemplate: ProjectTemplate | null;
  formData: {
    name: string;
    description: string;
    status: string;
    due_date: string;
    progress: number;
    members: TeamMember[];
  };
  onFormDataChange: (data: any) => void;
  newMemberName: string;
  newMemberEmail: string;
  onNewMemberNameChange: (name: string) => void;
  onNewMemberEmailChange: (email: string) => void;
  onAddMember: () => void;
  onRemoveMember: (id: string) => void;
  onSave: () => void;
  aiTasksLoading: boolean;
  aiGeneratedTasks: Array<{
    title: string;
    description: string;
    priority: "High" | "Medium" | "Low";
  }>;
  aiGeneratedSummary: string;
  onGenerateAITasks: () => void;
  onAddAITasks: () => void;
  onClearAITasks: () => void;
  onClearAISummary: () => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  editingProject,
  selectedTemplate,
  formData,
  onFormDataChange,
  newMemberName,
  newMemberEmail,
  onNewMemberNameChange,
  onNewMemberEmailChange,
  onAddMember,
  onRemoveMember,
  onSave,
  aiTasksLoading,
  aiGeneratedTasks,
  aiGeneratedSummary,
  onGenerateAITasks,
  onAddAITasks,
  onClearAITasks,
  onClearAISummary,
}: ProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
          <DialogDescription>
            {selectedTemplate
              ? `Creating project from "${selectedTemplate.name}" template. You can customize the details below.`
              : "Fill in the details below to create a new project."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                  placeholder="Enter project name..."
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <div className="col-span-3 space-y-2">
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                  placeholder="Enter project description..."
                  rows={3}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onGenerateAITasks}
                  disabled={aiTasksLoading || !formData.name.trim()}
                  className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100"
                >
                  {aiTasksLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-3 w-3 text-blue-600" />
                      Generate AI Tasks
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <div className="col-span-3">
                <Select value={formData.status} onValueChange={(value) => onFormDataChange({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="due_date" className="text-right">
                Due Date
              </Label>
              <div className="col-span-3">
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => onFormDataChange({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="progress" className="text-right">
                Progress
              </Label>
              <div className="col-span-3">
                <div className="flex items-center gap-4">
                  <Slider
                    value={[formData.progress]}
                    onValueChange={(value) => onFormDataChange({ ...formData, progress: value[0] })}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12">{formData.progress}%</span>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Team Members</Label>
              <div className="col-span-3 space-y-3">
                {formData.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRemoveMember(member.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Input
                    placeholder="Name"
                    value={newMemberName}
                    onChange={(e) => onNewMemberNameChange(e.target.value)}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => onNewMemberEmailChange(e.target.value)}
                  />
                  <Button onClick={onAddMember} size="icon" variant="outline">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Generated Summary */}
          {aiGeneratedSummary && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-600" />
                AI Project Summary
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAISummary}
                  className="ml-auto h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </h4>
              <div className="prose prose-sm max-w-none text-sm whitespace-pre-line">
                {aiGeneratedSummary}
              </div>
            </div>
          )}

          {/* AI Generated Tasks */}
          {aiGeneratedTasks.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  AI Generated Tasks ({aiGeneratedTasks.length})
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddAITasks}
                    className="bg-green-100 hover:bg-green-200 border-green-300 text-green-700"
                  >
                    <Zap className="mr-1 h-3 w-3" />
                    Add All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAITasks}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </h4>
              <div className="grid gap-2">
                {aiGeneratedTasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-white/70 p-2 rounded border">
                    <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'} className="text-xs">
                      {task.priority}
                    </Badge>
                    <span className="font-medium">{task.title}</span>
                    <span className="text-muted-foreground">- {task.description}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                🤖 These tasks were intelligently generated based on your project type and requirements.
              </p>
            </div>
          )}

          {/* Template Tasks */}
          {selectedTemplate && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <selectedTemplate.icon className="h-4 w-4" />
                Template Tasks ({selectedTemplate.tasks.length})
              </h4>
              <div className="grid gap-2">
                {selectedTemplate.tasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'} className="text-xs">
                      {task.priority}
                    </Badge>
                    <span className="font-medium">{task.title}</span>
                    <span className="text-muted-foreground">- {task.description}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These tasks will be automatically created when you save the project.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            {editingProject ? "Update Project" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

