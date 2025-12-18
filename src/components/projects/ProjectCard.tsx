import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MoreVertical, Edit, Trash2, Bot, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Project } from "@/hooks/useProjects";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { CommentsButton } from "@/components/CommentsButton";
import { ProjectHealthScoreWidget } from "./ProjectHealthScoreWidget";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onGenerateAISummary: (project: Project) => void;
  onGenerateHealthScore?: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete, onGenerateAISummary, onGenerateHealthScore }: ProjectCardProps) {
  const { currentWorkspace } = useWorkspaceContext();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-primary/10 text-primary";
      case "In Progress":
        return "bg-accent/10 text-accent";
      case "Review":
        return "bg-highlight/10 text-highlight";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="rounded-2xl border-border/40 hover-lift cursor-pointer group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Badge className={`${getStatusColor(project.status)} rounded-full`}>
            {project.status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onGenerateAISummary(project)}>
                <Bot className="mr-2 h-4 w-4 text-purple-600" />
                AI Project Summary
              </DropdownMenuItem>
              {onGenerateHealthScore && (
                <DropdownMenuItem onClick={() => onGenerateHealthScore(project)}>
                  <Activity className="mr-2 h-4 w-4 text-blue-600" />
                  AI Health Score
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(project)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(project.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
          {project.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {project.description}
        </p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Team & Due Date */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {project.members.slice(0, 3).map((member) => (
                <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
              {project.members.length > 3 && (
                <div className="h-6 w-6 bg-muted border-2 border-background rounded-full flex items-center justify-center text-xs">
                  +{project.members.length - 3}
                </div>
              )}
            </div>
            <span>{project.members.length} members</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(project.due_date).toLocaleDateString()}</span>
          </div>
        </div>

        {/* AI Health Score Widget */}
        {currentWorkspace && (
          <div className="mb-4">
            <ProjectHealthScoreWidget
              project={project}
              workspaceId={currentWorkspace.id}
              compact={true}
            />
          </div>
        )}

        {/* Comments Button */}
        {currentWorkspace && (
          <div className="flex justify-between items-center border-t pt-3 mt-2">
            {/*<div className="text-xs text-muted-foreground">*/}
            {/*  Updated {new Date(project.updated_at || project.created_at).toLocaleDateString()}*/}
            {/*</div>*/}
            <CommentsButton
              entityType="project"
              entityId={project.id}
              workspaceId={currentWorkspace.id}
              projectName={project.name}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
