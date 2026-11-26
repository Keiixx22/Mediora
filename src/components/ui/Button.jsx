const base =
  'inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const variants = {
  default: 'border-transparent bg-surface2 text-ink hover:bg-line',
  primary: 'border-accent bg-accent text-accent-ink hover:opacity-90',
  ghost: 'border-transparent bg-transparent text-muted hover:text-ink',
  danger: 'border-bad-fg bg-bad-fg text-surface hover:brightness-110',
  dangerOutline: 'border-transparent bg-bad-bg text-bad-fg hover:opacity-80',
};

const sizes = {
  md: 'min-h-11 px-5 py-2 text-base',
  sm: 'min-h-9 px-4 py-1 text-sm',
};

/** <Button variant="primary" size="sm" />; pass href to render a link styled as a button. */
export default function Button({ variant = 'default', size = 'md', className = '', href, type, ...props }) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) return <a href={href} className={cls} {...props} />;
  return <button type={type || 'button'} className={cls} {...props} />;
}
