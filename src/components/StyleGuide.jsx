import { Button } from './ui/button';
import { Input } from './ui/input';
import EmptyState from './ui/EmptyState';
import LoadingCard from './ui/LoadingCard';
import StatCard from './ui/StatCard';
import PageHeader from './ui/PageHeader';
import { Activity, Zap } from 'lucide-react';

export default function StyleGuide() {
  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12">
      <PageHeader
        icon={Activity}
        title="Design System"
        description="RestoreScope Pro enterprise design tokens and component patterns"
      />

      {/* Color Palette */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Color Palette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'Primary', color: 'bg-primary' },
            { name: 'Secondary', color: 'bg-secondary' },
            { name: 'Accent', color: 'bg-accent' },
            { name: 'Destructive', color: 'bg-destructive' },
            { name: 'Muted', color: 'bg-muted' },
            { name: 'Border', color: 'bg-border' },
            { name: 'Card', color: 'bg-card border border-border' },
            { name: 'Background', color: 'bg-background border border-border' },
          ].map(({ name, color }) => (
            <div key={name} className="space-y-2">
              <div className={`w-full h-24 rounded-lg ${color}`} />
              <p className="text-sm font-medium text-foreground">{name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Typography</h2>
        <div className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Heading 1</h1>
            <p className="text-xs text-muted-foreground">text-4xl font-bold</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Heading 2</h2>
            <p className="text-xs text-muted-foreground">text-2xl font-bold</p>
          </div>
          <div>
            <p className="text-base text-foreground">Body text regular weight</p>
            <p className="text-xs text-muted-foreground">text-base</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Small text for secondary info</p>
            <p className="text-xs text-muted-foreground">text-sm text-muted-foreground</p>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Buttons</h2>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Primary Variant</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Default</Button>
              <Button variant="default" disabled>Disabled</Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Secondary Variant</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary">Secondary</Button>
              <Button variant="secondary" disabled>Disabled</Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Outline Variant</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">Outline</Button>
              <Button variant="outline" disabled>Disabled</Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Ghost Variant</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost">Ghost</Button>
              <Button variant="ghost" disabled>Disabled</Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Destructive Variant</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="destructive">Destructive</Button>
              <Button variant="destructive" disabled>Disabled</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Card Components</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <StatCard
            icon={Zap}
            label="Metric Label"
            value="12,345"
            change="+12.5%"
            changeType="positive"
          />
          <StatCard
            icon={Activity}
            label="Another Metric"
            value="8,901"
            change="-3.2%"
            changeType="negative"
          />
        </div>
      </section>

      {/* Form Inputs */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Form Elements</h2>
        <div className="space-y-4">
          <Input placeholder="Text input with placeholder" />
          <Input value="Focused input" readOnly />
          <Input disabled placeholder="Disabled input" />
        </div>
      </section>

      {/* Empty States */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Empty States</h2>
        <EmptyState
          icon={Activity}
          title="No Data Available"
          description="Create your first item to get started"
          actionLabel="Create Item"
          action={() => alert('Action clicked')}
        />
      </section>

      {/* Loading States */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Loading States</h2>
        <LoadingCard count={3} />
      </section>

      {/* Spacing Scale */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Spacing Scale</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 6, 8, 10, 12].map((size) => (
            <div key={size} className="space-y-2">
              <p className="text-sm text-muted-foreground">Space {size} ({size * 4}px)</p>
              <div className={`bg-primary rounded-lg p-${size}`} style={{ padding: `${size * 4}px` }}>
                <div className="bg-background rounded h-8" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}