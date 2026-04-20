import { Check, Zap, Users, TrendingUp, Building2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    key: 'solo',
    name: 'Solo',
    price: 99,
    period: '/mo',
    icon: Zap,
    iconBg: 'bg-blue-100 text-blue-600',
    description: 'Perfect for independent contractors',
    features: [
      '1 user',
      'Job creation & tracking',
      'Photo uploads',
      'Basic scope generation',
      'PDF exports',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    key: 'team',
    name: 'Team',
    price: 249,
    period: '/mo',
    icon: Users,
    iconBg: 'bg-primary/10 text-primary',
    description: 'Great for small restoration teams',
    features: [
      'Up to 5 users',
      'Everything in Solo',
      'Full estimate builder',
      'AI scope generation',
      'Carrier negotiation tools',
      'Team assignment & roles',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 499,
    period: '/mo',
    icon: TrendingUp,
    iconBg: 'bg-amber-100 text-amber-600',
    description: 'For scaling restoration companies',
    features: [
      'Unlimited users',
      'Everything in Team',
      'Advanced analytics',
      'Performance optimization',
      'Adjuster behavior insights',
      'Claim defense analysis',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: null,
    icon: Building2,
    iconBg: 'bg-slate-200 text-slate-700',
    description: 'Custom solutions for large operations',
    features: [
      'All Growth features',
      'Multi-location support',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantees',
      'Custom pricing & billing',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

function PlanCard({ plan }) {
  const Icon = plan.icon;

  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border-2 p-6 transition-all bg-card',
      plan.popular
        ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]'
        : 'border-border hover:border-primary/30 hover:shadow-md'
    )}>
      {/* Most Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow">
            <Star size={11} className="fill-current" /> Most Popular
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', plan.iconBg)}>
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-lg font-bold font-display leading-tight">{plan.name}</h3>
          <p className="text-xs text-muted-foreground">{plan.description}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-5">
        {plan.price ? (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold font-display">${plan.price}</span>
            <span className="text-sm text-muted-foreground">{plan.period}</span>
          </div>
        ) : (
          <div className="text-2xl font-bold font-display text-muted-foreground">Custom</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {plan.price ? '14-day free trial, no credit card required' : 'Tailored to your needs'}
        </p>
      </div>

      {/* CTA */}
      <button
        className={cn(
          'w-full h-11 rounded-xl text-sm font-semibold transition mb-5',
          plan.popular
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : plan.key === 'enterprise'
            ? 'bg-slate-800 text-white hover:bg-slate-700'
            : 'border-2 border-primary text-primary hover:bg-primary/5'
        )}
      >
        {plan.cta}
      </button>

      {/* Divider */}
      <div className="border-t border-border mb-4" />

      {/* Features */}
      <ul className="space-y-2.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check size={15} className="text-green-500 shrink-0 mt-0.5" />
            <span className={plan.popular ? 'text-foreground' : 'text-muted-foreground'}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Billing() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold font-display mb-2">Simple, transparent pricing</h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Start free for 14 days. No credit card required. Upgrade or cancel anytime.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {PLANS.map((plan) => (
          <PlanCard key={plan.key} plan={plan} />
        ))}
      </div>

      {/* Bottom note */}
      <p className="text-center text-xs text-muted-foreground mt-10">
        All plans include core job tracking, photo uploads, and PDF exports. Need something custom?{' '}
        <button className="text-primary font-medium hover:underline">Contact us</button>
      </p>
    </div>
  );
}