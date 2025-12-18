import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Clock, ArrowRight, MessageCircle } from "lucide-react";

export default function Contact() {
  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      description: "Get in touch via email for general inquiries",
      contact: "hello@teamflow.com",
      action: "Send Email"
    },
    {
      icon: Phone,
      title: "Call Us",
      description: "Speak directly with our team",
      contact: "+1 (555) 123-4567",
      action: "Call Now"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our support team instantly",
      contact: "Available 24/7",
      action: "Start Chat"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="py-24 px-6 bg-gradient-to-br from-background to-secondary/30">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="mb-6 px-6 py-3 text-sm font-medium bg-primary/10">
            Get in Touch
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {contactMethods.map((method, index) => (
              <Card key={index} className="text-center p-6 rounded-3xl border-border/40 hover:border-primary/30 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <method.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{method.title}</h3>
                  <p className="text-muted-foreground mb-4 text-sm">{method.description}</p>
                  <p className="font-medium text-primary mb-4">{method.contact}</p>
                  <Button variant="outline" size="sm" className="rounded-2xl">
                    {method.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-3xl border-border/40 p-8">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-3xl font-bold mb-4">Send us a Message</CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Input placeholder="First Name" className="rounded-2xl" />
                <Input placeholder="Last Name" className="rounded-2xl" />
              </div>
              <Input type="email" placeholder="Email" className="rounded-2xl" />
              <Input placeholder="Subject" className="rounded-2xl" />
              <Textarea
                placeholder="Tell us more about your inquiry..."
                rows={6}
                className="rounded-2xl resize-none"
              />
              <Button className="w-full rounded-2xl py-6 text-lg">
                Send Message
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
