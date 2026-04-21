import { Droplets } from 'lucide-react';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: '1. Overview',
    content: 'RestoreScope Pro provides estimating, documentation, photo analysis, and job management tools for restoration professionals. This Privacy Policy explains how information is collected, used, stored, and protected.',
  },
  {
    title: '2. Information Collected',
    items: [
      { label: 'Account Information', text: 'includes full name, email address, company name, and encrypted password.' },
      { label: 'Job and Project Data', text: 'includes property addresses, scope notes, line items, estimates, and insurance-related information entered by users.' },
      { label: 'Media and Files', text: 'include photos uploaded for analysis and documents, contracts, and reports.' },
      { label: 'Device and Usage Data', text: 'includes IP address, device type, browser or app activity, and log data.' },
      { label: 'Payment Information', text: 'is processed through third-party providers such as Stripe. Full payment card details are not stored.' },
    ],
  },
  { title: '3. Use of Information', content: 'Information is used to operate and maintain the application, generate and optimize estimates, analyze photos and job data, process subscriptions, improve performance, provide support, and enforce terms.' },
  { title: '4. AI and Photo Processing', content: 'Photos may be processed using AI to identify materials and damage, suggest scope and pricing, and improve estimating accuracy. Data is not sold and is not used to train public AI models.' },
  { title: '5. Data Sharing', content: 'Data is not sold. Information may be shared with payment processors, cloud hosting providers, AI processing services, and legal authorities when required.' },
  { title: '6. Data Security', content: 'Data is encrypted in transit and stored securely. Access is restricted through authentication and role-based permissions.' },
  { title: '7. Offline Functionality', content: 'Limited data may be stored locally on a device for offline use and will sync securely when a connection is restored.' },
  { title: '8. Data Retention', content: 'Data is retained while the account is active and as required for legal and operational purposes.' },
  { title: '9. User Rights', content: 'Users may access their data, correct inaccurate data, request deletion, and request data export by contacting eversaferestoration@gmail.com.' },
  { title: '10. Third-Party Services', content: 'The application may integrate with Google for authentication, Stripe for payments, and cloud infrastructure providers.' },
  { title: '11. Children', content: 'The application is not intended for individuals under 18.' },
  { title: '12. Updates', content: 'This policy may be updated. Continued use of the application constitutes acceptance of any changes.' },
  { title: '13. Contact', lines: ['RestoreScope Pro', 'eversaferestoration@gmail.com', '6362199302'] },
  { title: '14. Acceptance', content: 'Use of RestoreScope Pro constitutes agreement to this Privacy Policy.' },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
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

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display mb-1">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">RestoreScope Pro &nbsp;·&nbsp; Effective Date: January 1, 2026</p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold font-display mb-2">{section.title}</h2>
              {section.content && (
                <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
              )}
              {section.items && (
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item.label} className="text-sm text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">{item.label}</span> {item.text}
                    </li>
                  ))}
                </ul>
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