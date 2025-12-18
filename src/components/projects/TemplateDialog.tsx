import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectTemplate } from "./ProjectTemplates";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ProjectTemplate[];
  onSelectTemplate: (template: ProjectTemplate) => void;
}

export function TemplateDialog({ open, onOpenChange, templates, onSelectTemplate }: TemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Choose a Project Template</DialogTitle>
          <DialogDescription>
            Start your project with a pre-built template to save time and ensure you don't miss important tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
                onClick={() => onSelectTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <template.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                      <Badge variant="secondary" className="text-xs mb-2">{template.category}</Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {template.description}
                  </p>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{template.estimatedDuration}</span>
                    <span>{template.suggestedMembers} members</span>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">{template.tasks.length} tasks included:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.tasks.slice(0, 3).map((task, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {task.title}
                        </Badge>
                      ))}
                      {template.tasks.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.tasks.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

