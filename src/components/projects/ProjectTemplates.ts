import { Code, Rocket, Globe, Briefcase, Palette, Users } from "lucide-react";

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  estimatedDuration: string;
  defaultStatus: string;
  defaultProgress: number;
  suggestedMembers: number;
  tasks: Array<{
    title: string;
    description: string;
    priority: "High" | "Medium" | "Low";
  }>;
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "website-development",
    name: "Website Development",
    description: "Complete website development project with design, development, and deployment phases",
    icon: Code,
    category: "Development",
    estimatedDuration: "8-12 weeks",
    defaultStatus: "Planning",
    defaultProgress: 0,
    suggestedMembers: 4,
    tasks: [
      { title: "Requirements Gathering", description: "Define project requirements and scope", priority: "High" },
      { title: "UI/UX Design", description: "Create wireframes and design mockups", priority: "High" },
      { title: "Frontend Development", description: "Implement user interface", priority: "Medium" },
      { title: "Backend Development", description: "Develop server-side functionality", priority: "Medium" },
      { title: "Testing & QA", description: "Test functionality and fix bugs", priority: "High" },
      { title: "Deployment", description: "Deploy to production environment", priority: "Medium" },
    ]
  },
  {
    id: "mobile-app",
    name: "Mobile App Development",
    description: "Native or cross-platform mobile application development project",
    icon: Rocket,
    category: "Development",
    estimatedDuration: "10-16 weeks",
    defaultStatus: "Planning",
    defaultProgress: 0,
    suggestedMembers: 5,
    tasks: [
      { title: "Market Research", description: "Analyze target audience and competitors", priority: "High" },
      { title: "App Design", description: "Create app wireframes and UI design", priority: "High" },
      { title: "Development Setup", description: "Setup development environment", priority: "Medium" },
      { title: "Core Features Development", description: "Implement main app features", priority: "High" },
      { title: "Testing", description: "Test app on different devices", priority: "High" },
      { title: "App Store Submission", description: "Prepare and submit to app stores", priority: "Medium" },
    ]
  },
  {
    id: "marketing-campaign",
    name: "Marketing Campaign",
    description: "Multi-channel marketing campaign with content creation and promotion",
    icon: Globe,
    category: "Marketing",
    estimatedDuration: "4-8 weeks",
    defaultStatus: "Planning",
    defaultProgress: 0,
    suggestedMembers: 3,
    tasks: [
      { title: "Campaign Strategy", description: "Define target audience and messaging", priority: "High" },
      { title: "Content Creation", description: "Create marketing materials and content", priority: "High" },
      { title: "Channel Setup", description: "Setup marketing channels and tools", priority: "Medium" },
      { title: "Campaign Launch", description: "Execute campaign across all channels", priority: "High" },
      { title: "Performance Monitoring", description: "Track and analyze campaign metrics", priority: "Medium" },
      { title: "Optimization", description: "Optimize based on performance data", priority: "Low" },
    ]
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "Comprehensive product launch with pre-launch preparation and go-to-market strategy",
    icon: Briefcase,
    category: "Business",
    estimatedDuration: "6-10 weeks",
    defaultStatus: "Planning",
    defaultProgress: 0,
    suggestedMembers: 6,
    tasks: [
      { title: "Product Finalization", description: "Complete final product development", priority: "High" },
      { title: "Market Analysis", description: "Analyze market conditions and competition", priority: "High" },
      { title: "Marketing Materials", description: "Create launch marketing materials", priority: "Medium" },
      { title: "Sales Training", description: "Train sales team on new product", priority: "Medium" },
      { title: "Launch Event", description: "Plan and execute launch event", priority: "High" },
      { title: "Post-Launch Support", description: "Monitor and support post-launch", priority: "Medium" },
    ]
  },
  {
    id: "design-system",
    name: "Design System",
    description: "Create a comprehensive design system with components, guidelines, and documentation",
    icon: Palette,
    category: "Design",
    estimatedDuration: "6-8 weeks",
    defaultStatus: "Planning",
    defaultProgress: 0,
    suggestedMembers: 3,
    tasks: [
      { title: "Design Audit", description: "Audit existing designs and identify patterns", priority: "High" },
      { title: "Component Library", description: "Create reusable design components", priority: "High" },
      { title: "Style Guide", description: "Define colors, typography, and spacing", priority: "Medium" },
      { title: "Documentation", description: "Document usage guidelines", priority: "Medium" },
      { title: "Implementation Guide", description: "Create developer implementation guide", priority: "Low" },
      { title: "Team Training", description: "Train team on design system usage", priority: "Medium" },
    ]
  },
  {
    id: "team-onboarding",
    name: "Team Onboarding",
    description: "Structured onboarding process for new team members",
    icon: Users,
    category: "HR",
    estimatedDuration: "2-4 weeks",
    defaultStatus: "Planning",
    defaultProgress: 0,
    suggestedMembers: 2,
    tasks: [
      { title: "Onboarding Plan", description: "Create detailed onboarding schedule", priority: "High" },
      { title: "Documentation Prep", description: "Prepare onboarding materials", priority: "High" },
      { title: "Account Setup", description: "Setup accounts and access permissions", priority: "Medium" },
      { title: "Orientation Sessions", description: "Conduct team and company orientation", priority: "High" },
      { title: "Role-Specific Training", description: "Provide job-specific training", priority: "Medium" },
      { title: "Progress Check-in", description: "Regular progress and feedback sessions", priority: "Low" },
    ]
  }
];

