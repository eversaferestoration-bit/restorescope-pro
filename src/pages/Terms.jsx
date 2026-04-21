import { Droplets } from 'lucide-react';
import { Link } from 'react-router-dom';

const sections = [
  { title: '1. Agreement', content: 'By using RestoreScope Pro, you agree to these Terms.' },
  { title: '2. Description of Service', content: 'RestoreScope Pro provides estimating, documentation, photo analysis, and job management tools for restoration professionals.' },
  { title: '3. Account Responsibility', content: 'Users must provide accurate information and maintain account security.' },
  { title: '4. Subscription and Billing', content: 'The service may require a paid subscription. Billing is handled by third-party providers. Subscriptions renew automatically unless canceled. No refunds unless required by law.' },
  { title: '5. Beta Access', content: 'Trial access may be granted and revoked at any time. After the trial period, a subscription is required.' },
  { title: '6. Acceptable Use', content: 'Users may not use the app for illegal purposes, fraud, unauthorized access, or exploitation.' },
  { title: '7. Estimates Responsibility', content: 'Users are responsible for all estimates and compliance with laws and insurance requirements. The app provides tools only.' },
  { title: '8. AI Disclaimer', content: 'AI-generated outputs are not guaranteed to be accurate and must be reviewed by the user.' },
  { title: '9. Data Ownership', content: 'Users retain ownership of their data but grant permission for processing within the app.' },
  { title: '10. Service Availability', content: 'Service may be modified, interrupted, or discontinued at any time.' },
  { title: '11. Limitation of Liability', content: 'RestoreScope Pro is not liable for damages, denied claims, or losses. Liability is limited to fees paid in the past 30 days.' },
  { title: '12. Indemnification', content: 'Users agree to hold RestoreScope Pro harmless from claims arising from use of the app.' },
  { title: '13. Termination', content: 'Accounts may be suspended or terminated for violations or non-payment.' },
  { title: '14. Governing Law', content: 'These Terms are governed by Missouri law.' },
  { title: '15. Changes', content: 'Terms may be updated at any time.' },
  { title: '16. Contact', lines: ['RestoreScope Pro', 'eversaferestoration@gmail.com', '6362199302'] },
  { title: '17. Acceptance', content: 'Use of the app constitutes agreement to these Terms.' },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Droplets size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold font-display">RestoreScope Pro</span>
          </Link>
          <Link to="/login" className="text-sm text-primary font-medium hover:underline">Sign in</Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display mb-1">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">RestoreScope Pro &nbsp;·&nbsp; Effective Date: January 1, 2026</p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold font-display mb-2">{section.title}</h2>
              {section.content && (
                <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
              )}
              {section.lines && (
                <div className="space-y-0.5">
                  {section.lines.map((line) => (
                    <p key={line} className="text-sm text-muted-foreground">{line}</p>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} RestoreScope Pro. All rights reserved.
        </div>
      </footer>
    </div>
  );
}