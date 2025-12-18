import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Target, Award, Heart, ArrowRight, Globe, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  const team = [
    {
      name: "Sarah Johnson",
      role: "CEO & Co-Founder",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah-ceo",
      bio: "Former VP of Product at TechCorp with 15+ years in project management."
    },
    {
      name: "Michael Chen",
      role: "CTO & Co-Founder",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael-cto",
      bio: "Ex-Google engineer passionate about building scalable collaboration tools."
    },
    {
      name: "Emily Rodriguez",
      role: "Head of Design",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily-design",
      bio: "Award-winning designer focused on creating intuitive user experiences."
    },
    {
      name: "David Kim",
      role: "Head of Engineering",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=david-eng",
      bio: "Full-stack developer with expertise in real-time systems and AI."
    }
  ];

  const values = [
    {
      icon: Heart,
      title: "People First",
      description: "We believe great software starts with understanding human needs and building meaningful connections."
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We constantly push boundaries to create tools that make work more efficient and enjoyable."
    },
    {
      icon: Shield,
      title: "Trust & Security",
      description: "Your data security and privacy are paramount in everything we build and do."
    },
    {
      icon: Globe,
      title: "Global Impact",
      description: "We're building solutions that empower teams worldwide to achieve their best work."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-background to-secondary/30">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="mb-6 px-6 py-3 text-sm font-medium bg-primary/10">
            Our Story
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Building the Future of Teamwork
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Founded in 2022, TeamFlow emerged from a simple belief: teams deserve tools that enhance collaboration rather than complicate it.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                We're on a mission to eliminate the friction in team collaboration. Every feature we build,
                every design decision we make, is guided by our commitment to making teamwork seamless,
                productive, and genuinely enjoyable.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Target className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Simplify Complexity</h3>
                    <p className="text-muted-foreground">Transform complex project management into intuitive workflows.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Users className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Empower Teams</h3>
                    <p className="text-muted-foreground">Give every team member the tools to contribute their best work.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Award className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Drive Results</h3>
                    <p className="text-muted-foreground">Help organizations achieve their goals faster and more efficiently.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=600&fit=crop"
                alt="Team collaboration"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 px-6 bg-secondary/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Our Values</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The principles that guide everything we do at TeamFlow
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center p-8 rounded-3xl border-border/40 hover:border-primary/30 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Meet Our Team</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The passionate individuals behind TeamFlow's success
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center rounded-3xl border-border/40 overflow-hidden hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-24 h-24 rounded-full mx-auto mb-4"
                  />
                  <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                  <p className="text-primary font-medium mb-4">{member.role}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Join Our Journey</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Ready to experience the future of team collaboration? Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="rounded-2xl px-8 py-6 text-lg"
              onClick={() => navigate("/auth/register")}
            >
              Get Started Free
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
