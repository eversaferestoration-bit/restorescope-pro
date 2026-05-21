import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, MapPin, Clock, CheckCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function PublicLanding() {
  const { slug } = useParams();
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const { data: page, isLoading } = useQuery({
    queryKey: ['public-page', slug],
    queryFn: () =>
      base44.asServiceRole.entities.PublicPage.filter(
        { slug, published: true, is_deleted: false },
        null,
        1
      ).then((pages) => pages?.[0] || null),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading page...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
          <p className="text-muted-foreground">This service page is not available.</p>
        </div>
      </div>
    );
  }

  const { content, meta_title, meta_description, city, keywords } = page;

  return (
    <>
      {/* Head meta tags */}
      <Head>
        <title>{meta_title}</title>
        <meta name="description" content={meta_description} />
        <meta name="keywords" content={keywords.join(', ')} />
        <meta property="og:title" content={meta_title} />
        <meta property="og:description" content={meta_description} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'RestoreScope',
            description: meta_description,
            url: typeof window !== 'undefined' ? window.location.origin : '',
            telephone: '+1-800-RESTORE',
            areaServed: city,
            image: 'https://via.placeholder.com/1200x630',
            priceRange: '$$',
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              reviewCount: '200',
            },
            serviceArea: {
              '@type': 'City',
              name: city,
            },
          })}
        </script>
      </Head>

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
              {content.h1}
            </h1>
            <p className="text-xl text-primary-foreground/90 mb-8 leading-relaxed">
              {content.intro}
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <a
                href="tel:+18005377683"
                className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary-foreground transition shadow-lg hover:shadow-xl"
              >
                <Phone size={20} /> {content.cta_button}
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 bg-primary-foreground/20 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary-foreground/30 transition border border-white/30"
              >
                Get Free Estimate
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>24/7 Emergency Service</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>Serving {city}</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle size={16} />
                <span>Certified & Licensed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Service Overview */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-6">Our {content.h1.split(' in ')[0]} Service</h2>
            <div className="prose prose-sm sm:prose max-w-none text-muted-foreground space-y-4 leading-relaxed">
              {content.service_overview.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {/* Why Choose Us */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8">Why Choose Us</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {content.why_choose_us?.map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-6 border border-slate-200 hover:shadow-lg transition">
                  <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Process Steps */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8">Our Process</h2>
            <div className="space-y-4">
              {content.process_steps?.map((step, i) => (
                <div key={i} className="flex gap-4 pb-4 border-b last:border-0">
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                      {step.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground mb-1">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {content.faq?.map((item, i) => (
                <div
                  key={i}
                  className="border rounded-lg overflow-hidden bg-slate-50 hover:border-primary transition"
                >
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition"
                  >
                    <span className="font-semibold text-foreground text-left">{item.question}</span>
                    <ChevronDown
                      size={20}
                      className={`shrink-0 text-primary transition-transform ${
                        expandedFAQ === i ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedFAQ === i && (
                    <div className="px-4 pb-4 pt-0 text-muted-foreground border-t bg-white">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section id="contact" className="bg-primary text-white rounded-xl p-8 sm:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">{content.cta_text}</h2>
            <p className="text-primary-foreground/90 mb-6 text-lg max-w-2xl mx-auto">
              Don't wait. Our certified technicians are standing by 24/7 to help restore your property.
            </p>
            <a
              href="tel:+18005377683"
              className="inline-flex items-center gap-2 bg-white text-primary px-10 py-4 rounded-lg font-bold text-lg hover:bg-primary-foreground transition"
            >
              <Phone size={22} /> Call Now
            </a>
          </section>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-8 px-4 sm:px-6 lg:px-8 mt-16">
          <div className="max-w-4xl mx-auto text-center text-sm text-slate-400">
            <p>&copy; 2025 RestoreScope. All rights reserved. | Service Area: {city}</p>
            <p className="mt-2">24/7 Emergency Services Available</p>
          </div>
        </footer>
      </div>
    </>
  );
}

function Head({ children }) {
  return children;
}