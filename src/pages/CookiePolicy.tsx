import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-24 px-6 bg-gradient-to-br from-background to-secondary/30">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge className="mb-6 px-6 py-3 text-sm font-medium bg-primary/10">
            Legal
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-xl text-muted-foreground">
            Last updated: November 25, 2024
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="rounded-3xl border-border/40">
            <CardContent className="p-12">
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold mb-6">What Are Cookies</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the owners of the site.
                  </p>
                </div>

                <Separator />

                <div>
                  <h2 className="text-3xl font-bold mb-6">How We Use Cookies</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    TeamFlow uses cookies to enhance your experience on our website and provide you with personalized content and features.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-semibold mb-4">Essential Cookies</h3>
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        These cookies are necessary for the website to function properly.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-2">
                        <li>Authentication and security</li>
                        <li>Session management</li>
                        <li>Load balancing</li>
                        <li>Form submissions</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-2xl font-semibold mb-4">Performance Cookies</h3>
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        These cookies help us understand how visitors interact with our website.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-2">
                        <li>Google Analytics</li>
                        <li>Page load times</li>
                        <li>Error tracking</li>
                        <li>User behavior analytics</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h2 className="text-3xl font-bold mb-6">Managing Your Cookies</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    You have several options for managing cookies through your browser settings.
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Block all cookies</li>
                    <li>Block third-party cookies</li>
                    <li>Delete existing cookies</li>
                    <li>Set up notifications when cookies are sent</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h2 className="text-3xl font-bold mb-6">Contact Us</h2>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    If you have any questions about our use of cookies, please contact us:
                  </p>
                  <div className="bg-secondary/20 p-6 rounded-2xl">
                    <p className="font-medium mb-2">TeamFlow Privacy Team</p>
                    <p className="text-muted-foreground mb-1">Email: privacy@teamflow.com</p>
                    <p className="text-muted-foreground mb-1">Address: 123 Innovation Street, San Francisco, CA 94105</p>
                    <p className="text-muted-foreground">Phone: +1 (555) 123-4567</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
