export const inputCls =
  'w-full min-h-11 min-w-0 rounded-xl border border-line bg-surface px-3.5 py-2 text-ink placeholder:text-muted/70 focus:border-accent';

/** Labelled input. Name defaults to the id so FormData works out of the box. */
export function Input({ label, id, hint, className = '', fieldClass = '', ...props }) {
  return (
    <div className={`mb-3 flex min-w-0 flex-col gap-1 ${fieldClass}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input id={id} name={props.name ?? id} className={`${inputCls} ${className}`} {...props} />
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

/** Labelled select. options is a list of [value, label] pairs. */
export function Select({ label, id, options, className = '', fieldClass = '', ...props }) {
  return (
    <div className={`mb-3 flex min-w-0 flex-col gap-1 ${fieldClass}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select id={id} name={props.name ?? id} className={`${inputCls} ${className}`} {...props}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Check({ children, className = '', ...props }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 py-1 ${className}`}>
      <input type="checkbox" className="size-4 accent-accent" {...props} />
      {children}
    </label>
  );
}

export function Radio({ children, className = '', ...props }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 py-1 ${className}`}>
      <input type="radio" className="size-4 accent-accent" {...props} />
      {children}
    </label>
  );
}

export function FormError({ children }) {
  return children ? (
    <p role="alert" className="mt-1 mb-2 font-semibold text-bad-fg">
      {children}
    </p>
  ) : null;
}

export function Hint({ children, className = '' }) {
  return <p className={`text-[13px] text-muted ${className}`}>{children}</p>;
}
