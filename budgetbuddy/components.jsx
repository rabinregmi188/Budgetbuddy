// ── Icons ──────────────────────────────────────────────────────────────
const BBIcon = ({ name, size = 20, color = 'currentColor', sw = 1.75 }) => {
  const s = { stroke: color, strokeWidth: sw, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const icons = {
    grid:    <><rect {...s} x="3" y="3" width="7" height="7" rx="1.5"/><rect {...s} x="14" y="3" width="7" height="7" rx="1.5"/><rect {...s} x="3" y="14" width="7" height="7" rx="1.5"/><rect {...s} x="14" y="14" width="7" height="7" rx="1.5"/></>,
    list:    <><path {...s} d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1.5" fill={color} stroke="none"/><circle cx="4" cy="12" r="1.5" fill={color} stroke="none"/><circle cx="4" cy="18" r="1.5" fill={color} stroke="none"/></>,
    wallet:  <><rect {...s} x="2" y="5" width="20" height="14" rx="3"/><path {...s} d="M16 12h.01"/><path {...s} d="M2 9h20"/></>,
    chart:   <><path {...s} d="M18 20V10M12 20V4M6 20v-6"/></>,
    plus:    <path {...s} d="M12 5v14M5 12h14"/>,
    edit:    <><path {...s} d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path {...s} d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></>,
    trash:   <><path {...s} d="M3 6h18M19 6l-1.5 14H6.5L5 6M9 6V4h6v2"/></>,
    arrowUp: <path {...s} d="M12 19V5M5 12l7-7 7 7"/>,
    arrowDn: <path {...s} d="M12 5v14M5 12l7 7 7-7"/>,
    check:   <path {...s} d="M20 6L9 17l-5-5"/>,
    x:       <path {...s} d="M18 6L6 18M6 6l12 12"/>,
    search:  <><circle {...s} cx="11" cy="11" r="7"/><path {...s} d="M21 21l-4.35-4.35"/></>,
    export:  <><path {...s} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path {...s} d="M7 10l5 5 5-5M12 15V3"/></>,
    chevDn:  <path {...s} d="M6 9l6 6 6-6"/>,
    info:    <><circle {...s} cx="12" cy="12" r="9"/><path {...s} d="M12 8h.01M12 11v5"/></>,
    coin:    <><circle {...s} cx="12" cy="12" r="9"/><path {...s} d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      {icons[name] || null}
    </svg>
  );
};

// ── Stat Card ──────────────────────────────────────────────────────────
const BBStatCard = ({ label, value, icon, col, sub, delta }) => (
  <div style={{
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '20px 22px',
    display: 'flex', flexDirection: 'column', gap: 14,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: (col || 'var(--accent)') + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BBIcon name={icon} size={15} color={col || 'var(--accent)'}/>
      </div>
    </div>
    <div>
      <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: col || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ marginTop: 6, fontSize: 12, color: delta != null ? (delta >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text2)' }}>{sub}</div>}
    </div>
  </div>
);

// ── Horizontal Category Bar ────────────────────────────────────────────
const CatBar = ({ label, amount, pct, color = 'var(--accent)' }) => (
  <div style={{ display: 'grid', gap: 7 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{label}</span>
      <strong style={{ color: 'var(--text)', fontFamily: 'Syne' }}>{amount}</strong>
    </div>
    <div style={{ height: 7, borderRadius: 99, background: 'var(--surface3)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 'inherit',
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        width: `${pct}%`,
        animation: 'barGrow .6s ease',
      }}/>
    </div>
  </div>
);

// ── Budget Progress Ring ───────────────────────────────────────────────
const BudgetRing = ({ label, spent, budget, size = 80 }) => {
  const pct    = budget > 0 ? Math.min(spent / budget, 1) : (spent > 0 ? 1 : 0);
  const over   = budget > 0 && spent > budget;
  const R      = (size / 2) - 7;
  const circ   = 2 * Math.PI * R;
  const col    = over ? 'var(--red)' : pct > 0.8 ? 'var(--amber)' : 'var(--accent)';
  const cx     = size / 2, cy = size / 2;
  const fmt    = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--surface3)" strokeWidth="6"/>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={col} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset .6s ease, stroke .3s' }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text)" fontSize={size > 70 ? 13 : 10} fontWeight="700" fontFamily="Syne,sans-serif">{fmt(spent)}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text2)" fontSize={size > 70 ? 9 : 7} fontFamily="DM Sans,sans-serif">/{fmt(budget)}</text>
      </svg>
      <span style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'center', maxWidth: size }}>{label}</span>
    </div>
  );
};

// ── Toast ──────────────────────────────────────────────────────────────
const bbToastStyles = {
  success: { bg: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--green)' },
  error:   { bg: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--red)' },
  info:    { bg: 'rgba(251,191,36,0.15)',  border: '1px solid rgba(251,191,36,0.3)',  color: 'var(--amber)' },
};

const Toast = ({ msg, type = 'success' }) => {
  const st = bbToastStyles[type] || bbToastStyles.success;
  return (
    <div style={{
      padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
      background: st.bg, border: st.border, color: st.color,
      animation: 'toastIn .3s ease',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>{msg}</div>
  );
};

// ── Modal ──────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 9998,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border2)',
      borderRadius: 20, padding: '28px', width: '100%', maxWidth: 480,
      boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      animation: 'fadeUp .25s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <h3 style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
          <BBIcon name="x" size={18} color="var(--text2)"/>
        </button>
      </div>
      {children}
    </div>
  </div>
);

const bbInputSt = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  background: 'var(--surface3)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 14, outline: 'none',
};
const bbLabelSt = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)',
  letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 7,
};

Object.assign(window, { BBIcon, BBStatCard, CatBar, BudgetRing, Toast, Modal, bbInputSt, bbLabelSt });
