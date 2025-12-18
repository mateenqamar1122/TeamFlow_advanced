import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-24 px-6 bg-gradient-to-br from-background to-secondary/30">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge className="mb-6 px-6 py-3 text-sm font-medium bg-primary/10">
            Legal
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xl text-muted-foreground">
            Last updated: November 25, 2024
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="rounded-3xl border-border/40">
            <CardContent className="p-12">
              <div className="prose prose-lg max-w-none">
                <h2 className="text-3xl font-bold mb-6">Introduction</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  At TeamFlow, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Information We Collect</h2>

                <h3 className="text-2xl font-semibold mb-4">Personal Information</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  We may collect personal information that you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-8 space-y-2">
                  <li>Name and contact information (email address, phone number)</li>
                  <li>Account credentials (username, password)</li>
                  <li>Profile information and preferences</li>
                  <li>Payment and billing information</li>
                  <li>Communications with us</li>
                </ul>

                <h3 className="text-2xl font-semibold mb-4">Usage Information</h3>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  We automatically collect certain information about your use of our services, including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-8 space-y-2">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage patterns and preferences</li>
                  <li>Log files and analytics data</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">How We Use Your Information</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  We use the information we collect for various purposes, including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-8 space-y-2">
                  <li>Providing and maintaining our services</li>
                  <li>Processing transactions and managing your account</li>
                  <li>Communicating with you about our services</li>
                  <li>Improving our services and developing new features</li>
                  <li>Ensuring security and preventing fraud</li>
                  <li>Complying with legal obligations</li>
                </ul>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Information Sharing</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-8 space-y-2">
                  <li>With service providers who assist us in operating our services</li>
                  <li>When required by law or to protect our rights</li>
                  <li>In connection with a business transfer or merger</li>
                  <li>With your explicit consent</li>
                </ul>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Data Security</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption, secure servers, and regular security assessments.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Your Rights</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Depending on your location, you may have certain rights regarding your personal information:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-8 space-y-2">
                  <li>Right to access your personal information</li>
                  <li>Right to correct inaccurate information</li>
                  <li>Right to delete your personal information</li>
                  <li>Right to restrict processing</li>
                  <li>Right to data portability</li>
                  <li>Right to object to processing</li>
                </ul>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Cookies and Tracking</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  We use cookies and similar tracking technologies to enhance your experience on our website. You can control cookies through your browser settings, but disabling them may affect the functionality of our services.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">International Transfers</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Changes to This Policy</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Contact Us</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <div className="bg-secondary/20 p-6 rounded-2xl">
                  <p className="font-medium mb-2">TeamFlow Privacy Team</p>
                  <p className="text-muted-foreground mb-1">Email: privacy@teamflow.com</p>
                  <p className="text-muted-foreground mb-1">Address: 123 Innovation Street, San Francisco, CA 94105</p>
                  <p className="text-muted-foreground">Phone: +1 (555) 123-4567</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
