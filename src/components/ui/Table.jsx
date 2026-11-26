import { Children } from 'react';

/**
 * Quiet table: sentence-case grey headers over one rule, thin row rules, no stripes or header band.
 * heads: ['Name', { label: 'Amount', right: true }]. Rows are plain <tr><td> children.
 */
export function Table({ heads, children, empty = 'Nothing to show yet.', className = '' }) {
  const rows = Children.toArray(children);
  return (
    <div className={`overflow-x-auto rounded-[20px] bg-surface ${className}`}>
      <table className="w-full border-collapse text-[15px] [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_tbody_tr+tr]:border-t [&_tbody_tr+tr]:border-line">
        <thead>
          <tr className="border-b border-line">
            {heads.map((h, i) => {
              const o = typeof h === 'string' ? { label: h } : h;
              return (
                <th
                  key={i}
                  scope="col"
                  className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap text-muted ${o.right ? 'text-right' : 'text-left'}`}
                >
                  {o.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows
          ) : (
            <tr>
              <td colSpan={heads.length} className="text-center text-muted" style={{ padding: '2rem' }}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Row action cell: buttons wrap and keep a minimum width so rows keep one height. */
export function Actions({ children }) {
  return (
    <td className="min-w-[120px]">
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </td>
  );
}

export const Sub = ({ children }) => <span className="block text-[13px] text-muted">{children}</span>;
