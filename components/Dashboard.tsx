'use client'

import { useState, useEffect } from "react";

interface Transaction {
  id: number; date: string; desc: string;
  type: 'income' | 'expense' | 'investment';
  category: string; amount: number;
}
interface Balances { checking: number; savings: number; brokerage: number; roth: number; }
interface State { transactions: Transaction[]; balances: Balances; }

const DEFAULT: State = {
  transactions: [
    { id: 1, date: "2026-06-01", desc: "Shell Oil", type: "expense", category: "Gas", amount: 5.43 },
    { id: 2, date: "2026-06-23", desc: "CACI paycheck", type: "income", category: "CACI", amount: 1842.00 },
  ],
  balances: { checking: 198.93, savings: 3208.84, brokerage: 6464.35, roth: 16771.44 },
};

const CATS: Record<string, string[]> = {
  income: ["CACI", "Rec Center", "Other Income"],
  expense: ["Food/Coffee", "Bars & Entertainment", "Gas", "Shopping", "Vacation", "Gym", "Bills", "Car", "Other"],
  investment: ["Vanguard Brokerage", "Vanguard Roth IRA", "Other"],
};

const C = {
  bg: "#0d1117", surface: "#161b22", high: "#1f2937", border: "#30363d",
  teal: "#00d4aa", amber: "#f59e0b", red: "#ef4444", blue: "#60a5fa",
  purple: "#a78bfa", green: "#34d399", text: "#f0f6fc", muted: "#8b949e", dim: "#484f58",
};

function fmt(n: number) {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtK(n: number) { return n >= 1000 ? "$" + (n / 1000).toFixed(1) + "k" : fmt(n); }

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Dashboard() {
  const [state, setState] = useState<State>(DEFAULT);
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(5);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [addType, setAddType] = useState<'income'|'expense'|'investment'>("expense");
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [cat, setCat] = useState("Food/Coffee");
  const [mainTab, setMainTab] = useState("calendar");

  useEffect(() => {
    try { const s = localStorage.getItem("ashton_cal_v2"); if (s) setState(JSON.parse(s)); } catch(e) {}
  }, []);

  function save(s: State) { setState(s); try { localStorage.setItem("ashton_cal_v2", JSON.stringify(s)); } catch(e) {} }

  const today = new Date();
  const thisMonthPrefix = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0");
  const monthTx = state.transactions.filter(t => t.date.startsWith(thisMonthPrefix));
  const monthIncome = monthTx.filter(t => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const monthSpent = monthTx.filter(t => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const monthInvest = monthTx.filter(t => t.type === "investment").reduce((a, t) => a + t.amount, 0);
  const nw = state.balances.checking + state.balances.savings + state.balances.brokerage + state.balances.roth;
  const leftover = monthIncome - monthSpent - monthInvest;

  const viewPrefix = viewYear + "-" + String(viewMonth + 1).padStart(2, "0");
  const viewTx = state.transactions.filter(t => t.date.startsWith(viewPrefix));
  const txByDay: Record<number, Transaction[]> = {};
  viewTx.forEach(t => { const d = parseInt(t.date.split("-")[2]); if (!txByDay[d]) txByDay[d] = []; txByDay[d].push(t); });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const selectedDateStr = selectedDay ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}` : "";
  const selectedTxs = state.transactions.filter(t => t.date === selectedDateStr);

  function changeType(t: 'income'|'expense'|'investment') {
    setAddType(t);
    setCat(CATS[t][0]);
  }

  function addTx() {
    if (!desc.trim() || !amt || parseFloat(amt) <= 0) return;
    const amount = parseFloat(parseFloat(amt).toFixed(2));
    const newTx: Transaction = { id: Date.now(), date: selectedDateStr, desc: desc.trim(), type: addType, category: cat, amount };
    const newBal = { ...state.balances };
    if (addType === "income") newBal.checking += amount;
    else if (addType === "expense") newBal.checking -= amount;
    else if (addType === "investment") {
      newBal.checking -= amount;
      if (cat === "Vanguard Brokerage") newBal.brokerage += amount;
      else if (cat === "Vanguard Roth IRA") newBal.roth += amount;
      else newBal.savings += amount;
    }
    save({ transactions: [newTx, ...state.transactions], balances: newBal });
    setDesc(""); setAmt("");
  }

  function deleteTx(id: number) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;
    const newBal = { ...state.balances };
    if (tx.type === "income") newBal.checking -= tx.amount;
    else if (tx.type === "expense") newBal.checking += tx.amount;
    else if (tx.type === "investment") {
      newBal.checking += tx.amount;
      if (tx.category === "Vanguard Brokerage") newBal.brokerage -= tx.amount;
      else if (tx.category === "Vanguard Roth IRA") newBal.roth -= tx.amount;
    }
    save({ transactions: state.transactions.filter(t => t.id !== id), balances: newBal });
  }

  function changeMonth(dir: number) {
    let m = viewMonth + dir; let y = viewYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setViewMonth(m); setViewYear(y); setSelectedDay(null);
  }

  const inp: React.CSSProperties = { background: C.high, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13, width: "100%", outline: "none" };
  const typeColor = addType === "income" ? C.green : addType === "investment" ? C.blue : C.red;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>💰</div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Ashton's Finance</span>
          </div>
          <div style={{ fontWeight: 700, color: C.teal, fontSize: 17 }}>{fmtK(nw)}</div>
        </div>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 2 }}>
          {["calendar", "transactions", "career"].map(t => (
            <button key={t} onClick={() => setMainTab(t)} style={{ padding: "7px 14px", border: "none", background: "transparent", color: mainTab === t ? C.teal : C.muted, borderBottom: `2px solid ${mainTab === t ? C.teal : "transparent"}`, cursor: "pointer", fontSize: 13, fontWeight: mainTab === t ? 600 : 400, textTransform: "capitalize", marginBottom: -1 }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>

        {/* ── METRICS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Net worth", val: fmtK(nw), color: C.teal },
            { label: "Income this month", val: fmt(monthIncome), color: C.green },
            { label: "Spent this month", val: fmt(monthSpent), color: C.red },
            { label: "Left over", val: fmt(leftover), color: leftover >= 0 ? C.green : C.red },
            { label: "Invested", val: fmt(monthInvest), color: C.blue },
            { label: "Checking", val: fmt(state.balances.checking), color: C.text },
          ].map(m => (
            <div key={m.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ color: C.dim, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{m.label}</div>
              <div style={{ color: m.color, fontSize: 18, fontWeight: 700 }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* ── CALENDAR TAB ── */}
        {mainTab === "calendar" && (
          <div style={{ display: "grid", gridTemplateColumns: selectedDay ? "1fr 300px" : "1fr", gap: 12 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              {/* Month nav */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <button onClick={() => changeMonth(-1)} style={{ background: C.high, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 12px", color: C.text, cursor: "pointer", fontSize: 16 }}>‹</button>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
                <button onClick={() => changeMonth(1)} style={{ background: C.high, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 12px", color: C.text, cursor: "pointer", fontSize: 16 }}>›</button>
              </div>

              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 3 }}>
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, color: C.muted, padding: "3px 0", fontWeight: 600 }}>{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                  const isSelected = d === selectedDay;
                  const dayTxs = txByDay[d] || [];
                  const hasIncome = dayTxs.some(t => t.type === "income");
                  const hasExpense = dayTxs.some(t => t.type === "expense");
                  const hasInvest = dayTxs.some(t => t.type === "investment");
                  return (
                    <div key={d} onClick={() => setSelectedDay(selectedDay === d ? null : d)}
                      style={{ minHeight: 52, borderRadius: 8, border: `1px solid ${isSelected ? C.teal : isToday ? C.blue : C.border}`, padding: "4px 5px", cursor: "pointer", background: isSelected ? `${C.teal}18` : isToday ? `${C.blue}12` : C.high, transition: "all 0.1s" }}>
                      <div style={{ fontSize: 11, color: isToday ? C.blue : isSelected ? C.teal : C.muted, fontWeight: isToday || isSelected ? 700 : 400, marginBottom: 3 }}>{d}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {hasIncome && <div style={{ fontSize: 9, background: `${C.green}22`, color: C.green, borderRadius: 4, padding: "1px 3px", fontWeight: 600 }}>
                          +{fmt(dayTxs.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0))}
                        </div>}
                        {hasExpense && <div style={{ fontSize: 9, background: `${C.red}22`, color: C.red, borderRadius: 4, padding: "1px 3px", fontWeight: 600 }}>
                          -{fmt(dayTxs.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0))}
                        </div>}
                        {hasInvest && <div style={{ fontSize: 9, background: `${C.blue}22`, color: C.blue, borderRadius: 4, padding: "1px 3px", fontWeight: 600 }}>
                          inv
                        </div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day panel */}
            {selectedDay && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{MONTH_SHORT[viewMonth]} {selectedDay}</div>
                  <button onClick={() => setSelectedDay(null)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
                </div>

                {/* Type selector */}
                <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
                  {(["income","expense","investment"] as const).map(t => (
                    <button key={t} onClick={() => changeType(t)} style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: `1px solid ${addType === t ? typeColor : C.border}`, background: addType === t ? `${typeColor}22` : "transparent", color: addType === t ? typeColor : C.muted, fontSize: 11, cursor: "pointer", fontWeight: addType === t ? 700 : 400, textTransform: "capitalize" }}>
                      {t === "income" ? "+ Income" : t === "expense" ? "- Spent" : "Invest"}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: 8 }}>
                  <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={addType === "income" ? "e.g. CACI paycheck" : addType === "expense" ? "e.g. Chipotle" : "e.g. Monthly contribution"} style={inp} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <input type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder="Amount $" step="0.01" style={inp} onKeyDown={e => e.key === "Enter" && addTx()} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <select value={cat} onChange={e => setCat(e.target.value)} style={inp}>
                    {CATS[addType].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <button onClick={addTx} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "none", background: typeColor, color: addType === "income" ? "#0d2e1a" : addType === "investment" ? "#0a1f3d" : "#2d0a0a", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Add {addType}
                </button>

                {/* Existing txs for this day */}
                {selectedTxs.length > 0 && (
                  <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <div style={{ color: C.dim, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>This day</div>
                    {selectedTxs.map(t => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: t.type === "income" ? C.green : t.type === "investment" ? C.blue : C.red }}>
                            {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                          </span>
                          <span style={{ color: C.muted, fontSize: 12, marginLeft: 6 }}>{t.desc}</span>
                        </div>
                        <button onClick={() => deleteTx(t.id)} style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 15 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {mainTab === "transactions" && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>All transactions ({state.transactions.length})</div>
            {[...state.transactions].sort((a,b) => b.date.localeCompare(a.date)).map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: t.type === "income" ? C.green : t.type === "investment" ? C.blue : C.red }}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                  </span>
                  <span style={{ fontWeight: 500, fontSize: 13, marginLeft: 10 }}>{t.desc}</span>
                  <span style={{ color: C.dim, fontSize: 11, marginLeft: 8 }}>{t.category}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.dim, fontSize: 11 }}>{t.date}</span>
                  <button onClick={() => deleteTx(t.id)} style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 15 }}>✕</button>
                </div>
              </div>
            ))}
            {state.transactions.length === 0 && <div style={{ color: C.dim, fontSize: 13 }}>No transactions yet — use the calendar to add them.</div>}

            <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Account balances</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Checking", val: state.balances.checking, color: C.blue },
                  { label: "Savings", val: state.balances.savings, color: C.blue },
                  { label: "Vanguard Brokerage", val: state.balances.brokerage, color: C.purple },
                  { label: "Vanguard Roth IRA", val: state.balances.roth, color: C.purple },
                ].map(a => (
                  <div key={a.label} style={{ background: C.high, borderRadius: 9, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.muted, fontSize: 13 }}>{a.label}</span>
                    <span style={{ color: a.color, fontWeight: 700, fontSize: 13 }}>{fmt(a.val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CAREER TAB ── */}
        {mainTab === "career" && (
          <div>
            <div style={{ background: C.surface, border: `1px solid ${C.teal}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>FinTech Career Roadmap</div>
              <div style={{ color: C.muted, fontSize: 13 }}>Spring 2027 graduation · Capital One, Booz Allen, Deloitte, MITRE</div>
            </div>
            {[
              { phase: "Phase 1", title: "SQL Foundation", months: "Months 1–3", color: C.teal, status: "active",
                skills: ["SELECT, WHERE, GROUP BY, JOINs", "Window functions, CTEs", "LeetCode SQL problems"],
                links: [["SQLZoo","https://sqlzoo.net"],["Mode SQL","https://mode.com/sql-tutorial"],["StrataScratch","https://stratascratch.com"]],
                project: "SQL Sales Dashboard — query retail data, answer business questions" },
              { phase: "Phase 2", title: "Python for Data", months: "Months 4–6", color: C.blue, status: "upcoming",
                skills: ["Python basics, pandas", "matplotlib charts", "yfinance for stock data"],
                links: [["py4e.com","https://py4e.com"],["Kaggle Python","https://kaggle.com/learn/python"],["Kaggle Pandas","https://kaggle.com/learn/pandas"]],
                project: "Python Finance Analyzer — pull stock data, calculate returns, visualize" },
              { phase: "Phase 3", title: "Power BI / Tableau", months: "Months 7–9", color: C.purple, status: "upcoming",
                skills: ["Interactive dashboards", "DAX basics", "PL-300 cert prep"],
                links: [["MS Learn PL-300","https://learn.microsoft.com/en-us/certifications/exams/pl-300"],["Guy in a Cube","https://youtube.com/@GuyInACube"],["Tableau Public","https://public.tableau.com"]],
                project: "End-to-end BI Report — connect SQL to Power BI, publish exec dashboard" },
              { phase: "Phase 4", title: "Job Search", months: "Months 10–12", color: C.amber, status: "upcoming",
                skills: ["GitHub portfolio (3 projects)", "Resume with metrics", "Interview prep"],
                links: [["DataLemur","https://datalemur.com"],["Levels.fyi","https://levels.fyi"],["LinkedIn","https://linkedin.com"]],
                project: "Apply to 50+ roles — target Jan–Mar 2027" },
            ].map((p, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${p.color}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ color: p.color, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{p.phase} · {p.months}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{p.title}</div>
                  </div>
                  <div style={{ fontSize: 10, padding: "3px 8px", borderRadius: 99, background: p.status === "active" ? `${C.teal}22` : C.high, color: p.status === "active" ? C.teal : C.dim, fontWeight: 600 }}>
                    {p.status === "active" ? "In progress" : "Upcoming"}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    {p.skills.map(s => <div key={s} style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>▸ {s}</div>)}
                  </div>
                  <div>
                    {p.links.map(([name, url]) => (
                      <a key={name} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", color: p.color, fontSize: 12, marginBottom: 4, textDecoration: "none", fontWeight: 600 }}>{name} ↗</a>
                    ))}
                  </div>
                </div>
                <div style={{ background: C.high, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.muted }}>
                  <span style={{ color: p.color, fontWeight: 600 }}>Project: </span>{p.project}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
