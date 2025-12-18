import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileCode, Loader2, Bot } from "lucide-react";
import { toast } from "sonner";
import { useProjects, type Project } from "@/hooks/useProjects";
import { PROJECT_TEMPLATES, ProjectTemplate } from "@/components/projects/ProjectTemplates";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { TemplateDialog } from "@/components/projects/TemplateDialog";
import { AIInsightsDialog } from "@/components/projects/AIInsightsDialog";
import { AIProjectHealthScoreDialog } from "@/components/projects/AIProjectHealthScoreDialog";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

type FilterType = "all" | "active" | "completed" | "overdue";

export default function Projects() {
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isAiInsightsDialogOpen, setIsAiInsightsDialogOpen] = useState(false);
  const [isHealthScoreDialogOpen, setIsHealthScoreDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedHealthScoreProject, setSelectedHealthScoreProject] = useState<Project | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Planning",
    due_date: "",
    progress: 0,
    members: [] as TeamMember[],
  });
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiTasksLoading, setAiTasksLoading] = useState(false);
  const [aiGeneratedSummary, setAiGeneratedSummary] = useState<string>("");
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<Array<{
    title: string;
    description: string;
    priority: "High" | "Medium" | "Low";
  }>>([]);

  const filterProjects = () => {
    const now = new Date();
    switch (activeFilter) {
      case "active":
        return projects.filter((p) => p.status === "In Progress" || p.status === "Planning");
      case "completed":
        return projects.filter((p) => p.status === "Completed");
      case "overdue":
        return projects.filter((p) => {
          const dueDate = new Date(p.due_date);
          return dueDate < now && p.status !== "Completed";
        });
      default:
        return projects;
    }
  };

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        status: project.status,
        due_date: project.due_date,
        progress: project.progress,
        members: project.members,
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: "",
        description: "",
        status: "Planning",
        due_date: "",
        progress: 0,
        members: [],
      });
    }
    setNewMemberName("");
    setNewMemberEmail("");
    setSelectedTemplate(null);
    setIsDialogOpen(true);
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (parseInt(template.estimatedDuration.split('-')[1]) || 8) * 7);

    setFormData({
      name: template.name,
      description: template.description,
      status: template.defaultStatus,
      due_date: dueDate.toISOString().split('T')[0],
      progress: template.defaultProgress,
      members: [],
    });
    setIsTemplateDialogOpen(false);
    setIsDialogOpen(true);
  };

  const generateAISummary = async (project?: Project) => {
    setAiSummaryLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const projectData = project || {
        name: formData.name || "New Project",
        description: formData.description || "Project description",
        status: formData.status,
        progress: formData.progress,
        members: formData.members
      };

      const summary = `📊 **Project Overview**: ${projectData.name} is currently in the ${projectData.status} phase with ${projectData.progress}% completion.

🎯 **Key Insights**: This project involves ${projectData.members.length} team member${projectData.members.length !== 1 ? 's' : ''} and focuses on ${projectData.description.split(' ').slice(0, 10).join(' ')}...

⚡ **AI Recommendations**:
• Consider increasing team collaboration for faster delivery.
• Set up regular milestone reviews to track progress.
• Implement automated testing to ensure quality.
• Plan for potential risks and mitigation strategies.

🚀 **Next Steps**: Focus on completing current sprint objectives while maintaining code quality and team communication.`;

      setAiGeneratedSummary(summary);
      toast.success("AI summary generated successfully!");
    } catch (error) {
      console.error("Error generating AI summary:", error);
      toast.error("Failed to generate AI summary");
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const generateAITasks = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a project name first to generate relevant tasks.");
      return;
    }

    setAiTasksLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const projectName = formData.name.toLowerCase();
      const projectDesc = formData.description.toLowerCase();
      const combinedText = `${projectName} ${projectDesc}`;

      let generatedTasks = [];

      if (combinedText.includes('website') || combinedText.includes('web') || combinedText.includes('frontend') || combinedText.includes('html')) {
        generatedTasks = [
          { title: "Project Setup & Planning", description: "Set up development environment and project structure", priority: "High" as const },
          { title: "UI/UX Design", description: "Create wireframes, mockups, and design system", priority: "High" as const },
          { title: "Frontend Development", description: "Implement responsive user interface", priority: "High" as const },
          { title: "Backend Integration", description: "Connect with APIs and database services", priority: "Medium" as const },
          { title: "Performance Optimization", description: "Optimize loading speed and user experience", priority: "Medium" as const },
          { title: "SEO Implementation", description: "Add meta tags and search engine optimization", priority: "Medium" as const },
          { title: "Testing & QA", description: "Cross-browser testing and quality assurance", priority: "High" as const },
          { title: "Deployment & Launch", description: "Deploy to production and configure hosting", priority: "Medium" as const }
        ];
      } else if (combinedText.includes('mobile') || combinedText.includes('app') || combinedText.includes('ios') || combinedText.includes('android')) {
        generatedTasks = [
          { title: "Technical Architecture", description: "Define app architecture and technology stack", priority: "High" as const },
          { title: "User Authentication", description: "Implement secure login and user management", priority: "High" as const },
          { title: "Core Features Development", description: "Build main application functionality", priority: "High" as const },
          { title: "UI/UX Implementation", description: "Create intuitive mobile user interface", priority: "High" as const },
          { title: "Push Notifications", description: "Set up push notification system", priority: "Medium" as const },
          { title: "Offline Functionality", description: "Enable app to work without internet", priority: "Medium" as const },
          { title: "App Testing", description: "Test on multiple devices and OS versions", priority: "High" as const },
          { title: "App Store Submission", description: "Prepare and submit to app stores", priority: "Medium" as const }
        ];
      } else if (combinedText.includes('marketing') || combinedText.includes('campaign') || combinedText.includes('social') || combinedText.includes('advertising')) {
        generatedTasks = [
          { title: "Market Research", description: "Analyze target audience and competition", priority: "High" as const },
          { title: "Strategy Development", description: "Create comprehensive marketing strategy", priority: "High" as const },
          { title: "Content Creation", description: "Develop engaging marketing materials", priority: "High" as const },
          { title: "Channel Setup", description: "Configure marketing channels and platforms", priority: "Medium" as const },
          { title: "Campaign Launch", description: "Execute multi-channel marketing campaign", priority: "High" as const },
          { title: "Performance Monitoring", description: "Track metrics and campaign performance", priority: "Medium" as const },
          { title: "A/B Testing", description: "Test different approaches and optimize", priority: "Medium" as const },
          { title: "ROI Analysis", description: "Measure return on investment and effectiveness", priority: "Low" as const }
        ];
      } else if (combinedText.includes('design') || combinedText.includes('ui') || combinedText.includes('ux') || combinedText.includes('branding')) {
        generatedTasks = [
          { title: "Design Research", description: "Research user needs and design trends", priority: "High" as const },
          { title: "User Personas", description: "Create detailed user personas and journeys", priority: "High" as const },
          { title: "Wireframes & Prototypes", description: "Build wireframes and interactive prototypes", priority: "High" as const },
          { title: "Visual Design", description: "Create final visual designs and assets", priority: "High" as const },
          { title: "Design System", description: "Build comprehensive design system", priority: "Medium" as const },
          { title: "User Testing", description: "Conduct usability testing with real users", priority: "Medium" as const },
          { title: "Design Handoff", description: "Prepare assets for development team", priority: "Medium" as const },
          { title: "Implementation Review", description: "Review and refine final implementation", priority: "Low" as const }
        ];
      } else {
        generatedTasks = [
          { title: "Project Planning", description: "Define scope, timeline, and deliverables", priority: "High" as const },
          { title: "Requirements Gathering", description: "Collect and document all requirements", priority: "High" as const },
          { title: "Resource Allocation", description: "Assign team members and allocate budget", priority: "High" as const },
          { title: "Risk Assessment", description: "Identify potential risks and mitigation plans", priority: "Medium" as const },
          { title: "Communication Setup", description: "Establish communication channels and schedules", priority: "Medium" as const },
          { title: "Progress Tracking", description: "Set up project monitoring and reporting", priority: "Medium" as const },
          { title: "Quality Assurance", description: "Define quality standards and testing procedures", priority: "Medium" as const },
          { title: "Project Documentation", description: "Create comprehensive project documentation", priority: "Low" as const }
        ];
      }

      setAiGeneratedTasks(generatedTasks);
      toast.success(`🤖 Generated ${generatedTasks.length} AI-powered tasks for "${formData.name}"!`);
    } catch (error) {
      console.error("Error generating AI tasks:", error);
      toast.error("Failed to generate AI tasks. Please try again.");
      setAiGeneratedTasks([]);
    } finally {
      setAiTasksLoading(false);
    }
  };

  const addAITasksToProject = () => {
    if (aiGeneratedTasks.length === 0) {
      toast.error("No AI tasks to add. Generate tasks first.");
      return;
    }

    const tasksInfo = `\n\n🤖 AI-Generated Tasks:\n${aiGeneratedTasks.map((task, index) => 
      `${index + 1}. ${task.title} (${task.priority} Priority)`
    ).join('\n')}`;

    setFormData(prev => ({
      ...prev,
      description: prev.description + tasksInfo
    }));

    toast.success(`✨ Added ${aiGeneratedTasks.length} AI-generated tasks to project description!`);
    setAiGeneratedTasks([]);
  };

  const handleAddMember = () => {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      toast.error("Please enter both name and email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: newMemberName,
      email: newMemberEmail,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newMemberEmail}`,
    };

    setFormData({
      ...formData,
      members: [...formData.members, newMember],
    });
    setNewMemberName("");
    setNewMemberEmail("");
    toast.success("Team member added");
  };

  const handleRemoveMember = (memberId: string) => {
    setFormData({
      ...formData,
      members: formData.members.filter((m) => m.id !== memberId),
    });
    toast.success("Team member removed");
  };

  const handleSaveProject = async () => {
    if (!formData.name || !formData.description || !formData.due_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingProject) {
      const success = await updateProject(editingProject.id, {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        due_date: formData.due_date,
        members: formData.members,
        progress: formData.progress,
        tasks_completed: editingProject.tasks_completed,
        tasks_total: editingProject.tasks_total,
      });

      if (success) {
        toast.success(`Project "${formData.name}" has been updated successfully`);
      }
    } else {
      const newProject = await createProject({
        name: formData.name,
        description: formData.description,
        status: formData.status,
        due_date: formData.due_date,
        members: formData.members,
        progress: formData.progress,
        tasks_completed: 0,
        tasks_total: 0,
      });

      if (newProject) {
        toast.success(`New project "${formData.name}" has been created successfully`);
      }
    }

    setIsDialogOpen(false);
    setEditingProject(null);
  };

  const handleDeleteProject = async (id: string) => {
    const project = projects.find((p) => p.id === id);
    const success = await deleteProject(id);

    if (success && project) {
      toast.success(`Project "${project.name}" has been deleted`);
    }
  };

  const handleGenerateHealthScore = (project: Project) => {
    setSelectedHealthScoreProject(project);
    setIsHealthScoreDialogOpen(true);
  };

  const filteredProjects = filterProjects();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">Projects</h1>
          <p className="text-muted-foreground">Manage and track all your projects in one place</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100" onClick={() => setIsAiInsightsDialogOpen(true)}>
            <Bot className="mr-2 h-4 w-4 text-purple-600" />
            AI Insights
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => setIsTemplateDialogOpen(true)}>
            <FileCode className="mr-2 h-4 w-4" />
            Templates
          </Button>
          <Button className="rounded-2xl" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Button
          variant={activeFilter === "all" ? "outline" : "ghost"}
          className="rounded-2xl"
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          All Projects
        </Button>
        <Button
          variant={activeFilter === "active" ? "outline" : "ghost"}
          className="rounded-2xl"
          size="sm"
          onClick={() => setActiveFilter("active")}
        >
          Active
        </Button>
        <Button
          variant={activeFilter === "completed" ? "outline" : "ghost"}
          className="rounded-2xl"
          size="sm"
          onClick={() => setActiveFilter("completed")}
        >
          Completed
        </Button>
        <Button
          variant={activeFilter === "overdue" ? "outline" : "ghost"}
          className="rounded-2xl"
          size="sm"
          onClick={() => setActiveFilter("overdue")}
        >
          Overdue
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No projects yet. Create your first project to get started!</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setIsTemplateDialogOpen(true)} variant="outline">
              <FileCode className="mr-2 h-4 w-4" />
              Use Template
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && projects.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleOpenDialog}
              onDelete={handleDeleteProject}
              onGenerateAISummary={generateAISummary}
              onGenerateHealthScore={handleGenerateHealthScore}
            />
          ))}
        </div>
      )}

      {/* Template Dialog */}
      <TemplateDialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        templates={PROJECT_TEMPLATES}
        onSelectTemplate={handleTemplateSelect}
      />

      {/* Project Dialog */}
      <ProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingProject={editingProject}
        selectedTemplate={selectedTemplate}
        formData={formData}
        onFormDataChange={setFormData}
        newMemberName={newMemberName}
        newMemberEmail={newMemberEmail}
        onNewMemberNameChange={setNewMemberName}
        onNewMemberEmailChange={setNewMemberEmail}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onSave={handleSaveProject}
        aiTasksLoading={aiTasksLoading}
        aiGeneratedTasks={aiGeneratedTasks}
        aiGeneratedSummary={aiGeneratedSummary}
        onGenerateAITasks={generateAITasks}
        onAddAITasks={addAITasksToProject}
        onClearAITasks={() => setAiGeneratedTasks([])}
        onClearAISummary={() => setAiGeneratedSummary("")}
      />

      {/* AI Insights Dialog */}
      <AIInsightsDialog
        open={isAiInsightsDialogOpen}
        onOpenChange={setIsAiInsightsDialogOpen}
        projects={projects}
        aiSummaryLoading={aiSummaryLoading}
        aiGeneratedSummary={aiGeneratedSummary}
        onGenerateSummary={() => generateAISummary()}
        onOpenTemplateDialog={() => {
          setIsAiInsightsDialogOpen(false);
          setIsTemplateDialogOpen(true);
        }}
      />

      {/* AI Project Health Score Dialog */}
      <AIProjectHealthScoreDialog
        project={selectedHealthScoreProject}
        open={isHealthScoreDialogOpen}
        onOpenChange={setIsHealthScoreDialogOpen}
      />
    </div>
  );
}

