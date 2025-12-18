import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-24 px-6 bg-gradient-to-br from-background to-secondary/30">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge className="mb-6 px-6 py-3 text-sm font-medium bg-primary/10">
            Legal
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Terms of Service
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
                <h2 className="text-3xl font-bold mb-6">Agreement to Terms</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  By accessing and using TeamFlow's services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Use License</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Permission is granted to temporarily download one copy of TeamFlow's materials for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-8 space-y-2">
                  <li>modify or copy the materials</li>
                  <li>use the materials for any commercial purpose or for any public display</li>
                  <li>attempt to reverse engineer any software contained on the website</li>
                  <li>remove any copyright or other proprietary notations from the materials</li>
                </ul>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">User Accounts</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.
                </p>

                <h3 className="text-2xl font-semibold mb-4">Account Responsibilities</h3>
                <ul className="list-disc list-inside text-muted-foreground mb-8 space-y-2">
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Provide accurate and up-to-date information</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Acceptable Use</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  You agree not to use the service to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-8 space-y-2">
                  <li>Upload, post, or transmit any content that is unlawful, harmful, or offensive</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation</li>
                  <li>Interfere with or disrupt the service or servers</li>
                  <li>Attempt to gain unauthorized access to other accounts or systems</li>
                  <li>Use the service for any illegal or unauthorized purpose</li>
                </ul>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Privacy Policy</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Payment Terms</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  For paid services, you agree to pay all fees and charges incurred in connection with your account. We reserve the right to modify our pricing at any time.
                </p>

                <h3 className="text-2xl font-semibold mb-4">Subscription Terms</h3>
                <ul className="list-disc list-inside text-muted-foreground mb-8 space-y-2">
                  <li>Subscriptions automatically renew unless cancelled</li>
                  <li>Refunds are provided according to our refund policy</li>
                  <li>Price changes will be communicated 30 days in advance</li>
                  <li>Failure to pay may result in service suspension</li>
                </ul>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Intellectual Property</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  The service and its original content, features, and functionality are and will remain the exclusive property of TeamFlow and its licensors. The service is protected by copyright, trademark, and other laws.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Termination</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-8 space-y-2">
                  <li>Breach of these Terms of Service</li>
                  <li>Violation of applicable laws or regulations</li>
                  <li>Fraudulent, abusive, or illegal activity</li>
                  <li>At your request for account deletion</li>
                </ul>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Disclaimers</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  The information on this website is provided on an "as is" basis. To the fullest extent permitted by law, TeamFlow excludes all representations, warranties, and conditions relating to our website and the use of this website.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Limitation of Liability</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  In no event shall TeamFlow, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Changes to Terms</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
                </p>

                <Separator className="my-8" />

                <h2 className="text-3xl font-bold mb-6">Contact Information</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="bg-secondary/20 p-6 rounded-2xl">
                  <p className="font-medium mb-2">TeamFlow Legal Team</p>
                  <p className="text-muted-foreground mb-1">Email: legal@teamflow.com</p>
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
