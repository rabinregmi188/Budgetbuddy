// ── Constants ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'budgetbuddy.v1';
const CATEGORIES  = ['Housing','Food','Transport','Utilities','Health','Entertainment','Other'];
const CAT_COLORS  = ['#10b981','#34d399','#6ee7b7','#fbbf24','#fb923c','#a78bfa','#60a5fa'];
const fmt = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v||0);
const currentMonth = () => new Date().toISOString().slice(0,7);

// ── State helpers ──────────────────────────────────────────────────────
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return {
      transactions: s.transactions||[],
      budgets: { ...CATEGORIES.reduce((a,c)=>{a[c]=0;return a},{}), ...(s.budgets||{}) },
      selectedMonth: s.selectedMonth||currentMonth(),
    };
  } catch { return { transactions:[], budgets: CATEGORIES.reduce((a,c)=>{a[c]=0;return a},{}), selectedMonth:currentMonth() }; }
}
function saveState(st) { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); }

// ── Demo Data ──────────────────────────────────────────────────────────
function demoData(month) {
  return {
    transactions: [
      {id:crypto.randomUUID(),description:'Monthly Paycheck',amount:3200,type:'income',category:'Other',date:`${month}-01`},
      {id:crypto.randomUUID(),description:'Freelance project',amount:650,type:'income',category:'Other',date:`${month}-10`},
      {id:crypto.randomUUID(),description:'Apartment rent',amount:1100,type:'expense',category:'Housing',date:`${month}-03`},
      {id:crypto.randomUUID(),description:'Weekly groceries',amount:148,type:'expense',category:'Food',date:`${month}-05`},
      {id:crypto.randomUUID(),description:'Groceries run',amount:94,type:'expense',category:'Food',date:`${month}-14`},
      {id:crypto.randomUUID(),description:'Gas refill',amount:52,type:'expense',category:'Transport',date:`${month}-06`},
      {id:crypto.randomUUID(),description:'Uber rides',amount:38,type:'expense',category:'Transport',date:`${month}-17`},
      {id:crypto.randomUUID(),description:'Electric bill',amount:87,type:'expense',category:'Utilities',date:`${month}-08`},
      {id:crypto.randomUUID(),description:'Internet bill',amount:45,type:'expense',category:'Utilities',date:`${month}-08`},
      {id:crypto.randomUUID(),description:'Gym membership',amount:40,type:'expense',category:'Health',date:`${month}-01`},
      {id:crypto.randomUUID(),description:'Movie tickets',amount:32,type:'expense',category:'Entertainment',date:`${month}-12`},
      {id:crypto.randomUUID(),description:'Spotify & Netflix',amount:28,type:'expense',category:'Entertainment',date:`${month}-15`},
    ],
    budgets: {Housing:1200,Food:400,Transport:150,Utilities:180,Health:120,Entertainment:100,Other:200},
  };
}

// ── Transaction Form ───────────────────────────────────────────────────
const TxForm = ({ initial, month, onSave, onCancel }) => {
  const [form, setForm] = React.useState(initial || {
    description:'', amount:'', type:'expense', category:'Food', date:`${month}-01`,
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const valid = form.description.trim() && parseFloat(form.amount) > 0 && form.date;
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      {/* Description - full width */}
      <div style={{gridColumn:'1/-1'}}>
        <label style={bbLabelSt}>Description</label>
        <input style={bbInputSt} placeholder="e.g. Grocery run" value={form.description} maxLength={60}
          onChange={e=>set('description',e.target.value)}/>
      </div>
      <div>
        <label style={bbLabelSt}>Amount</label>
        <input style={bbInputSt} type="number" min="0.01" step="0.01" placeholder="0.00"
          value={form.amount} onChange={e=>set('amount',e.target.value)}/>
      </div>
      <div>
        <label style={bbLabelSt}>Date</label>
        <input style={bbInputSt} type="date" value={form.date} onChange={e=>set('date',e.target.value)}/>
      </div>
      <div>
        <label style={bbLabelSt}>Type</label>
        <div style={{display:'flex',gap:8}}>
          {['expense','income'].map(t=>(
            <button key={t} onClick={()=>set('type',t)} style={{
              flex:1, padding:'10px 0', borderRadius:10, border:`1.5px solid`,
              borderColor: form.type===t ? (t==='income'?'var(--green)':'var(--red)') : 'var(--border)',
              background: form.type===t ? (t==='income'?'rgba(52,211,153,0.12)':'rgba(248,113,113,0.12)') : 'transparent',
              color: form.type===t ? (t==='income'?'var(--green)':'var(--red)') : 'var(--text2)',
              cursor:'pointer', fontWeight:600, fontSize:13, transition:'all .15s',
            }}>{t==='income' ? '↑ Income' : '↓ Expense'}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={bbLabelSt}>Category</label>
        <select style={bbInputSt} value={form.category} onChange={e=>set('category',e.target.value)}>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {/* Actions */}
      <div style={{gridColumn:'1/-1',display:'flex',gap:10,marginTop:4}}>
        <button onClick={onCancel} style={{
          flex:1,padding:'12px',borderRadius:10,border:'1px solid var(--border)',
          background:'transparent',color:'var(--text2)',cursor:'pointer',fontWeight:600,fontSize:14,
        }}>Cancel</button>
        <button disabled={!valid} onClick={()=>onSave({...form,amount:parseFloat(form.amount)})} style={{
          flex:2,padding:'12px',borderRadius:10,border:'none',cursor:valid?'pointer':'not-allowed',
          background:valid?'var(--accent)':'var(--surface3)',
          color:'white',fontWeight:600,fontSize:14,transition:'opacity .15s',
          opacity:valid?1:0.5,
        }}>Save Transaction</button>
      </div>
    </div>
  );
};

// ── Dashboard Screen ───────────────────────────────────────────────────
const Dashboard = ({ state, onNav, showToast }) => {
  const month = state.selectedMonth;
  const txs   = state.transactions.filter(t=>t.date.startsWith(month));
  const income  = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const balance = income - expense;
  const totalBudget = Object.values(state.budgets).reduce((s,v)=>s+Number(v||0),0);
  const budgetUsed  = totalBudget ? Math.round(expense/totalBudget*100) : 0;

  const byCategory = CATEGORIES.map((c,i) => ({
    cat:c, col:CAT_COLORS[i],
    amount: txs.filter(t=>t.type==='expense'&&t.category===c).reduce((s,t)=>s+t.amount,0),
  })).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);

  const maxAmt = byCategory[0]?.amount||1;
  const topCat = byCategory[0];
  const recent = [...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);

  return (
    <div style={{padding:'26px 30px',overflowY:'auto',height:'100%',display:'flex',flexDirection:'column',gap:20}} className="fade-up">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1 style={{fontFamily:'Syne',fontSize:22,fontWeight:700,marginBottom:3}}>Dashboard</h1>
          <p style={{color:'var(--text2)',fontSize:13}}>{new Date(month+'-15').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p>
        </div>
        <button onClick={()=>onNav('transactions')} style={{
          display:'flex',alignItems:'center',gap:7,padding:'9px 20px',
          borderRadius:100,border:'none',cursor:'pointer',
          background:'var(--accent)',color:'white',fontFamily:'DM Sans',fontWeight:600,fontSize:13,
          transition:'opacity .15s',
        }}
          onMouseEnter={e=>e.currentTarget.style.opacity='.85'}
          onMouseLeave={e=>e.currentTarget.style.opacity='1'}
        >
          <BBIcon name="plus" size={14} color="white"/> Add Transaction
        </button>
      </div>

      {/* Insight strip */}
      {topCat && (
        <div style={{
          background:'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.06))',
          border:'1px solid var(--border2)',borderRadius:13,padding:'13px 18px',
          display:'flex',alignItems:'center',gap:12,
        }}>
          <BBIcon name="info" size={15} color="var(--accent-l)"/>
          <p style={{fontSize:13.5,color:'var(--accent-l)',lineHeight:1.55}}>
            <strong>{topCat.cat}</strong> is your top spending category this month at <strong>{fmt(topCat.amount)}</strong>
            {state.budgets[topCat.cat]>0 ? ` — ${Math.round(topCat.amount/state.budgets[topCat.cat]*100)}% of your budget.` : '.'}
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        <BBStatCard label="Income"     value={fmt(income)}   icon="arrowUp" col="var(--green)" sub="this month"/>
        <BBStatCard label="Expenses"   value={fmt(expense)}  icon="arrowDn" col="var(--red)"   sub="this month"/>
        <BBStatCard label="Balance"    value={fmt(balance)}  icon="wallet"  col={balance>=0?'var(--green)':'var(--red)'} sub={balance>=0?'surplus':'deficit'} delta={balance}/>
        <BBStatCard label="Budget Used" value={`${budgetUsed}%`} icon="chart" col={budgetUsed>90?'var(--red)':budgetUsed>70?'var(--amber)':'var(--accent)'} sub={totalBudget?`of ${fmt(totalBudget)}`:'no budget set'}/>
      </div>

      {/* Charts row */}
      <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:18}}>
        {/* Category spending */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 22px'}}>
          <h3 style={{fontFamily:'Syne',fontWeight:700,fontSize:14,marginBottom:18}}>Spending by Category</h3>
          {byCategory.length ? (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {byCategory.map(x=>(
                <CatBar key={x.cat} label={x.cat} amount={fmt(x.amount)} pct={x.amount/maxAmt*100} color={x.col}/>
              ))}
            </div>
          ) : (
            <p style={{color:'var(--muted)',fontSize:13}}>No expense data this month.</p>
          )}
        </div>

        {/* Recent transactions */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 22px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 style={{fontFamily:'Syne',fontWeight:700,fontSize:14}}>Recent</h3>
            <button onClick={()=>onNav('transactions')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontSize:12,fontWeight:600}}>View all →</button>
          </div>
          {recent.length ? (
            <div style={{display:'flex',flexDirection:'column',gap:1}}>
              {recent.map(tx=>(
                <div key={tx.id} style={{
                  display:'flex',alignItems:'center',gap:12,
                  padding:'10px 0',borderBottom:'1px solid var(--border)',
                }}>
                  <div style={{
                    width:30,height:30,borderRadius:9,flexShrink:0,
                    background:tx.type==='income'?'rgba(52,211,153,0.12)':'rgba(248,113,113,0.12)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    <BBIcon name={tx.type==='income'?'arrowUp':'arrowDn'} size={13} color={tx.type==='income'?'var(--green)':'var(--red)'}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{tx.description}</div>
                    <div style={{fontSize:11,color:'var(--text2)'}}>{tx.category} · {tx.date}</div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,fontFamily:'Syne',color:tx.type==='income'?'var(--green)':'var(--red)',flexShrink:0}}>
                    {tx.type==='income'?'+':'-'}{fmt(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'24px 0'}}>
              <p style={{color:'var(--muted)',fontSize:13,marginBottom:12}}>No transactions yet</p>
              <button onClick={()=>onNav('transactions')} style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--accent-d)',color:'var(--accent)',fontSize:12,fontWeight:600,cursor:'pointer'}}>Add one →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Transactions Screen ────────────────────────────────────────────────
const Transactions = ({ state, setState, showToast }) => {
  const [showForm, setShowForm]   = React.useState(false);
  const [editTx,   setEditTx]     = React.useState(null);
  const [search,   setSearch]     = React.useState('');
  const [sortCol,  setSortCol]    = React.useState('date');
  const [sortDir,  setSortDir]    = React.useState('desc');
  const [typeFilter, setTypeFilter] = React.useState('all');

  const month = state.selectedMonth;

  const addTx = (tx) => {
    const next = { ...state, transactions: [{ ...tx, id: crypto.randomUUID() }, ...state.transactions] };
    setState(next); saveState(next);
    setShowForm(false); showToast('Transaction added');
  };
  const updateTx = (tx) => {
    const next = { ...state, transactions: state.transactions.map(t => t.id===tx.id ? tx : t) };
    setState(next); saveState(next);
    setEditTx(null); showToast('Transaction updated');
  };
  const deleteTx = (id) => {
    const next = { ...state, transactions: state.transactions.filter(t=>t.id!==id) };
    setState(next); saveState(next); showToast('Deleted','info');
  };

  const toggleSort = (col) => {
    if (sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  let rows = state.transactions.filter(t=>t.date.startsWith(month));
  if (typeFilter!=='all') rows = rows.filter(t=>t.type===typeFilter);
  if (search) rows = rows.filter(t=>t.description.toLowerCase().includes(search.toLowerCase())||t.category.toLowerCase().includes(search.toLowerCase()));
  rows = [...rows].sort((a,b)=>{
    const av=a[sortCol],bv=b[sortCol];
    const r = typeof av==='number'?av-bv:String(av).localeCompare(String(bv));
    return sortDir==='asc'?r:-r;
  });

  const thSt = (col) => ({
    padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text2)',
    letterSpacing:'0.07em', textTransform:'uppercase', cursor:'pointer', userSelect:'none',
    borderBottom:'1px solid var(--border)', whiteSpace:'nowrap',
    color: sortCol===col?'var(--accent)':'var(--text2)',
  });

  return (
    <div style={{padding:'26px 30px',overflowY:'auto',height:'100%',display:'flex',flexDirection:'column',gap:20}} className="fade-up">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1 style={{fontFamily:'Syne',fontSize:22,fontWeight:700,marginBottom:3}}>Transactions</h1>
          <p style={{color:'var(--text2)',fontSize:13}}>{rows.length} entries · {new Date(month+'-15').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p>
        </div>
        <button onClick={()=>setShowForm(true)} style={{
          display:'flex',alignItems:'center',gap:7,padding:'9px 20px',
          borderRadius:100,border:'none',cursor:'pointer',
          background:'var(--accent)',color:'white',fontFamily:'DM Sans',fontWeight:600,fontSize:13,
        }}>
          <BBIcon name="plus" size={14} color="white"/> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:'1',minWidth:200}}>
          <BBIcon name="search" size={14} color="var(--muted)" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transactions…"
            style={{...bbInputSt,paddingLeft:36,fontSize:13}}/>
        </div>
        <div style={{display:'flex',gap:6}}>
          {['all','income','expense'].map(f=>(
            <button key={f} onClick={()=>setTypeFilter(f)} style={{
              padding:'8px 14px',borderRadius:20,border:'1px solid',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all .15s',
              borderColor:typeFilter===f?'var(--border2)':'var(--border)',
              background:typeFilter===f?'var(--accent-d)':'transparent',
              color:typeFilter===f?'var(--accent)':'var(--text2)',
            }}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden',flex:1}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {[['description','Description'],['category','Category'],['type','Type'],['date','Date'],['amount','Amount']].map(([col,lbl])=>(
                  <th key={col} style={thSt(col)} onClick={()=>toggleSort(col)}>
                    {lbl} {sortCol===col?<span style={{opacity:.7}}>{sortDir==='asc'?'↑':'↓'}</span>:<span style={{opacity:.25}}>↕</span>}
                  </th>
                ))}
                <th style={{...thSt(''),cursor:'default'}}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map(tx=>(
                <tr key={tx.id} style={{borderBottom:'1px solid var(--border)',transition:'background .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}
                >
                  <td style={{padding:'12px',fontSize:13,color:'var(--text)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}</td>
                  <td style={{padding:'12px',fontSize:12,color:'var(--text2)'}}>{tx.category}</td>
                  <td style={{padding:'12px'}}>
                    <span style={{
                      fontSize:11,padding:'4px 10px',borderRadius:20,fontWeight:700,
                      background:tx.type==='income'?'rgba(52,211,153,0.12)':'rgba(248,113,113,0.12)',
                      color:tx.type==='income'?'var(--green)':'var(--red)',
                    }}>{tx.type}</span>
                  </td>
                  <td style={{padding:'12px',fontSize:12,color:'var(--text2)',whiteSpace:'nowrap'}}>{tx.date}</td>
                  <td style={{padding:'12px',fontFamily:'Syne',fontWeight:700,fontSize:13,color:tx.type==='income'?'var(--green)':'var(--red)',whiteSpace:'nowrap'}}>
                    {tx.type==='income'?'+':'-'}{fmt(tx.amount)}
                  </td>
                  <td style={{padding:'12px'}}>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>setEditTx(tx)} style={{background:'rgba(251,191,36,0.1)',border:'none',borderRadius:8,padding:'6px 8px',cursor:'pointer',color:'var(--amber)',transition:'background .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(251,191,36,0.22)'}
                        onMouseLeave={e=>e.currentTarget.style.background='rgba(251,191,36,0.1)'}
                      ><BBIcon name="edit" size={13} color="var(--amber)"/></button>
                      <button onClick={()=>deleteTx(tx.id)} style={{background:'rgba(248,113,113,0.1)',border:'none',borderRadius:8,padding:'6px 8px',cursor:'pointer',color:'var(--red)',transition:'background .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(248,113,113,0.22)'}
                        onMouseLeave={e=>e.currentTarget.style.background='rgba(248,113,113,0.1)'}
                      ><BBIcon name="trash" size={13} color="var(--red)"/></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} style={{padding:'40px',textAlign:'center',color:'var(--muted)',fontSize:13}}>
                  No transactions found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {showForm && <Modal title="Add Transaction" onClose={()=>setShowForm(false)}>
        <TxForm month={month} onSave={addTx} onCancel={()=>setShowForm(false)}/>
      </Modal>}

      {/* Edit modal */}
      {editTx && <Modal title="Edit Transaction" onClose={()=>setEditTx(null)}>
        <TxForm initial={editTx} month={month} onSave={updateTx} onCancel={()=>setEditTx(null)}/>
      </Modal>}
    </div>
  );
};

// ── Budgets Screen ─────────────────────────────────────────────────────
const Budgets = ({ state, setState, showToast }) => {
  const [budgets, setBudgets] = React.useState({...state.budgets});
  const month = state.selectedMonth;
  const txs   = state.transactions.filter(t=>t.date.startsWith(month)&&t.type==='expense');

  const spentBy = cat => txs.filter(t=>t.category===cat).reduce((s,t)=>s+t.amount,0);

  const save = () => {
    const next = { ...state, budgets };
    setState(next); saveState(next); showToast('Budgets saved');
  };

  return (
    <div style={{padding:'26px 30px',overflowY:'auto',height:'100%',display:'flex',flexDirection:'column',gap:20}} className="fade-up">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1 style={{fontFamily:'Syne',fontSize:22,fontWeight:700,marginBottom:3}}>Budgets</h1>
          <p style={{color:'var(--text2)',fontSize:13}}>Monthly limits per category</p>
        </div>
        <button onClick={save} style={{
          padding:'9px 20px',borderRadius:100,border:'none',cursor:'pointer',
          background:'var(--accent)',color:'white',fontFamily:'DM Sans',fontWeight:600,fontSize:13,
        }}>Save Budgets</button>
      </div>

      {/* Progress rings */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'24px 28px'}}>
        <h3 style={{fontFamily:'Syne',fontWeight:700,fontSize:14,marginBottom:20}}>Monthly Progress</h3>
        <div style={{display:'flex',gap:24,flexWrap:'wrap',justifyContent:'center'}}>
          {CATEGORIES.map(cat=>(
            <BudgetRing key={cat} label={cat} spent={spentBy(cat)} budget={Number(budgets[cat]||0)}/>
          ))}
        </div>
      </div>

      {/* Budget inputs */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'24px 28px'}}>
        <h3 style={{fontFamily:'Syne',fontWeight:700,fontSize:14,marginBottom:18}}>Set Limits</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
          {CATEGORIES.map((cat,i)=>{
            const spent  = spentBy(cat);
            const budget = Number(budgets[cat]||0);
            const over   = budget>0&&spent>budget;
            return (
              <div key={cat}>
                <label style={{...bbLabelSt,color:CAT_COLORS[i]}}>
                  {cat} {over&&<span style={{color:'var(--red)',fontStyle:'normal',textTransform:'none',letterSpacing:0,fontWeight:400}}>· over by {fmt(spent-budget)}</span>}
                </label>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{color:'var(--text2)',fontSize:16,flexShrink:0}}>$</span>
                  <input type="number" min="0" step="10"
                    value={budgets[cat]||''} placeholder="0"
                    onChange={e=>setBudgets(b=>({...b,[cat]:e.target.value}))}
                    style={{...bbInputSt,paddingLeft:8}}/>
                  <span style={{fontSize:12,color:'var(--text2)',flexShrink:0,minWidth:70,textAlign:'right'}}>
                    {fmt(spent)} spent
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Sidebar ────────────────────────────────────────────────────────────
const BBNav = [
  {id:'dashboard',   label:'Dashboard',    icon:'grid'},
  {id:'transactions',label:'Transactions', icon:'list'},
  {id:'budgets',     label:'Budgets',      icon:'wallet'},
];

const BBSidebar = ({ screen, onNav, state, setState, showToast }) => {
  const month   = state.selectedMonth;
  const txs     = state.transactions.filter(t=>t.date.startsWith(month));
  const income  = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  const setMonth = (m) => {
    const next = {...state, selectedMonth:m};
    setState(next); saveState(next);
  };

  const loadDemo = () => {
    const d = demoData(month);
    const next = {...state, transactions:[...d.transactions,...state.transactions.filter(t=>!t.date.startsWith(month))], budgets:d.budgets};
    setState(next); saveState(next); showToast('Demo data loaded');
  };

  const exportCsv = () => {
    if (!state.transactions.length) { showToast('No data to export','error'); return; }
    const rows = state.transactions.map(t=>[`"${t.description}"`,t.category,t.type,t.date,t.amount].join(','));
    const csv  = ['description,category,type,date,amount',...rows].join('\n');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `budgetbuddy-${month}.csv`;
    a.click();
    showToast('CSV exported');
  };

  return (
    <div style={{
      width:216,flexShrink:0,background:'var(--surface)',
      borderRight:'1px solid var(--border)',
      display:'flex',flexDirection:'column',padding:'24px 14px',gap:3,
    }}>
      {/* Logo */}
      <div style={{display:'flex',alignItems:'center',gap:10,paddingLeft:8,paddingBottom:24}}>
        <div style={{width:32,height:32,borderRadius:9,background:'var(--accent-d)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <BBIcon name="wallet" size={16} color="var(--accent)"/>
        </div>
        <span style={{fontFamily:'Syne',fontWeight:700,fontSize:15,letterSpacing:'-0.01em'}}>BudgetBuddy</span>
      </div>

      {/* Month picker */}
      <div style={{padding:'8px 12px',marginBottom:8}}>
        <label style={{...bbLabelSt,marginBottom:5}}>Month</label>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
          style={{...bbInputSt,fontSize:13,padding:'8px 10px'}}/>
      </div>

      {/* Nav */}
      {BBNav.map(item=>{
        const on = screen===item.id;
        return (
          <button key={item.id} onClick={()=>onNav(item.id)} style={{
            display:'flex',alignItems:'center',gap:10,
            padding:'9px 11px',borderRadius:10,border:'none',cursor:'pointer',
            background:on?'var(--accent-d)':'transparent',
            color:on?'var(--accent-l)':'var(--text2)',
            fontFamily:'DM Sans',fontWeight:on?600:400,fontSize:14,
            borderLeft:on?'2px solid var(--accent)':'2px solid transparent',
            transition:'all .15s',textAlign:'left',
          }}>
            <BBIcon name={item.icon} size={16} color={on?'var(--accent)':'var(--muted)'}/>
            {item.label}
          </button>
        );
      })}

      <div style={{flex:1}}/>

      {/* Month summary */}
      <div style={{
        background:'var(--surface2)',border:'1px solid var(--border)',
        borderRadius:12,padding:'14px',marginBottom:10,
      }}>
        <div style={{fontSize:11,color:'var(--text2)',marginBottom:8,fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase'}}>This month</div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
          <span style={{fontSize:12,color:'var(--text2)'}}>In</span>
          <span style={{fontSize:13,fontWeight:700,fontFamily:'Syne',color:'var(--green)'}}>{fmt(income)}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <span style={{fontSize:12,color:'var(--text2)'}}>Out</span>
          <span style={{fontSize:13,fontWeight:700,fontFamily:'Syne',color:'var(--red)'}}>{fmt(expense)}</span>
        </div>
      </div>

      {/* Utils */}
      <button onClick={loadDemo} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:10,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',color:'var(--text2)',fontSize:13,fontWeight:500,transition:'all .15s',marginBottom:6}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--text)';}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text2)';}}
      >
        <BBIcon name="coin" size={14} color="var(--amber)"/> Load demo
      </button>
      <button onClick={exportCsv} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:10,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',color:'var(--text2)',fontSize:13,fontWeight:500,transition:'all .15s'}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--text)';}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text2)';}}
      >
        <BBIcon name="export" size={14} color="var(--accent)"/> Export CSV
      </button>
    </div>
  );
};

// ── Toast Manager ──────────────────────────────────────────────────────
const useToasts = () => {
  const [toasts, setToasts] = React.useState([]);
  const show = (msg, type='success') => {
    const id = Date.now();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2800);
  };
  return [toasts, show];
};

// ── Tweaks ─────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{"accentColor":"#10b981","bgColor":"#05080f"}/*EDITMODE-END*/;

// ── App ────────────────────────────────────────────────────────────────
const BBApp = () => {
  const [screen,  setScreen]  = React.useState(()=>localStorage.getItem('bb_screen')||'dashboard');
  const [state,   setState]   = React.useState(loadState);
  const [tweaks,  setTweaks]  = React.useState(TWEAK_DEFAULTS);
  const [showTweaks, setShowTweaks] = React.useState(false);
  const [toasts,  showToast]  = useToasts();

  const nav = s => { setScreen(s); localStorage.setItem('bb_screen',s); };

  React.useEffect(()=>{
    document.documentElement.style.setProperty('--accent', tweaks.accentColor);
    document.documentElement.style.setProperty('--accent-l', tweaks.accentColor+'dd');
    document.documentElement.style.setProperty('--accent-d', tweaks.accentColor+'1e');
    document.documentElement.style.setProperty('--bg', tweaks.bgColor);
  },[tweaks]);

  React.useEffect(()=>{
    const h = e => {
      if (e.data?.type==='__activate_edit_mode')   setShowTweaks(true);
      if (e.data?.type==='__deactivate_edit_mode') setShowTweaks(false);
    };
    window.addEventListener('message',h);
    window.parent.postMessage({type:'__edit_mode_available'},'*');
    return ()=>window.removeEventListener('message',h);
  },[]);

  const applyTweak = (k,v) => {
    const next = {...tweaks,[k]:v};
    setTweaks(next);
    window.parent.postMessage({type:'__edit_mode_set_keys',edits:next},'*');
  };

  const screenProps = { state, setState, showToast };

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <BBSidebar screen={screen} onNav={nav} {...screenProps}/>
      <div style={{flex:1,overflow:'hidden'}}>
        {screen==='dashboard'    && <Dashboard    {...screenProps} onNav={nav}/>}
        {screen==='transactions' && <Transactions {...screenProps}/>}
        {screen==='budgets'      && <Budgets      {...screenProps}/>}
      </div>

      {/* Toasts */}
      <div style={{position:'fixed',bottom:24,right:24,display:'flex',flexDirection:'column',gap:10,zIndex:9997,pointerEvents:'none'}}>
        {toasts.map(t=><Toast key={t.id} msg={t.msg} type={t.type}/>)}
      </div>

      {/* Tweaks */}
      {showTweaks && (
        <div style={{
          position:'fixed',bottom:24,right:24,zIndex:9999,
          background:'var(--surface)',border:'1px solid var(--border2)',
          borderRadius:16,padding:'20px',width:230,
          boxShadow:'0 12px 48px rgba(0,0,0,0.6)',
        }}>
          <div style={{fontFamily:'Syne',fontWeight:700,fontSize:14,marginBottom:16}}>Tweaks</div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <label style={{...bbLabelSt,marginBottom:8}}>Accent Color</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {['#10b981','#a78bfa','#60a5fa','#f472b6','#fb923c','#facc15'].map(c=>(
                  <button key={c} onClick={()=>applyTweak('accentColor',c)} style={{
                    width:26,height:26,borderRadius:'50%',
                    border:`2px solid ${tweaks.accentColor===c?'white':'transparent'}`,
                    background:c,cursor:'pointer',
                  }}/>
                ))}
              </div>
            </div>
            <div>
              <label style={{...bbLabelSt,marginBottom:8}}>Background</label>
              <div style={{display:'flex',gap:8}}>
                {['#05080f','#050c14','#0a050d','#0c0a05'].map(c=>(
                  <button key={c} onClick={()=>applyTweak('bgColor',c)} style={{
                    width:26,height:26,borderRadius:6,
                    border:`2px solid ${tweaks.bgColor===c?'var(--accent)':'var(--border)'}`,
                    background:c,cursor:'pointer',
                  }}/>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<BBApp/>);
