'use client'

import { useState, useEffect } from "react";

interface Transaction {
  id: number; date: string; desc: string;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  category: string; amount: number;
  fromAccount: string; toAccount: string;
}
interface Balances { checking: number; savings: number; brokerage: number; roth: number; }
interface State { transactions: Transaction[]; balances: Balances; }

const ACCT_KEYS: Record<string, keyof Balances> = {
  "Checking": "checking",
  "Savings": "savings",
  "Vanguard Brokerage": "brokerage",
  "Vanguard Roth IRA": "roth",
};
const ACCOUNTS = Object.keys(ACCT_KEYS);
const CASH_ACCOUNTS = ["Checking", "Savings"];

const EXPENSE_CATS = [
  "Food & Beverages",
  "Alcohol",
  "Bars & Entertainment",
  "Coffee & Cafes",
  "Gas",
  "Groceries",
  "Shopping",
  "Clothing",
  "Amazon",
  "Vacation & Travel",
  "Gym & Fitness",
  "Subscriptions",
  "Personal Care",
  "Venmo",
  "Cash",
  "Other",
];

const INCOME_CATS = ["CACI", "Rec Center", "Venmo Received", "Other Income"];
const INVEST_CATS = ["Vanguard Brokerage", "Vanguard Roth IRA"];

const CATS: Record<string, string[]> = {
  income: INCOME_CATS,
  expense: EXPENSE_CATS,
  transfer: ["Account Transfer"],
  investment: INVEST_CATS,
};

const CAT_EMOJI: Record<string, string> = {
  "Food & Beverages": "🍔", "Alcohol": "🍺", "Bars & Entertainment": "🎉",
  "Coffee & Cafes": "☕", "Gas": "⛽", "Groceries": "🛒", "Shopping": "🛍️",
  "Clothing": "👟", "Amazon": "📦", "Vacation & Travel": "✈️",
  "Gym & Fitness": "💪", "Subscriptions": "📱", "Personal Care": "🪥",
  "Venmo": "💸", "Cash": "💵", "Other": "•",
  "CACI": "💼", "Rec Center": "🏊", "Venmo Received": "💸", "Other Income": "💰",
  "Vanguard Brokerage": "📈", "Vanguard Roth IRA": "🏦", "Account Transfer": "⇄",
};

const DEFAULT: State = {
  transactions: [
    { id: 1, date: "2026-06-01", desc: "Shell Oil", type: "expense", category: "Gas", amount: 5.43, fromAccount: "Checking", toAccount: "" },
  ],
  balances: { checking: 198.93, savings: 2208.84, brokerage: 6464.35, roth: 16771.44 },
};

const C = {
  bg: "#0d1117", surface: "#161b22", high: "#1f2937", border: "#30363d",
  teal: "#00d4aa", amber: "#f59e0b", red: "#ef4444", blue: "#60a5fa",
  purple: "#a78bfa", green: "#34d399", text: "#f0f6fc", muted: "#8b949e", dim: "#484f58",
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(n: number) { return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtK(n: number) { return n >= 1000 ? "$" + (n / 1000).toFixed(1) + "k" : fmt(n); }

function applyTx(bal: Balances, tx: Transaction, reverse = false): Balances {
  const b = { ...bal };
  const s = reverse ? -1 : 1;
  const from = ACCT_KEYS[tx.fromAccount];
  const to = ACCT_KEYS[tx.toAccount];
  if (tx.type === "income" && to) b[to] = +(b[to] + s * tx.amount).toFixed(2);
  else if (tx.type === "expense" && from) b[from] = +(b[from] - s * tx.amount).toFixed(2);
  else if ((tx.type === "transfer" || tx.type === "investment")) {
    if (from) b[from] = +(b[from] - s * tx.amount).toFixed(2);
    if (to) b[to] = +(b[to] + s * tx.amount).toFixed(2);
  }
  return b;
}

const inp: React.CSSProperties = { background: C.high, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, width: "100%", outline: "none" };
const lbl: React.CSSProperties = { color: C.dim, fontSize: 11, marginBottom: 4, display: "block" };

export default function Dashboard() {
  const [state, setState] = useState<State>(DEFAULT);
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(5);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [addType, setAddType] = useState<Transaction["type"]>("expense");
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [cat, setCat] = useState("Food & Beverages");
  const [fromAcct, setFromAcct] = useState("Checking");
  const [toAcct, setToAcct] = useState("Checking");
  const [mainTab, setMainTab] = useState("calendar");
  const [editId, setEditId] = useState<number | null>(null);
  const [ef, setEf] = useState({ desc: "", amt: "", cat: "", from: "", to: "" });
  const [filterCat, setFilterCat] = useState("All");
  const [filterType, setFilterType] = useState("All");

  useEffect(() => {
    try { const s = localStorage.getItem("ashton_v8"); if (s) setState(JSON.parse(s)); } catch(e) {}
  }, []);

  function save(s: State) { setState(s); try { localStorage.setItem("ashton_v8", JSON.stringify(s)); } catch(e) {} }

  const today = new Date();
  const thisMonthPrefix = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
  const monthTx = state.transactions.filter(t => t.date.startsWith(thisMonthPrefix));
  const monthIncome = monthTx.filter(t => t.type==="income").reduce((a,t) => a+t.amount, 0);
  const monthSpent = monthTx.filter(t => t.type==="expense").reduce((a,t) => a+t.amount, 0);
  const monthInvest = monthTx.filter(t => t.type==="investment").reduce((a,t) => a+t.amount, 0);
  const nw = state.balances.checking + state.balances.savings + state.balances.brokerage + state.balances.roth;
  const leftover = monthIncome - monthSpent - monthInvest;

  // Spend by category this month
  const spendByCat: Record<string, number> = {};
  monthTx.filter(t => t.type==="expense").forEach(t => { spendByCat[t.category] = (spendByCat[t.category]||0) + t.amount; });

  const viewPrefix = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;
  const txByDay: Record<number, Transaction[]> = {};
  state.transactions.filter(t => t.date.startsWith(viewPrefix)).forEach(t => {
    const d = parseInt(t.date.split("-")[2]);
    if (!txByDay[d]) txByDay[d] = [];
    txByDay[d].push(t);
  });
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const selDateStr = selectedDay ? `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}` : "";
  const selTxs = state.transactions.filter(t => t.date === selDateStr);

  function changeType(t: Transaction["type"]) {
    setAddType(t);
    setCat(CATS[t][0]);
    if (t==="income") { setToAcct("Checking"); }
    if (t==="expense") { setFromAcct("Checking"); }
    if (t==="transfer") { setFromAcct("Savings"); setToAcct("Checking"); }
    if (t==="investment") { setFromAcct("Checking"); setToAcct("Vanguard Brokerage"); }
  }

  function addTx() {
    if (!desc.trim() || !amt || parseFloat(amt) <= 0) return;
    const amount = parseFloat(parseFloat(amt).toFixed(2));
    const newTx: Transaction = {
      id: Date.now(), date: selDateStr, desc: desc.trim(), type: addType, category: cat, amount,
      fromAccount: addType==="income" ? "" : fromAcct,
      toAccount: addType==="expense" ? "" : toAcct,
    };
    save({ transactions: [newTx, ...state.transactions], balances: applyTx(state.balances, newTx) });
    setDesc(""); setAmt("");
  }

  function deleteTx(id: number) {
    const tx = state.transactions.find(t => t.id===id);
    if (!tx) return;
    save({ transactions: state.transactions.filter(t => t.id!==id), balances: applyTx(state.balances, tx, true) });
    if (editId===id) setEditId(null);
  }

  function startEdit(t: Transaction) {
    setEditId(t.id);
    setEf({ desc: t.desc, amt: String(t.amount), cat: t.category, from: t.fromAccount, to: t.toAccount });
  }

  function saveEdit(id: number) {
    const old = state.transactions.find(t => t.id===id);
    if (!old) return;
    const updated: Transaction = { ...old, desc: ef.desc, amount: parseFloat(parseFloat(ef.amt).toFixed(2)), category: ef.cat, fromAccount: ef.from, toAccount: ef.to };
    let bal = applyTx(state.balances, old, true);
    bal = applyTx(bal, updated);
    save({ transactions: state.transactions.map(t => t.id===id ? updated : t), balances: bal });
    setEditId(null);
  }

  function changeMonth(dir: number) {
    let m = viewMonth+dir, y = viewYear;
    if (m>11){m=0;y++;} if(m<0){m=11;y--;}
    setViewMonth(m); setViewYear(y); setSelectedDay(null);
  }

  const typeColor = addType==="income" ? C.green : addType==="transfer" ? C.amber : addType==="investment" ? C.blue : C.red;
  const txColor = (t: Transaction) => t.type==="income" ? C.green : t.type==="transfer" ? C.amber : t.type==="investment" ? C.blue : C.red;

  function AccountPicker({ mode, val, set }: { mode: "from"|"to"; val: string; set: (v:string)=>void }) {
    const accounts = addType==="investment" && mode==="to" ? ["Vanguard Brokerage","Vanguard Roth IRA"] :
                     addType==="investment" && mode==="from" ? CASH_ACCOUNTS :
                     addType==="transfer" ? ACCOUNTS : ACCOUNTS;
    return (
      <div>
        <span style={lbl}>{mode==="from" ? "Money leaves from" : "Money goes into"}</span>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {accounts.map(a => (
            <button key={a} onClick={() => set(a)}
              style={{ padding:"5px 10px", borderRadius:7, border:`1px solid ${val===a ? typeColor : C.border}`, background: val===a ? `${typeColor}22` : "transparent", color: val===a ? typeColor : C.muted, fontSize:11, cursor:"pointer", fontWeight: val===a ? 700 : 400 }}>
              {a}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function AddForm() {
    return (
      <div>
        {/* Type tabs */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:5, marginBottom:14 }}>
          {(["expense","income","transfer","investment"] as const).map(t => (
            <button key={t} onClick={() => changeType(t)}
              style={{ padding:"7px 0", borderRadius:8, border:`1px solid ${addType===t ? typeColor : C.border}`, background: addType===t ? `${typeColor}22` : "transparent", color: addType===t ? typeColor : C.muted, fontSize:11, cursor:"pointer", fontWeight: addType===t ? 700 : 400 }}>
              {t==="expense" ? "− Expense" : t==="income" ? "+ Income" : t==="transfer" ? "⇄ Transfer" : "↑ Invest"}
            </button>
          ))}
        </div>

        {/* Description */}
        <div style={{ marginBottom:8 }}>
          <span style={lbl}>Description</span>
          <input value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder={addType==="income" ? "e.g. CACI paycheck" : addType==="expense" ? "e.g. Chipotle, Spotify, Shell" : addType==="transfer" ? "e.g. Savings → Checking" : "e.g. Monthly Vanguard contribution"}
            style={inp} onKeyDown={e=>e.key==="Enter"&&addTx()} />
        </div>

        {/* Amount */}
        <div style={{ marginBottom:10 }}>
          <span style={lbl}>Amount ($)</span>
          <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0.00" step="0.01" style={inp} onKeyDown={e=>e.key==="Enter"&&addTx()} />
        </div>

        {/* Category — not shown for transfer */}
        {addType !== "transfer" && (
          <div style={{ marginBottom:10 }}>
            <span style={lbl}>Category</span>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {CATS[addType].map(c => (
                <button key={c} onClick={() => setCat(c)}
                  style={{ padding:"4px 10px", borderRadius:99, border:`1px solid ${cat===c ? typeColor : C.border}`, background: cat===c ? `${typeColor}22` : "transparent", color: cat===c ? typeColor : C.muted, fontSize:11, cursor:"pointer", fontWeight: cat===c ? 700 : 400 }}>
                  {CAT_EMOJI[c]} {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Account routing */}
        <div style={{ marginBottom:12, display:"flex", flexDirection:"column", gap:10 }}>
          {addType !== "income" && <AccountPicker mode="from" val={fromAcct} set={setFromAcct} />}
          {addType !== "expense" && <AccountPicker mode="to" val={toAcct} set={setToAcct} />}
        </div>

        <button onClick={addTx}
          style={{ width:"100%", padding:"10px", borderRadius:9, border:"none", background:typeColor, color:"#0d1117", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          Add {addType}
        </button>
      </div>
    );
  }

  function TxCard({ t, compact=false }: { t: Transaction; compact?: boolean }) {
    const acctNote = t.type==="income" ? `→ ${t.toAccount}` : t.type==="expense" ? `${t.fromAccount}` : `${t.fromAccount} → ${t.toAccount}`;
    if (editId===t.id) return (
      <div style={{ background:C.high, borderRadius:10, padding:12, marginBottom:8 }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8, marginBottom:8 }}>
          <div><span style={lbl}>Description</span><input value={ef.desc} onChange={e=>setEf(f=>({...f,desc:e.target.value}))} style={inp}/></div>
          <div><span style={lbl}>Amount</span><input type="number" value={ef.amt} onChange={e=>setEf(f=>({...f,amt:e.target.value}))} style={inp}/></div>
        </div>
        {t.type!=="transfer" && (
          <div style={{ marginBottom:8 }}>
            <span style={lbl}>Category</span>
            <select value={ef.cat} onChange={e=>setEf(f=>({...f,cat:e.target.value}))} style={inp}>
              {CATS[t.type].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        )}
        {t.type!=="income" && (
          <div style={{ marginBottom:8 }}>
            <span style={lbl}>From account</span>
            <select value={ef.from} onChange={e=>setEf(f=>({...f,from:e.target.value}))} style={inp}>
              {ACCOUNTS.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
        )}
        {t.type!=="expense" && (
          <div style={{ marginBottom:8 }}>
            <span style={lbl}>To account</span>
            <select value={ef.to} onChange={e=>setEf(f=>({...f,to:e.target.value}))} style={inp}>
              {ACCOUNTS.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>saveEdit(t.id)} style={{ flex:1, padding:"7px", borderRadius:7, border:"none", background:C.teal, color:C.bg, fontWeight:700, fontSize:13, cursor:"pointer" }}>Save</button>
          <button onClick={()=>setEditId(null)} style={{ flex:1, padding:"7px", borderRadius:7, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, fontSize:13, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
    return (
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding: compact ? "7px 0" : "9px 0", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>{CAT_EMOJI[t.category]||"•"}</span>
          <div>
            <div style={{ fontWeight:500, fontSize:13 }}>{t.desc}</div>
            <div style={{ color:C.dim, fontSize:11 }}>{t.category} · {acctNote} · {t.date}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontWeight:700, fontSize:14, color:txColor(t) }}>{t.type==="income"?"+":t.type==="transfer"?"⇄":"-"}{fmt(t.amount)}</span>
          <button onClick={()=>startEdit(t)} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, color:C.muted, cursor:"pointer", fontSize:11, padding:"2px 7px" }}>edit</button>
          <button onClick={()=>deleteTx(t.id)} style={{ background:"transparent", border:"none", color:C.dim, cursor:"pointer", fontSize:16, lineHeight:1 }}>✕</button>
        </div>
      </div>
    );
  }

  // Filtered transactions
  const allSorted = [...state.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  const filtered = allSorted.filter(t =>
    (filterType==="All" || t.type===filterType) &&
    (filterCat==="All" || t.category===filterCat)
  );

  const WEEKLY_PLAN = [
    { day:"Monday", focus:"SQL", color:C.blue, time:"6:30–8:00 PM",
      tasks:["30 min: SQLZoo tutorial","30 min: Mode SQL business queries","Review query from last session"],
      links:[["SQLZoo","https://sqlzoo.net"],["Mode SQL","https://mode.com/sql-tutorial"],["LeetCode SQL","https://leetcode.com/problemset/database/"]]},
    { day:"Tuesday", focus:"Python", color:C.purple, time:"6:30–8:00 PM",
      tasks:["30 min: py4e.com current chapter","30 min: Kaggle exercises","Write one function from scratch"],
      links:[["py4e.com","https://py4e.com"],["Kaggle Python","https://kaggle.com/learn/python"],["Kaggle Pandas","https://kaggle.com/learn/pandas"]]},
    { day:"Wednesday", focus:"Power BI", color:C.teal, time:"6:30–8:30 PM",
      tasks:["45 min: MS Learn PL-300 module","45 min: Guy in a Cube tutorial","Build or update one visual"],
      links:[["MS Learn PL-300","https://learn.microsoft.com/en-us/certifications/exams/pl-300"],["Guy in a Cube","https://youtube.com/@GuyInACube"],["Tableau Public","https://public.tableau.com"]]},
    { day:"Thursday", focus:"Project", color:C.amber, time:"6:30–8:30 PM",
      tasks:["Work on current portfolio project","Push code to GitHub","Update LinkedIn if milestone hit"],
      links:[["GitHub","https://github.com"],["StrataScratch","https://stratascratch.com"],["DataLemur","https://datalemur.com"]]},
    { day:"Friday", focus:"OFF 🎉", color:C.dim, time:"Evening off",
      tasks:["Social time — non-negotiable","BFN events / going out","No studying"],
      links:[]},
    { day:"Saturday", focus:"OFF 🎉", color:C.dim, time:"All day off",
      tasks:["Full rest and recharge","Social time with friends","Consistency beats burnout"],
      links:[]},
    { day:"Sunday", focus:"SQL or Python", color:C.green, time:"9:00–11:00 AM",
      tasks:["2 hrs free study before work","Review week or get ahead","2:00–8:00 PM: Rec Center"],
      links:[["SQLZoo","https://sqlzoo.net"],["py4e.com","https://py4e.com"],["Real Python","https://realpython.com"]]},
  ];

  const PHASES = [
    { phase:"Phase 1", title:"SQL Foundation", months:"Months 1–3", color:C.teal, status:"active",
      project:"SQL Sales Dashboard — query retail dataset, answer 10 business questions",
      skills:["SELECT, WHERE, GROUP BY, JOINs","Window functions, CTEs, subqueries","LeetCode SQL easy → medium"],
      links:[["SQLZoo","https://sqlzoo.net"],["Mode SQL","https://mode.com/sql-tutorial"],["LeetCode SQL","https://leetcode.com/problemset/database/"],["StrataScratch","https://stratascratch.com"]]},
    { phase:"Phase 2", title:"Python for Data", months:"Months 4–6", color:C.blue, status:"upcoming",
      project:"Python Finance Analyzer — yfinance stock data, calculate returns, visualize",
      skills:["Python basics, pandas","matplotlib/seaborn charts","yfinance for financial data"],
      links:[["py4e.com","https://py4e.com"],["Kaggle Python","https://kaggle.com/learn/python"],["Kaggle Pandas","https://kaggle.com/learn/pandas"],["Real Python","https://realpython.com"]]},
    { phase:"Phase 3", title:"Power BI / Tableau", months:"Months 7–9", color:C.purple, status:"upcoming",
      project:"End-to-end BI Report — SQL → Power BI → publish to Tableau Public",
      skills:["Interactive dashboards","DAX basics","PL-300 cert target month 8–9"],
      links:[["MS Learn PL-300","https://learn.microsoft.com/en-us/certifications/exams/pl-300"],["Guy in a Cube","https://youtube.com/@GuyInACube"],["Tableau Public","https://public.tableau.com"],["Power BI Desktop","https://powerbi.microsoft.com/desktop"]]},
    { phase:"Phase 4", title:"Job Search", months:"Months 10–12", color:C.amber, status:"upcoming",
      project:"50+ apps Jan–Mar 2027 — Capital One, Booz Allen, Deloitte, MITRE",
      skills:["GitHub: 3 polished projects","Resume with impact metrics","Aug 2026 = new grad apps open"],
      links:[["DataLemur","https://datalemur.com"],["Levels.fyi","https://levels.fyi"],["LinkedIn","https://linkedin.com"],["Glassdoor","https://glassdoor.com"]]},
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Inter',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom:`1px solid ${C.border}`, padding:"0 16px" }}>
        <div style={{ maxWidth:980, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:52 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:`linear-gradient(135deg,${C.teal},${C.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>💰</div>
            <span style={{ fontWeight:700, fontSize:15 }}>Ashton&apos;s Finance</span>
          </div>
          <div style={{ fontWeight:700, color:C.teal, fontSize:18 }}>{fmtK(nw)}</div>
        </div>
        <div style={{ maxWidth:980, margin:"0 auto", display:"flex", gap:2 }}>
          {["calendar","transactions","career"].map(t=>(
            <button key={t} onClick={()=>setMainTab(t)} style={{ padding:"7px 14px", border:"none", background:"transparent", color:mainTab===t?C.teal:C.muted, borderBottom:`2px solid ${mainTab===t?C.teal:"transparent"}`, cursor:"pointer", fontSize:13, fontWeight:mainTab===t?600:400, textTransform:"capitalize", marginBottom:-1 }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:980, margin:"0 auto", padding:"16px" }}>

        {/* Metric strip */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:8, marginBottom:14 }}>
          {[
            { label:"Net worth", val:fmtK(nw), color:C.teal },
            { label:"Income this mo", val:fmt(monthIncome), color:C.green },
            { label:"Spent this mo", val:fmt(monthSpent), color:C.red },
            { label:"Left over", val:fmt(leftover), color:leftover>=0?C.green:C.red },
            { label:"Invested", val:fmt(monthInvest), color:C.blue },
            { label:"Checking", val:fmt(state.balances.checking), color:C.text },
            { label:"Savings", val:fmt(state.balances.savings), color:C.text },
          ].map(m=>(
            <div key={m.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ color:C.dim, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{m.label}</div>
              <div style={{ color:m.color, fontSize:17, fontWeight:700 }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* ── CALENDAR ── */}
        {mainTab==="calendar" && (
          <div style={{ display:"grid", gridTemplateColumns:selectedDay?"1fr 340px":"1fr", gap:14, alignItems:"start" }}>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <button onClick={()=>changeMonth(-1)} style={{ background:C.high, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 14px", color:C.text, cursor:"pointer", fontSize:18 }}>‹</button>
                <div style={{ fontWeight:600, fontSize:15 }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
                <button onClick={()=>changeMonth(1)} style={{ background:C.high, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 14px", color:C.text, cursor:"pointer", fontSize:18 }}>›</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{ textAlign:"center", fontSize:11, color:C.muted, padding:"3px 0", fontWeight:600 }}>{d}</div>)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
                {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
                  const isToday=d===today.getDate()&&viewMonth===today.getMonth()&&viewYear===today.getFullYear();
                  const isSel=d===selectedDay;
                  const dayTxs=txByDay[d]||[];
                  const inc=dayTxs.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
                  const exp=dayTxs.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
                  const inv=dayTxs.filter(t=>t.type==="investment").length;
                  const tr=dayTxs.filter(t=>t.type==="transfer").length;
                  return (
                    <div key={d} onClick={()=>setSelectedDay(selectedDay===d?null:d)}
                      style={{ minHeight:58, borderRadius:8, border:`1px solid ${isSel?C.teal:isToday?C.blue:C.border}`, padding:"4px 5px", cursor:"pointer", background:isSel?`${C.teal}18`:isToday?`${C.blue}12`:C.high }}>
                      <div style={{ fontSize:11, color:isToday?C.blue:isSel?C.teal:C.muted, fontWeight:isToday||isSel?700:400, marginBottom:3 }}>{d}</div>
                      {inc>0&&<div style={{ fontSize:9, background:`${C.green}22`, color:C.green, borderRadius:4, padding:"1px 3px", fontWeight:600, marginBottom:2 }}>+{fmt(inc)}</div>}
                      {exp>0&&<div style={{ fontSize:9, background:`${C.red}22`, color:C.red, borderRadius:4, padding:"1px 3px", fontWeight:600, marginBottom:2 }}>-{fmt(exp)}</div>}
                      {inv>0&&<div style={{ fontSize:9, background:`${C.blue}22`, color:C.blue, borderRadius:4, padding:"1px 3px", fontWeight:600, marginBottom:2 }}>↑inv</div>}
                      {tr>0&&<div style={{ fontSize:9, background:`${C.amber}22`, color:C.amber, borderRadius:4, padding:"1px 3px", fontWeight:600 }}>⇄</div>}
                    </div>
                  );
                })}
              </div>

              {/* This month spending breakdown */}
              {Object.keys(spendByCat).length > 0 && (
                <div style={{ marginTop:16, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
                  <div style={{ color:C.dim, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>This month&apos;s spending</div>
                  {Object.entries(spendByCat).sort((a,b)=>b[1]-a[1]).map(([c,a])=>(
                    <div key={c} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ color:C.muted, fontSize:12 }}>{CAT_EMOJI[c]} {c}</span>
                      <span style={{ color:C.red, fontWeight:600, fontSize:12 }}>{fmt(a)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Day panel */}
            {selectedDay && (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:16, position:"sticky", top:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div style={{ fontWeight:700, fontSize:15 }}>{MONTH_SHORT[viewMonth]} {selectedDay}</div>
                  <button onClick={()=>setSelectedDay(null)} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:20 }}>✕</button>
                </div>
                <AddForm/>
                {selTxs.length > 0 && (
                  <div style={{ marginTop:16, borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
                    <div style={{ color:C.dim, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Logged today</div>
                    {selTxs.map(t=><TxCard key={t.id} t={t} compact/>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {mainTab==="transactions" && (
          <div>
            {/* Account balances */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8, marginBottom:14 }}>
              {[
                { label:"Checking", val:state.balances.checking, color:C.blue },
                { label:"Savings", val:state.balances.savings, color:C.green },
                { label:"Vanguard Brokerage", val:state.balances.brokerage, color:C.purple },
                { label:"Vanguard Roth IRA", val:state.balances.roth, color:C.purple },
              ].map(a=>(
                <div key={a.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ color:C.dim, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{a.label}</div>
                  <div style={{ color:a.color, fontWeight:700, fontSize:20 }}>{fmt(a.val)}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
              <div>
                <span style={lbl}>Type</span>
                <div style={{ display:"flex", gap:5 }}>
                  {["All","income","expense","transfer","investment"].map(f=>(
                    <button key={f} onClick={()=>setFilterType(f)}
                      style={{ padding:"5px 10px", borderRadius:7, border:`1px solid ${filterType===f?C.teal:C.border}`, background:filterType===f?`${C.teal}22`:"transparent", color:filterType===f?C.teal:C.muted, fontSize:11, cursor:"pointer", fontWeight:filterType===f?700:400, textTransform:"capitalize" }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
              <div style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>
                {filtered.length} transactions {filterType!=="All"||filterCat!=="All" ? "(filtered)" : ""}
              </div>
              {filtered.length===0 && <div style={{ color:C.dim, fontSize:13 }}>No transactions match — tap a day on the calendar to add one.</div>}
              {filtered.map(t=><TxCard key={t.id} t={t}/>)}
            </div>
          </div>
        )}

        {/* ── CAREER ── */}
        {mainTab==="career" && (
          <div>
            <div style={{ background:C.surface, border:`1px solid ${C.teal}`, borderRadius:12, padding:16, marginBottom:14 }}>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>FinTech Career Roadmap</div>
              <div style={{ color:C.muted, fontSize:13 }}>Spring 2027 · $90–115K · Capital One · Booz Allen · Deloitte · MITRE</div>
              <div style={{ color:C.dim, fontSize:12, marginTop:4 }}>CACI 7AM–3PM · Gym 3:30–5:30PM · Study 6:30PM · Fri/Sat protected</div>
            </div>

            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:14 }}>
              <div style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12 }}>Weekly study schedule</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(115px,1fr))", gap:8 }}>
                {WEEKLY_PLAN.map((w,i)=>(
                  <div key={i} style={{ background:C.high, borderRadius:10, padding:"10px 12px", borderTop:`3px solid ${w.color}` }}>
                    <div style={{ color:w.color, fontWeight:700, fontSize:12, marginBottom:2 }}>{w.day}</div>
                    <div style={{ color:C.text, fontSize:11, fontWeight:600, marginBottom:3 }}>{w.focus}</div>
                    <div style={{ color:C.dim, fontSize:10, marginBottom:8 }}>{w.time}</div>
                    {w.tasks.map((task,j)=><div key={j} style={{ color:C.muted, fontSize:10, marginBottom:4, paddingLeft:8, borderLeft:`2px solid ${w.color}44` }}>{task}</div>)}
                    {w.links.length>0&&(
                      <div style={{ marginTop:8, borderTop:`1px solid ${C.border}`, paddingTop:6 }}>
                        {w.links.map(([name,url])=>(
                          <a key={name} href={url} target="_blank" rel="noopener noreferrer" style={{ display:"block", color:w.color, fontSize:10, marginBottom:3, textDecoration:"none", fontWeight:600 }}>{name} ↗</a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>12-month roadmap</div>
            {PHASES.map((p,i)=>(
              <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${p.color}`, borderRadius:12, padding:16, marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <div style={{ color:p.color, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{p.phase} · {p.months}</div>
                    <div style={{ fontSize:15, fontWeight:700, marginTop:2 }}>{p.title}</div>
                  </div>
                  <div style={{ fontSize:10, padding:"3px 8px", borderRadius:99, background:p.status==="active"?`${C.teal}22`:C.high, color:p.status==="active"?C.teal:C.dim, fontWeight:600 }}>
                    {p.status==="active"?"🟢 Now":"Upcoming"}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:10 }}>
                  <div>{p.skills.map(s=><div key={s} style={{ color:C.muted, fontSize:12, marginBottom:5 }}>▸ {s}</div>)}</div>
                  <div>{p.links.map(([name,url])=>(
                    <a key={name} href={url} target="_blank" rel="noopener noreferrer" style={{ display:"block", color:p.color, fontSize:12, marginBottom:5, textDecoration:"none", fontWeight:600 }}>{name} ↗</a>
                  ))}</div>
                </div>
                <div style={{ background:C.high, borderRadius:8, padding:"8px 12px", fontSize:12, color:C.muted }}>
                  <span style={{ color:p.color, fontWeight:600 }}>Project: </span>{p.project}
                </div>
              </div>
            ))}

            <div style={{ background:C.surface, border:`1px solid ${C.amber}`, borderRadius:12, padding:16 }}>
              <div style={{ color:C.amber, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Key dates</div>
              {[
                {date:"Aug 2026", event:"New grad apps open — start applying even if you feel unprepared", color:C.red},
                {date:"Aug–Sep 2026", event:"PL-300 Power BI cert exam target", color:C.purple},
                {date:"Oct 2026", event:"LinkedIn + GitHub portfolio fully polished", color:C.blue},
                {date:"Jan–Mar 2027", event:"Heavy application push — 50+ apps, daily interview prep", color:C.amber},
                {date:"Spring 2027", event:"Graduation + full-time start date", color:C.teal},
              ].map((k,i)=>(
                <div key={i} style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ color:k.color, fontWeight:700, fontSize:12, minWidth:95 }}>{k.date}</div>
                  <div style={{ color:C.muted, fontSize:12 }}>{k.event}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
