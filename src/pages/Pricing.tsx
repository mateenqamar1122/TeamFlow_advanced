import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Star, Users, Zap, Shield, Clock, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Pricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small teams getting started",
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        "Up to 5 team members",
        "3 projects",
        "Basic task management",
        "1GB file storage",
        "Email support",
        "Basic integrations"
      ],
      limitations: [
        "Limited to 100 tasks per project",
        "Basic reporting only"
      ],
      popular: false,
      cta: "Get Started Free"
    },
    {
      name: "Professional",
      description: "Ideal for growing teams and businesses",
      monthlyPrice: 12,
      annualPrice: 10,
      features: [
        "Up to 25 team members",
        "Unlimited projects",
        "Advanced task management",
        "50GB file storage",
        "Priority email support",
        "All integrations",
        "Advanced analytics",
        "Custom fields",
        "Time tracking",
        "Gantt charts"
      ],
      limitations: [],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "Enterprise",
      description: "Advanced features for large organizations",
      monthlyPrice: 25,
      annualPrice: 20,
      features: [
        "Unlimited team members",
        "Unlimited projects",
        "Enterprise task management",
        "500GB file storage",
        "24/7 phone & email support",
        "All integrations + API access",
        "Advanced analytics & reporting",
        "Custom fields & workflows",
        "Time tracking & billing",
        "Gantt charts & portfolios",
        "SSO & SAML",
        "Advanced security controls",
        "Audit logs",
        "Custom onboarding",
        "SLA guarantee"
      ],
      limitations: [],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const faqs = [
    {
      question: "Can I change plans at any time?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and wire transfers for Enterprise customers."
    },
    {
      question: "Is there a free trial for paid plans?",
      answer: "Yes! All paid plans come with a 14-day free trial. No credit card required to start, and you can cancel anytime during the trial."
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "Your data is always yours. You can export all your data at any time, and we keep it available for 90 days after cancellation for easy recovery."
    },
    {
      question: "Do you offer discounts for nonprofits or education?",
      answer: "Yes! We offer 50% discounts for qualified nonprofit organizations and educational institutions. Contact our sales team for more information."
    },
    {
      question: "Can I add more storage to my plan?",
      answer: "Yes, you can purchase additional storage at any time. Extra storage costs $5 per 10GB per month and can be added through your account settings."
    },
    {
      question: "What kind of support do you provide?",
      answer: "We provide email support for all plans, priority support for Professional plans, and 24/7 phone support for Enterprise plans. We also have extensive documentation and video tutorials."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use bank-level encryption, are SOC 2 Type II certified, and follow industry best practices for data security. Enterprise plans include additional security features like SSO and audit logs."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Product Manager at TechCorp",
      content: "TeamFlow's Professional plan gave us everything we needed to scale our product development. The advanced analytics helped us improve our delivery time by 40%.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah-pricing"
    },
    {
      name: "Michael Chen",
      role: "Engineering Director at StartupXYZ",
      content: "We started with the free plan and quickly upgraded to Enterprise. The SSO integration and advanced security controls were essential for our compliance requirements.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael-pricing"
    },
    {
      name: "Emily Rodriguez",
      role: "Operations Lead at DesignCo",
      content: "The pricing is transparent and fair. We love that we can scale up and down as our team grows, and the annual discount makes it even better value.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily-pricing"
    }
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (plan.monthlyPrice === 0) return "Free";
    const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
    return `$${price}`;
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (plan.monthlyPrice === 0) return null;
    const monthlyCost = plan.monthlyPrice * 12;
    const annualCost = plan.annualPrice * 12;
    const savings = monthlyCost - annualCost;
    return savings;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-background to-secondary/30">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="mb-6 px-6 py-3 text-sm font-medium bg-primary/10">
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Start free, scale as you grow. No hidden fees, no surprises. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mt-12 mb-8">
            <div className="flex items-center bg-secondary/50 rounded-2xl p-1">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                  !isAnnual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all relative ${
                  isAnnual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Annual
                {isAnnual && (
                  <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
                    Save 20%
                  </Badge>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`rounded-3xl border-2 transition-all duration-300 hover:shadow-2xl relative ${
                  plan.popular
                    ? "border-primary shadow-2xl scale-105 bg-gradient-to-br from-primary/5 to-accent/5"
                    : "border-border/40 hover:border-primary/30"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-6 py-2 text-sm font-semibold">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-3xl font-bold">{plan.name}</CardTitle>
                  <p className="text-muted-foreground">{plan.description}</p>

                  <div className="mt-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-bold">{getPrice(plan)}</span>
                      {plan.monthlyPrice > 0 && (
                        <div className="text-muted-foreground">
                          <span className="text-xl">/{isAnnual ? "month" : "month"}</span>
                          {isAnnual && (
                            <div className="text-sm">billed annually</div>
                          )}
                        </div>
                      )}
                    </div>

                    {isAnnual && getSavings(plan) && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Save ${getSavings(plan)} per year
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <Button
                    className={`w-full rounded-2xl py-6 text-lg font-semibold mb-8 ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90 shadow-lg"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => {
                      if (plan.name === "Enterprise") {
                        navigate("/contact");
                      } else {
                        navigate("/auth/register");
                      }
                    }}
                  >
                    {plan.cta}
                    {plan.name !== "Enterprise" && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-4 text-lg">What's included:</h4>
                      <ul className="space-y-3">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {plan.limitations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-4 text-lg text-muted-foreground">Limitations:</h4>
                        <ul className="space-y-2">
                          {plan.limitations.map((limitation, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground/50 flex-shrink-0 mt-2"></div>
                              <span className="text-sm text-muted-foreground">{limitation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-24 px-6 bg-secondary/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Compare All Features</h2>
            <p className="text-xl text-muted-foreground">
              See exactly what's included in each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="font-semibold text-lg">Features</div>
                <div className="text-center font-semibold">Starter</div>
                <div className="text-center font-semibold">Professional</div>
                <div className="text-center font-semibold">Enterprise</div>
              </div>

              <div className="space-y-4">
                {[
                  { feature: "Team Members", starter: "Up to 5", pro: "Up to 25", enterprise: "Unlimited" },
                  { feature: "Projects", starter: "3", pro: "Unlimited", enterprise: "Unlimited" },
                  { feature: "File Storage", starter: "1GB", pro: "50GB", enterprise: "500GB" },
                  { feature: "Integrations", starter: "Basic", pro: "All", enterprise: "All + API" },
                  { feature: "Support", starter: "Email", pro: "Priority Email", enterprise: "24/7 Phone" },
                  { feature: "Analytics", starter: "Basic", pro: "Advanced", enterprise: "Advanced + Custom" },
                  { feature: "SSO/SAML", starter: "❌", pro: "❌", enterprise: "✅" },
                  { feature: "Audit Logs", starter: "❌", pro: "❌", enterprise: "✅" },
                  { feature: "SLA", starter: "❌", pro: "❌", enterprise: "99.9%" }
                ].map((row, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 py-4 border-b border-border/20">
                    <div className="font-medium">{row.feature}</div>
                    <div className="text-center text-sm">{row.starter}</div>
                    <div className="text-center text-sm">{row.pro}</div>
                    <div className="text-center text-sm">{row.enterprise}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">What Our Customers Say</h2>
            <p className="text-xl text-muted-foreground">
              See how teams are saving time and money with TeamFlow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="rounded-3xl border-border/40 p-6">
                <CardContent className="p-0">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 italic leading-relaxed">"{testimonial.content}"</p>
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

      {/* FAQ Section */}
      <section className="py-24 px-6 bg-secondary/20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about our pricing and plans
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="rounded-2xl border-border/40 p-6">
                <CardContent className="p-0">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <HelpCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-3">{faq.question}</h3>
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of teams already using TeamFlow to achieve amazing results.
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
              Talk to Sales
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
