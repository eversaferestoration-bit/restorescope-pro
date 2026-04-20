import { useState } from 'react';
import { Drawer } from 'vaul';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Mobile-friendly bottom sheet select replacing HTML <select>.
 * Shows on mobile, uses native Select on desktop.
 * 
 * Props:
 *   value — current value
 *   onChange — callback with new value
 *   options — array of { value, label }
 *   placeholder — default text
 *   label — optional label above
 *   error — optional error message
 */
export default function SelectBottomSheet({ value, onChange, options, placeholder = 'Select…', label, error }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <div>
      {label && <label className="block text-xs font-medium mb-1.5">{label}</label>}
      
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Trigger asChild>
          <button
            type="button"
            className={cn(
              'w-full min-h-touch px-3 rounded-lg border bg-background text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-ring transition',
              error ? 'border-destructive' : 'border-input'
            )}
          >
            <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{selectedLabel}</span>
            <span className="text-muted-foreground">▼</span>
          </button>
        </Drawer.Trigger>

        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl border-t border-border max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold">{label || 'Select an option'}</h2>
              <button
                onClick={() => setOpen(false)}
                className="touch-target text-muted-foreground hover:text-foreground transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Options list */}
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition active:bg-muted"
                >
                  <span className="text-sm">{opt.label}</span>
                  {value === opt.value && (
                    <Check size={16} className="text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Safe area bottom */}
            <div className="h-safe-bottom" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}