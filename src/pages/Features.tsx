import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Users, Bell, BarChart3, ArrowRight, Zap, Shield, Clock, Target, TrendingUp, Globe, Workflow, Database, Smartphone, Lock, Calendar, MessageSquare, FileText, Search, Settings, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Features() {
  const navigate = useNavigate();

  const coreFeatures = [
    {
      icon: CheckSquare,
      title: "Advanced Task Management",
      description: "Create, organize, and track tasks with our intuitive Kanban boards, custom fields, and automated workflows.",
      benefits: ["Drag & drop interface", "Custom task templates", "Automated task assignments", "Progress tracking"]
    },
    {
      icon: Users,
      title: "Real-Time Collaboration",
      description: "Work together seamlessly with your team through real-time updates, comments, and file sharing.",
      benefits: ["Live editing", "Instant notifications", "Team mentions", "File attachments"]
    },
    {
      icon: BarChart3,
      title: "Analytics & Reporting",
      description: "Get detailed insights into team performance with comprehensive analytics and customizable reports.",
      benefits: ["Performance metrics", "Custom dashboards", "Export reports", "Team insights"]
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Stay informed with intelligent notifications that adapt to your work patterns and preferences.",
      benefits: ["Priority filtering", "Digest emails", "Mobile push", "Custom rules"]
    }
  ];

  const advancedFeatures = [
    {
      icon: Workflow,
      title: "Workflow Automation",
      description: "Automate repetitive tasks and streamline processes with powerful workflow rules.",
      category: "Automation"
    },
    {
      icon: Database,
      title: "Advanced Integrations",
      description: "Connect with 1000+ tools including Slack, GitHub, Jira, and Google Workspace.",
      category: "Integrations"
    },
    {
      icon: Smartphone,
      title: "Mobile Apps",
      description: "Stay productive on the go with native iOS and Android apps with full feature parity.",
      category: "Mobile"
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Bank-level security with SSO, 2FA, audit logs, and SOC 2 Type II compliance.",
      category: "Security"
    },
    {
      icon: Calendar,
      title: "Timeline & Gantt Charts",
      description: "Visualize project timelines with interactive Gantt charts and milestone tracking.",
      category: "Planning"
    },
    {
      icon: MessageSquare,
      title: "Team Communication",
      description: "Built-in chat, video calls, and discussion boards to keep communication centralized.",
      category: "Communication"
    },
    {
      icon: FileText,
      title: "Document Management",
      description: "Store, organize, and collaborate on documents with version control and permissions.",
      category: "Documents"
    },
    {
      icon: Search,
      title: "Universal Search",
      description: "Find anything across projects, tasks, comments, and files with AI-powered search.",
      category: "Search"
    },
    {
      icon: Settings,
      title: "Custom Fields & Forms",
      description: "Create custom fields, forms, and templates to match your unique workflows.",
      category: "Customization"
    }
  ];

  const integrations = [
    { name: "Slack", logo: "💬", category: "Communication" },
    { name: "GitHub", logo: "🐙", category: "Development" },
    { name: "Google Workspace", logo: "📧", category: "Productivity" },
    { name: "Microsoft Teams", logo: "👥", category: "Communication" },
    { name: "Jira", logo: "🔷", category: "Development" },
    { name: "Figma", logo: "🎨", category: "Design" },
    { name: "Salesforce", logo: "☁️", category: "CRM" },
    { name: "Zoom", logo: "📹", category: "Video" },
    { name: "Dropbox", logo: "📦", category: "Storage" },
    { name: "Stripe", logo: "💳", category: "Payments" },
    { name: "HubSpot", logo: "🟠", category: "Marketing" },
    { name: "Notion", logo: "📝", category: "Documentation" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-background to-secondary/30">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="mb-6 px-6 py-3 text-sm font-medium bg-primary/10">
            Complete Feature Set
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Powerful Features for Modern Teams
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Everything you need to plan, collaborate, and deliver exceptional results. Built for teams that demand excellence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Button
              size="lg"
              className="rounded-2xl px-8 py-6 text-lg"
              onClick={() => navigate("/auth/register")}
            >
              Try Free for 14 Days
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl px-8 py-6 text-lg"
              onClick={() => navigate("/pricing")}
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Core Features</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Essential tools that power your team's productivity and collaboration
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {coreFeatures.map((feature, index) => (
              <Card key={index} className="rounded-3xl border-border/40 overflow-hidden hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-semibold mb-3">{feature.title}</CardTitle>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="ml-22">
                    <ul className="space-y-3">
                      {feature.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <span className="text-sm font-medium">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-24 px-6 bg-secondary/20">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Advanced Capabilities</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Professional tools and enterprise-grade features for scaling teams
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {advancedFeatures.map((feature, index) => (
              <Card key={index} className="rounded-3xl border-border/40 hover:border-primary/30 transition-all duration-300 group cursor-pointer">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="h-7 w-7 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {feature.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">1000+ Integrations</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Connect TeamFlow with your existing tools and workflows
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {integrations.map((integration, index) => (
              <Card key={index} className="text-center p-6 rounded-2xl border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-md group cursor-pointer">
                <CardContent className="p-0">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    {integration.logo}
                  </div>
                  <h3 className="font-semibold mb-1">{integration.name}</h3>
                  <p className="text-xs text-muted-foreground">{integration.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" className="rounded-2xl px-8 py-4">
              View All Integrations
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose TeamFlow */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Why Teams Love TeamFlow</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">99.9%</h3>
              <p className="text-muted-foreground">Uptime SLA</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">SOC 2</h3>
              <p className="text-muted-foreground">Type II Certified</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Headphones className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">24/7</h3>
              <p className="text-muted-foreground">Expert Support</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">50K+</h3>
              <p className="text-muted-foreground">Active Teams</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your Team?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of teams already using TeamFlow to achieve their best work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="rounded-2xl px-8 py-6 text-lg"
              onClick={() => navigate("/auth/register")}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl px-8 py-6 text-lg"
              onClick={() => navigate("/contact")}
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
