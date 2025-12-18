import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { CheckSquare, Users, Bell, BarChart3, ArrowRight, Star, CheckCircle2, Zap, Shield, Clock, Target, TrendingUp, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
    const navigate = useNavigate();

    const features = [
        {
            icon: CheckSquare,
            title: "Task Tracking",
            description: "Organize and track all your tasks with intuitive Kanban boards",
        },
        {
            icon: Users,
            title: "Real-Time Collaboration",
            description: "Work together seamlessly with your team in real-time",
        },
        {
            icon: Bell,
            title: "Smart Notifications",
            description: "Stay updated with intelligent notifications and mentions",
        },
        {
            icon: BarChart3,
            title: "Analytics Dashboard",
            description: "Track progress and productivity with detailed analytics",
        },
    ];

    const testimonials = [
        {
            name: "Sarah Chen",
            role: "Product Manager",
            content: "TeamFlow transformed how our team collaborates. The interface is intuitive and the features are exactly what we needed.",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
        },
        {
            name: "Michael Roberts",
            role: "Tech Lead",
            content: "Finally, a project management tool that developers actually enjoy using. The real-time updates are game-changing.",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
        },
        {
            name: "Emily Watson",
            role: "Designer",
            content: "Beautiful design meets powerful functionality. TeamFlow makes project management feel effortless.",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
        },
    ];

    const benefits = [
        {
            icon: Zap,
            title: "Lightning Fast",
            description: "Built for speed with real-time updates and instant sync across all devices",
        },
        {
            icon: Shield,
            title: "Enterprise Security",
            description: "Bank-level encryption with SOC 2 compliance and advanced access controls",
        },
        {
            icon: Clock,
            title: "Save Time",
            description: "Automate repetitive tasks and reduce meeting overhead by 40%",
        },
        {
            icon: Target,
            title: "Goal Tracking",
            description: "Set and track OKRs with visual progress indicators and milestone alerts",
        },
        {
            icon: TrendingUp,
            title: "Performance Insights",
            description: "Data-driven insights to optimize team performance and productivity",
        },
        {
            icon: Globe,
            title: "Global Teams",
            description: "Built for distributed teams with multi-timezone support and localization",
        },
    ];

    const pricing = [
        {
            name: "Free",
            price: "$0",
            features: ["Up to 3 projects", "Basic task management", "5 team members", "1GB storage"],
        },
        {
            name: "Pro",
            price: "$12",
            features: ["Unlimited projects", "Advanced analytics", "Unlimited team members", "50GB storage", "Priority support"],
            highlighted: true,
        },
        {
            name: "Enterprise",
            price: "Custom",
            features: ["Custom solutions", "Dedicated support", "Advanced security", "Unlimited storage", "SLA guarantee"],
        },
    ];

    return (
        <div className="min-h-screen">
            {/* Amber Glow Background Wrapper */}
            <div className="min-h-screen w-full bg-white relative">
                {/* Amber Glow Background */}
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: `
                            radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #c084fc 100%)
                        `,
                        backgroundSize: "100% 100%",
                    }}
                />

                {/* Hero Section */}
                <section className="relative z-10 overflow-hidden px-6 pt-20 pb-24">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex flex-col items-center text-center animate-fade-in">
                        <div className="mb-6">
                            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-highlight bg-clip-text text-transparent">
                                TeamFlow
                            </h1>
                            <p className="text-2xl text-muted-foreground max-w-2xl mx-auto">
                                Plan. Collaborate. Deliver — Simplify teamwork with clarity.
                            </p>
                        </div>

                        <div className="flex justify-center mt-8 mb-12">
                            <Button
                                size="lg"
                                className="rounded-2xl px-8 py-6 text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                                onClick={() => navigate("/auth/register")}
                            >
                                Get Started
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>

                        <div className="w-full max-w-4xl mt-12 rounded-3xl overflow-hidden shadow-2xl border border-border/40">
                            <img
                                src="https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?w=1200&h=600&fit=crop"
                                alt="TeamFlow Dashboard Preview"
                                className="w-full h-auto"
                            />
                        </div>
                    </div>
                </div>
            </section>
            </div>

            {/* Features Section */}
            <section className="py-32 px-6 bg-background">
                <div className="container mx-auto max-w-7xl">
                    <div className="text-center mb-20 animate-slide-up">
                        <Badge className="mb-6 px-6 py-3 text-sm font-medium bg-accent/10">
                            Core Features
                        </Badge>
                        <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">Everything you need to succeed</h2>
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                            Powerful features designed for modern teams to collaborate, track, and deliver exceptional results
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
                        {features.map((feature, index) => (
                            <Card key={index} className="rounded-3xl border-border/40 hover-lift cursor-pointer group hover:border-primary/30 transition-all duration-300 bg-gradient-to-br from-background to-secondary/20">
                                <CardHeader className="pb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <feature.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl font-semibold">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground leading-relaxed text-base">{feature.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Benefits Grid */}
                    <div className="mt-32">
                        <div className="text-center mb-16">
                            <h3 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Why teams choose TeamFlow</h3>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Built for the modern workplace with enterprise-grade security and performance
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {benefits.map((benefit, index) => (
                                <div key={index} className="flex gap-6 p-8 rounded-3xl bg-secondary/20 hover:bg-secondary/30 transition-all duration-300 border border-border/20 hover:border-primary/20">
                                    <div className="flex-shrink-0">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                            <benefit.icon className="h-7 w-7 text-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-semibold mb-3">{benefit.title}</h4>
                                        <p className="text-base text-muted-foreground leading-relaxed">{benefit.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-24 px-6 bg-secondary/30">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Loved by teams worldwide</h2>
                        <p className="text-xl text-muted-foreground">See what our users have to say</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {testimonials.map((testimonial, index) => (
                            <Card key={index} className="rounded-2xl border-border/40">
                                <CardContent className="pt-6">
                                    <div className="flex gap-1 mb-4">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="h-4 w-4 fill-highlight text-highlight" />
                                        ))}
                                    </div>
                                    <p className="text-foreground mb-6 italic">"{testimonial.content}"</p>
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={testimonial.avatar}
                                            alt={testimonial.name}
                                            className="w-12 h-12 rounded-full"
                                        />
                                        <div>
                                            <p className="font-semibold">{testimonial.name}</p>
                                            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-32 px-6 bg-background">
                <div className="container mx-auto max-w-7xl">
                    <div className="text-center mb-20">
                        <Badge className="mb-6 px-6 py-3 text-sm font-medium bg-primary/10">
                            Pricing Plans
                        </Badge>
                        <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">Simple, transparent pricing</h2>
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                            Choose the perfect plan for your team size and needs
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 mb-24">
                        {pricing.map((plan, index) => (
                            <Card
                                key={index}
                                className={`rounded-3xl border-2 transition-all duration-300 hover:shadow-2xl relative ${
                                    plan.highlighted
                                        ? "border-primary shadow-2xl scale-105 bg-gradient-to-br from-primary/5 to-accent/5"
                                        : "border-border/40 hover:border-primary/30"
                                }`}
                            >
                                {plan.highlighted && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-primary text-primary-foreground px-6 py-2 text-sm font-semibold">
                                            Most Popular
                                        </Badge>
                                    </div>
                                )}
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-3xl font-bold">{plan.name}</CardTitle>
                                    <div className="mt-6">
                                        <span className="text-6xl font-bold">{plan.price}</span>
                                        {plan.price !== "Custom" && <span className="text-muted-foreground text-xl">/month</span>}
                                    </div>
                                    <p className="text-base text-muted-foreground mt-4">
                                        {plan.name === "Free" && "Perfect for small teams getting started"}
                                        {plan.name === "Pro" && "Ideal for growing teams and businesses"}
                                        {plan.name === "Enterprise" && "Advanced features for large organizations"}
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <ul className="space-y-4 mb-8">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                                                <span className="text-base">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        className={`w-full rounded-2xl py-6 text-lg font-semibold ${
                                            plan.highlighted
                                                ? "bg-primary hover:bg-primary/90 shadow-lg"
                                                : ""
                                        }`}
                                        variant={plan.highlighted ? "default" : "outline"}
                                        onClick={() => navigate("/auth/register")}
                                    >
                                        {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* FAQ Section */}
                    <div className="text-center">
                        <h3 className="text-3xl md:text-4xl font-bold mb-12 tracking-tight">Frequently Asked Questions</h3>
                        <div className="grid md:grid-cols-2 gap-8 text-left max-w-5xl mx-auto">
                            <div className="p-8 rounded-3xl bg-secondary/20 border border-border/20">
                                <h4 className="text-xl font-semibold mb-4">Can I change plans later?</h4>
                                <p className="text-base text-muted-foreground leading-relaxed">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately with prorated billing.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-secondary/20 border border-border/20">
                                <h4 className="text-xl font-semibold mb-4">Is there a free trial?</h4>
                                <p className="text-base text-muted-foreground leading-relaxed">All paid plans come with a 14-day free trial. No credit card required to start.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-secondary/20 border border-border/20">
                                <h4 className="text-xl font-semibold mb-4">What payment methods do you accept?</h4>
                                <p className="text-base text-muted-foreground leading-relaxed">We accept all major credit cards, PayPal, and wire transfers for enterprise customers.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-secondary/20 border border-border/20">
                                <h4 className="text-xl font-semibold mb-4">Can I cancel anytime?</h4>
                                <p className="text-base text-muted-foreground leading-relaxed">Yes, you can cancel your subscription at any time with no questions asked. Your data is always exportable.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-secondary/30 py-16 px-6 border-t border-border/40">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <h3 className="font-bold text-3xl mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                TeamFlow
                            </h3>
                            <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                                Transforming how modern teams collaborate, plan, and deliver exceptional results together.
                            </p>
                            <div className="flex gap-4">
                                <a href="https://www.x.com" className="w-12 h-12 rounded-2xl bg-secondary hover:bg-primary/10 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                                </a>
                                <a href="https://www.github.com" className="w-12 h-12 rounded-2xl bg-secondary hover:bg-primary/10 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                </a>
                                <a href="https://www.linkedin.com" className="w-12 h-12 rounded-2xl bg-secondary hover:bg-primary/10 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-6">Product</h4>
                            <ul className="space-y-3 text-base text-muted-foreground">
                                <li><button onClick={() => navigate("/features")} className="hover:text-primary transition-colors hover:translate-x-1 inline-block">Features</button></li>
                                <li><button onClick={() => navigate("/pricing")} className="hover:text-primary transition-colors hover:translate-x-1 inline-block">Pricing</button></li>

                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-6">Company</h4>
                            <ul className="space-y-3 text-base text-muted-foreground">
                                <li><button onClick={() => navigate("/about")} className="hover:text-primary transition-colors hover:translate-x-1 inline-block">About</button></li>
                                <li><button onClick={() => navigate("/blog")} className="hover:text-primary transition-colors hover:translate-x-1 inline-block">Blog</button></li>
                                <li><button onClick={() => navigate("/contact")} className="hover:text-primary transition-colors hover:translate-x-1 inline-block">Contact</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-6">Legal</h4>
                            <ul className="space-y-3 text-base text-muted-foreground">
                                <li><button onClick={() => navigate("/privacy-policy")} className="hover:text-primary transition-colors hover:translate-x-1 inline-block">Privacy Policy</button></li>
                                <li><button onClick={() => navigate("/terms-of-service")} className="hover:text-primary transition-colors hover:translate-x-1 inline-block">Terms of Service</button></li>
                                <li><button onClick={() => navigate("/cookie-policy")} className="hover:text-primary transition-colors hover:translate-x-1 inline-block">Cookie Policy</button></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-border/40">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <p className="text-base text-muted-foreground">
                                © 2024 TeamFlow. All rights reserved. Built with ❤️ for modern teams.
                            </p>
                            <div className="flex gap-8 text-base text-muted-foreground">
                                <button onClick={() => navigate("/privacy-policy")} className="hover:text-primary transition-colors">Privacy Policy</button>
                                <button onClick={() => navigate("/terms-of-service")} className="hover:text-primary transition-colors">Terms of Service</button>
                                <button onClick={() => navigate("/cookie-policy")} className="hover:text-primary transition-colors">Cookie Policy</button>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    );
}
