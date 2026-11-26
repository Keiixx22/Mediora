/** Flat panel: a 1px line, no shadow. */
export function Card({ className = '', as: Tag = 'section', ...props }) {
  return (
    <Tag
      className={`rounded-[20px] bg-surface p-5 md:p-6 [--notch:var(--color-surface)] ${className}`}
      {...props}
    />
  );
}

/** Every screen has one h1: a noun, an optional one-line finding, optional actions on the right. */
export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.9rem,3.4vw,2.75rem)] leading-[1.05] font-semibold tracking-[-0.035em]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-[68ch] text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

const NOTICE = {
  info: 'bg-accent-soft text-ink',
  warn: 'bg-warn-bg text-warn-fg',
  bad: 'bg-bad-bg text-bad-fg',
};

export function Notice({ tone = 'info', className = '', ...props }) {
  return <div role="status" className={`mb-3 rounded-2xl px-4 py-3 ${NOTICE[tone]} ${className}`} {...props} />;
}

export function EmptyBox({ children, className = '' }) {
  return (
    <div className={`rounded-[20px] bg-surface2 p-8 text-center text-muted ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children, className = '' }) {
  return <h2 className={`mt-10 mb-3 text-2xl font-semibold tracking-[-0.03em] ${className}`}>{children}</h2>;
}
