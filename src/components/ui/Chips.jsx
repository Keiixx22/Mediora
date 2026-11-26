/** A pressable filter chip. */
export function Chip({ pressed, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`min-h-10 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${
        pressed ? 'border-accent bg-accent text-accent-ink' : 'border-transparent bg-surface2 text-ink hover:bg-line'
      } ${className}`}
      {...props}
    />
  );
}

/** A checkbox rendered as a chip (used for shift days). */
export function ChipCheck({ children, ...props }) {
  return (
    <label className="relative cursor-pointer">
      <input type="checkbox" className="peer absolute inset-0 opacity-0" {...props} />
      <span className="block rounded-full border border-transparent bg-surface2 px-4 py-1.5 text-sm font-semibold peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
        {children}
      </span>
    </label>
  );
}

/** Underline tabs on a full-width rule. */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="mb-3 flex gap-1 border-b border-line">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`-mb-px border-b-2 px-3 py-2 font-semibold ${
            value === id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
