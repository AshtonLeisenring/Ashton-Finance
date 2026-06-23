'use client'

import { useState, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ── Design tokens ──────────────────────────────────────────────────────────
// Deep navy-slate dark mode, electric teal accent, amber warning, clean data type
// Signature: a "safe-to-spend" dial that pulses green/amber/red

const C = {
  bg: "#0d1117",
  surface: "#161b22",
  surfaceHigh: "#1f2937",
  border: "#30363d",
  teal: "#00d4aa",
  tealDim: "#00d4aa22",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#60a5fa",
  purple: "#a78bfa",
  textPrimary: "#f0f6fc",
  textSecondary: "#8b949e",
  textMuted: "#484f58",
};

// ── Real data ───────────────────────────────────────────────────────────────
const INITIAL = {
  checking: 198.93,
  savings: 3208.84,
  brokerage: 5464.35 + 1000, // after $1k transfer
  rothIRA: 16771.44,
  caciRate: 28,
  recRate: 18.80,
  caciHours: 40,
  recHours: 12,
  taxRate: 22,
  investMonthly: 400,
  savingsGoalMonthly: 300,
};

const SPEND_OPTIONS = [75, 100, 150, 200];
const GROWTH_RATES = [0.05, 0.07, 0.10];

// ── Helpers ─────────────────────────────────────────────────────────────────
function calcMonthlyIncome(caciH, recH, caciR, recR, taxRate) {
  const gross = (caciH * caciR + recH * recR) * 4.33;
  return gross * (1 - taxRate / 100);
}

function fmtDollar(n) {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtK(n) {
  if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "k";
  return fmtDollar(n);
}

function monthsToGoal(current, monthly, goal, growthAnnual = 0.07) {
  const monthlyRate = Math.pow(1 + growthAnnual, 1 / 12) - 1;
  let balance = current;
  let months = 0;
  while (balance < goal && months < 600) {
    balance = balance * (1 + monthlyRate) + monthly;
    months++;
  }
  return months;
}

function projectNetWorth(initialNW, monthlyAdd, months, rate) {
  const r = Math.pow(1 + rate, 1 / 12) - 1;
  let nw = initialNW;
  const data = [];
  for (let m = 0; m <= months; m++) {
    data.push({ month: m, value: Math.round(nw) });
    nw = nw * (1 + r) + monthlyAdd;
  }
  return data;
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Card({ children, className = "" }) {
  return (
    <div
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}
      className={`p-4 ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color = C.teal }) {
  return (
    <Card>
      <div style={{ color: C.textSecondary, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

function ProgressBar({ value, max, color = C.teal, label, sublabel }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: C.textPrimary, fontSize: 13 }}>{label}</span>
        <span style={{ color: C.textSecondary, fontSize: 13 }}>{sublabel}</span>
      </div>
      <div style={{ background: C.surfaceHigh, borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 99, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function SpendDial({ spend, income }) {
  const pct = Math.min(1, (spend * 4.33) / income);
  const color = pct < 0.25 ? C.teal : pct < 0.4 ? C.amber : C.red;
  const label = pct < 0.25 ? "Great shape" : pct < 0.4 ? "Watchful" : "High risk";
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={120} height={120} style={{ overflow: "visible" }}>
        <circle cx={60} cy={60} r={r} fill="none" stroke={C.surfaceHigh} strokeWidth={10} />
        <circle
          cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={dash}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "all 0.5s ease", filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x={60} y={56} textAnchor="middle" fill={color} fontSize={16} fontWeight={700}>{fmtDollar(spend)}</text>
        <text x={60} y={72} textAnchor="middle" fill={C.textSecondary} fontSize={10}>/week</text>
      </svg>
      <span style={{ color, fontSize: 12, fontWeight: 600 }}>{label} · {(pct * 100).toFixed(0)}% of monthly income</span>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab] = useState("dashboard");
  const [caciHours, setCaciHours] = useState(INITIAL.caciHours);
  const [recHours, setRecHours] = useState(INITIAL.recHours);
  const [caciRate, setCaciRate] = useState(INITIAL.caciRate);
  const [recRate, setRecRate] = useState(INITIAL.recRate);
  const [taxRate, setTaxRate] = useState(INITIAL.taxRate);
  const [weeklySpend, setWeeklySpend] = useState(100);
  const [investMonthly, setInvestMonthly] = useState(INITIAL.investMonthly);
  const [savingsGoal, setSavingsGoal] = useState(INITIAL.savingsGoalMonthly);
  const [growthRate, setGrowthRate] = useState(0.07);

  const monthlyIncome = useMemo(
    () => calcMonthlyIncome(caciHours, recHours, caciRate, recRate, taxRate),
    [caciHours, recHours, caciRate, recRate, taxRate]
  );

  const monthlySpend = weeklySpend * 4.33;
  const monthlySavings = monthlyIncome - monthlySpend - investMonthly - savingsGoal;
  const savingsRate = ((monthlyIncome - monthlySpend - investMonthly) / monthlyIncome) * 100;

  const totalCash = INITIAL.checking + INITIAL.savings;
  const totalInvest = INITIAL.brokerage + INITIAL.rothIRA;
  const netWorth = totalCash + totalInvest;

  // Scenario comparison
  const scenarios = useMemo(() =>
    SPEND_OPTIONS.map(sw => {
      const ms = sw * 4.33;
      const leftover = monthlyIncome - ms - investMonthly - savingsGoal;
      const totalMonthlyAdd = investMonthly + Math.max(0, leftover);
      const m50 = monthsToGoal(netWorth, totalMonthlyAdd, 50000, growthRate);
      const m100 = monthsToGoal(netWorth, totalMonthlyAdd, 100000, growthRate);
      return {
        spend: sw,
        monthlySpend: ms,
        monthlySavings: leftover,
        monthlyAdd: totalMonthlyAdd,
        months50k: m50,
        months100k: m100,
        yearlySavings: Math.max(0, leftover) * 12,
      };
    }), [monthlyIncome, investMonthly, savingsGoal, netWorth, growthRate]);

  // Long-term projection data (1 year = 12 months, 5 years = 60)
  const projectionData = useMemo(() => {
    const months = 60;
    return Array.from({ length: months + 1 }, (_, m) => {
      const pt = {};
      SPEND_OPTIONS.forEach(sw => {
        const leftover = monthlyIncome - sw * 4.33 - investMonthly - savingsGoal;
        const add = investMonthly + Math.max(0, leftover);
        const r = Math.pow(1 + growthRate, 1 / 12) - 1;
        let nw = netWorth;
        for (let i = 0; i < m; i++) nw = nw * (1 + r) + add;
        pt[`$${sw}/wk`] = Math.round(nw);
      });
      pt.month = m;
      return pt;
    });
  }, [monthlyIncome, investMonthly, savingsGoal, netWorth, growthRate]);

  // AI insights
  const insights = useMemo(() => {
    const tips = [];
    const spendPct = (monthlySpend / monthlyIncome) * 100;
    const best = scenarios.find(s => s.monthlySavings > 0 && s.spend <= 150) || scenarios[1];

    tips.push(`You earn ~${fmtDollar(monthlyIncome)}/month after taxes. Social spending at $${weeklySpend}/week is ${spendPct.toFixed(0)}% of your take-home.`);

    if (weeklySpend > 100) {
      const saved = (weeklySpend - 100) * 4.33;
      tips.push(`Dropping from $${weeklySpend}/week to $100/week frees up ${fmtDollar(saved)}/month — enough to boost your brokerage contributions significantly.`);
    }

    const sc = scenarios.find(s => s.spend === weeklySpend);
    if (sc) {
      const yrs50 = (sc.months50k / 12).toFixed(1);
      tips.push(`At $${weeklySpend}/week spending, you're on track to hit $50k net worth in ~${yrs50} years (${sc.months50k} months).`);
    }

    if (monthlySavings < 0) {
      tips.push(`⚠️ At $${weeklySpend}/week, you're running a deficit of ${fmtDollar(Math.abs(monthlySavings))}/month. Consider cutting back.`);
    } else if (monthlySavings > 500) {
      tips.push(`You have ${fmtDollar(monthlySavings)}/month of breathing room after all goals. Great position for someone 21 with no rent!`);
    }

    tips.push(`Recommended: $${best.spend}/week keeps you saving ${fmtDollar(Math.max(0, best.monthlySavings))}/month and hits $100k in ${(best.months100k / 12).toFixed(1)} years.`);
    return tips;
  }, [monthlyIncome, monthlySpend, weeklySpend, monthlySavings, scenarios]);

  const TABS = ["dashboard", "simulator", "projections", "ai-coach"];
  const tabLabel = { dashboard: "Dashboard", simulator: "Simulator", projections: "Projections", "ai-coach": "AI Coach" };

  const spendColor = weeklySpend <= 75 ? C.teal : weeklySpend <= 100 ? C.teal : weeklySpend <= 150 ? C.amber : C.red;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPrimary, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💰</div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>Ashton's Finance</span>
          </div>
          <nav style={{ display: "flex", gap: 4 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                  background: tab === t ? C.teal : "transparent",
                  color: tab === t ? C.bg : C.textSecondary,
                  transition: "all 0.15s"
                }}>
                {tabLabel[t]}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>Your Financial Picture</h1>
              <p style={{ color: C.textSecondary, margin: "4px 0 0", fontSize: 14 }}>Live snapshot · Based on current settings</p>
            </div>

            {/* Net worth hero */}
            <Card className="mb-4" style={{ background: `linear-gradient(135deg, #0d1f2d, #0d1117)`, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Estimated Net Worth</div>
                  <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.04em", color: C.teal, lineHeight: 1.1, marginTop: 4 }}>
                    {fmtDollar(netWorth)}
                  </div>
                  <div style={{ color: C.textSecondary, fontSize: 13, marginTop: 6 }}>Age 21 · No rent · Virginia Tech student</div>
                </div>
                <SpendDial spend={weeklySpend} income={monthlyIncome} />
              </div>
            </Card>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
              <StatCard label="Monthly Income" value={fmtDollar(monthlyIncome)} sub="After taxes" color={C.teal} />
              <StatCard label="Weekly Budget" value={`$${weeklySpend}`} sub={`$${(weeklySpend * 4.33).toFixed(0)}/month`} color={spendColor} />
              <StatCard label="Monthly Savings" value={fmtDollar(Math.max(0, monthlySavings))} sub={monthlySavings < 0 ? "⚠️ Deficit!" : "After all goals"} color={monthlySavings >= 0 ? C.teal : C.red} />
              <StatCard label="Savings Rate" value={`${Math.max(0, savingsRate).toFixed(0)}%`} sub="Of take-home" color={savingsRate > 20 ? C.teal : C.amber} />
              <StatCard label="Total Cash" value={fmtDollar(totalCash)} sub="Checking + Savings" color={C.blue} />
              <StatCard label="Total Invested" value={fmtDollar(totalInvest)} sub="Brokerage + Roth IRA" color={C.purple} />
            </div>

            {/* Account balances */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <Card>
                <div style={{ color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Accounts</div>
                {[
                  { name: "Checking", val: INITIAL.checking, color: C.blue },
                  { name: "Savings", val: INITIAL.savings, color: C.blue },
                  { name: "Vanguard Brokerage", val: INITIAL.brokerage, color: C.purple },
                  { name: "Vanguard Roth IRA", val: INITIAL.rothIRA, color: C.purple },
                ].map(a => (
                  <div key={a.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.textSecondary, fontSize: 14 }}>{a.name}</span>
                    <span style={{ color: a.color, fontWeight: 600, fontSize: 14 }}>{fmtDollar(a.val)}</span>
                  </div>
                ))}
              </Card>

              <Card>
                <div style={{ color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Goal Progress</div>
                <ProgressBar value={netWorth} max={50000} color={C.teal} label="$50k Net Worth" sublabel={`${fmtDollar(netWorth)} / $50k`} />
                <ProgressBar value={netWorth} max={100000} color={C.purple} label="$100k Net Worth" sublabel={`${fmtDollar(netWorth)} / $100k`} />
                <ProgressBar value={INITIAL.savings} max={5000} color={C.blue} label="Savings $5k" sublabel={`${fmtDollar(INITIAL.savings)} / $5k`} />
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: C.textSecondary, fontSize: 12, marginBottom: 4 }}>Weekly Spend Selector</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {SPEND_OPTIONS.map(s => (
                      <button key={s} onClick={() => setWeeklySpend(s)}
                        style={{
                          flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${weeklySpend === s ? spendColor : C.border}`,
                          background: weeklySpend === s ? `${spendColor}22` : "transparent",
                          color: weeklySpend === s ? spendColor : C.textSecondary,
                          cursor: "pointer", fontSize: 12, fontWeight: 600
                        }}>
                        ${s}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Income sources */}
            <Card>
              <div style={{ color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Income Sources</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600 }}>CACI Internship</div>
                  <div style={{ color: C.teal, fontSize: 20, fontWeight: 700, margin: "2px 0" }}>{fmtDollar(caciHours * caciRate * 4.33)}<span style={{ fontSize: 12, color: C.textSecondary }}>/mo gross</span></div>
                  <div style={{ color: C.textSecondary, fontSize: 12 }}>${caciRate}/hr · {caciHours}h/wk</div>
                </div>
                <div>
                  <div style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600 }}>Loudoun County Rec</div>
                  <div style={{ color: C.blue, fontSize: 20, fontWeight: 700, margin: "2px 0" }}>{fmtDollar(recHours * recRate * 4.33)}<span style={{ fontSize: 12, color: C.textSecondary }}>/mo gross</span></div>
                  <div style={{ color: C.textSecondary, fontSize: 12 }}>${recRate}/hr · {recHours}h/wk</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── SIMULATOR ── */}
        {tab === "simulator" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 4px" }}>Scenario Simulator</h1>
            <p style={{ color: C.textSecondary, margin: "0 0 20px", fontSize: 14 }}>Adjust inputs and see how each spending level compares</p>

            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
              {/* Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card>
                  <div style={{ color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Income</div>
                  {[
                    { label: "CACI Hours/wk", val: caciHours, set: setCaciHours, min: 0, max: 50 },
                    { label: "Rec Hours/wk", val: recHours, set: setRecHours, min: 0, max: 30 },
                    { label: "CACI Rate ($/hr)", val: caciRate, set: setCaciRate, min: 15, max: 60 },
                    { label: "Rec Rate ($/hr)", val: recRate, set: setRecRate, min: 12, max: 30 },
                    { label: "Tax Rate (%)", val: taxRate, set: setTaxRate, min: 0, max: 40 },
                  ].map(({ label, val, set, min, max }) => (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: C.textSecondary, fontSize: 12 }}>{label}</span>
                        <span style={{ color: C.teal, fontSize: 12, fontWeight: 600 }}>{val}</span>
                      </div>
                      <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))}
                        style={{ width: "100%", accentColor: C.teal }} />
                    </div>
                  ))}
                </Card>

                <Card>
                  <div style={{ color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Goals</div>
                  {[
                    { label: "Monthly Investment", val: investMonthly, set: setInvestMonthly, min: 0, max: 1000 },
                    { label: "Monthly Savings Goal", val: savingsGoal, set: setSavingsGoal, min: 0, max: 1000 },
                  ].map(({ label, val, set, min, max }) => (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: C.textSecondary, fontSize: 12 }}>{label}</span>
                        <span style={{ color: C.purple, fontSize: 12, fontWeight: 600 }}>{fmtDollar(val)}</span>
                      </div>
                      <input type="range" min={min} max={max} step={25} value={val} onChange={e => set(Number(e.target.value))}
                        style={{ width: "100%", accentColor: C.purple }} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: C.textSecondary, fontSize: 12 }}>Growth Rate Assumption</span>
                      <span style={{ color: C.amber, fontSize: 12, fontWeight: 600 }}>{(growthRate * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min={5} max={10} step={1} value={growthRate * 100} onChange={e => setGrowthRate(e.target.value / 100)}
                      style={{ width: "100%", accentColor: C.amber }} />
                  </div>
                </Card>

                <Card>
                  <div style={{ color: C.teal, fontSize: 13, fontWeight: 600 }}>Monthly Income</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.textPrimary, marginTop: 4 }}>{fmtDollar(monthlyIncome)}</div>
                  <div style={{ color: C.textSecondary, fontSize: 12, marginTop: 2 }}>After {taxRate}% taxes</div>
                </Card>
              </div>

              {/* Scenario cards */}
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
                  {scenarios.map((sc, i) => {
                    const labels = ["Conservative 🏦", "Balanced ⚖️", "Fun 🎉", "Aggressive 🔥"];
                    const colors = [C.teal, C.blue, C.amber, C.red];
                    const isSelected = sc.spend === weeklySpend;
                    const isBest = sc.monthlySavings > 0 && sc.spend === (scenarios.find(s => s.monthlySavings > 0)?.spend);
                    return (
                      <Card key={sc.spend}
                        onClick={() => setWeeklySpend(sc.spend)}
                        style={{
                          cursor: "pointer",
                          border: `1px solid ${isSelected ? colors[i] : C.border}`,
                          background: isSelected ? `${colors[i]}11` : C.surface,
                          position: "relative"
                        }}>
                        {isBest && <div style={{ position: "absolute", top: 8, right: 8, background: C.teal, color: C.bg, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99 }}>RECOMMENDED</div>}
                        <div style={{ color: colors[i], fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{labels[i]}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: C.textPrimary }}>${sc.spend}<span style={{ fontSize: 13, color: C.textSecondary, fontWeight: 400 }}>/week</span></div>
                        <div style={{ color: C.textSecondary, fontSize: 12, marginBottom: 10 }}>{fmtDollar(sc.monthlySpend)}/month spent</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          {[
                            { label: "Monthly Savings", val: fmtDollar(Math.max(0, sc.monthlySavings)), color: sc.monthlySavings >= 0 ? C.teal : C.red },
                            { label: "Yearly Savings", val: fmtDollar(sc.yearlySavings), color: C.blue },
                            { label: "Months to $50k", val: netWorth >= 50000 ? "✓ Done!" : `${sc.months50k}mo`, color: C.purple },
                            { label: "Months to $100k", val: `${sc.months100k}mo`, color: C.amber },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: C.surfaceHigh, borderRadius: 8, padding: 8 }}>
                              <div style={{ color: C.textMuted, fontSize: 10 }}>{label}</div>
                              <div style={{ color, fontWeight: 700, fontSize: 13, marginTop: 2 }}>{val}</div>
                            </div>
                          ))}
                        </div>
                        {sc.monthlySavings < 0 && (
                          <div style={{ marginTop: 8, color: C.red, fontSize: 11, fontWeight: 600 }}>
                            ⚠️ Deficit of {fmtDollar(Math.abs(sc.monthlySavings))}/mo
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {/* Comparison bar chart */}
                <Card>
                  <div style={{ color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Monthly Savings by Scenario</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={scenarios} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="spend" tickFormatter={v => `$${v}/wk`} tick={{ fill: C.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: C.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textPrimary, fontSize: 12 }}
                        formatter={(v) => [fmtDollar(v), "Monthly Savings"]} labelFormatter={v => `$${v}/week`} />
                      <Bar dataKey="monthlySavings" fill={C.teal} radius={[4, 4, 0, 0]}
                        label={{ position: "top", fill: C.textSecondary, fontSize: 10, formatter: v => v < 0 ? "deficit" : fmtDollar(v) }} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ── PROJECTIONS ── */}
        {tab === "projections" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 4px" }}>Long-Term Projections</h1>
            <p style={{ color: C.textSecondary, margin: "0 0 20px", fontSize: 14 }}>How spending choices compound over time at {(growthRate * 100).toFixed(0)}% annual growth</p>

            {/* Growth rate selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {GROWTH_RATES.map(r => (
                <button key={r} onClick={() => setGrowthRate(r)}
                  style={{
                    padding: "6px 16px", borderRadius: 8, border: `1px solid ${growthRate === r ? C.teal : C.border}`,
                    background: growthRate === r ? `${C.teal}22` : "transparent",
                    color: growthRate === r ? C.teal : C.textSecondary,
                    cursor: "pointer", fontSize: 13, fontWeight: 600
                  }}>
                  {(r * 100).toFixed(0)}% returns
                </button>
              ))}
            </div>

            <Card style={{ marginBottom: 16 }}>
              <div style={{ color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Net Worth Over 5 Years (All Scenarios)</div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={projectionData} margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <defs>
                    {[["$75/wk", C.teal], ["$100/wk", C.blue], ["$150/wk", C.amber], ["$200/wk", C.red]].map(([k, c]) => (
                      <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="month" tickFormatter={v => v === 0 ? "Now" : v % 12 === 0 ? `Yr ${v / 12}` : ""} tick={{ fill: C.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textPrimary, fontSize: 12 }}
                    formatter={(v) => [fmtDollar(v)]} labelFormatter={v => `Month ${v}`} />
                  <Legend wrapperStyle={{ color: C.textSecondary, fontSize: 12 }} />
                  {[["$75/wk", C.teal], ["$100/wk", C.blue], ["$150/wk", C.amber], ["$200/wk", C.red]].map(([k, c]) => (
                    <Area key={k} type="monotone" dataKey={k} stroke={c} strokeWidth={2} fill={`url(#grad-${k})`} dot={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Milestone table */}
            <Card>
              <div style={{ color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Net Worth at Key Milestones</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", color: C.textMuted, padding: "6px 12px 6px 0", fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>Scenario</th>
                      {["3 months", "6 months", "1 year", "2 years", "5 years"].map(h => (
                        <th key={h} style={{ textAlign: "right", color: C.textMuted, padding: "6px 8px", fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SPEND_OPTIONS.map((sw, i) => {
                      const colors = [C.teal, C.blue, C.amber, C.red];
                      const leftover = monthlyIncome - sw * 4.33 - investMonthly - savingsGoal;
                      const add = investMonthly + Math.max(0, leftover);
                      const r = Math.pow(1 + growthRate, 1 / 12) - 1;
                      const proj = (m) => {
                        let nw = netWorth;
                        for (let k = 0; k < m; k++) nw = nw * (1 + r) + add;
                        return nw;
                      };
                      return (
                        <tr key={sw} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "10px 12px 10px 0", color: colors[i], fontWeight: 600 }}>${sw}/week</td>
                          {[3, 6, 12, 24, 60].map(m => (
                            <td key={m} style={{ textAlign: "right", padding: "10px 8px", color: C.textPrimary }}>{fmtDollar(proj(m))}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── AI COACH ── */}
        {tab === "ai-coach" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 4px" }}>AI Money Coach</h1>
            <p style={{ color: C.textSecondary, margin: "0 0 20px", fontSize: 14 }}>Personalized insights based on your numbers</p>

            {/* Main recommendation */}
            <Card style={{ marginBottom: 16, border: `1px solid ${C.teal}`, background: `${C.teal}08` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ fontSize: 28 }}>🎯</div>
                <div>
                  <div style={{ color: C.teal, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Weekly Recommendation</div>
                  <div style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>
                    Spend <span style={{ color: C.teal }}>$100/week</span> — you'll save <span style={{ color: C.teal }}>{fmtDollar(Math.max(0, scenarios[1].monthlySavings))}/month</span> and hit $100k net worth in <span style={{ color: C.teal }}>{(scenarios[1].months100k / 12).toFixed(1)} years</span>.
                  </div>
                  <div style={{ color: C.textSecondary, fontSize: 13, marginTop: 6 }}>
                    Your current setting of <span style={{ color: spendColor, fontWeight: 600 }}>${weeklySpend}/week</span> {weeklySpend <= 100 ? "is on target. Great discipline!" : `is ${fmtDollar((weeklySpend - 100) * 4.33)}/month above the recommended level.`}
                  </div>
                </div>
              </div>
            </Card>

            {/* Insight cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
              {insights.map((tip, i) => {
                const icons = ["📊", "💡", "🎯", "⚠️", "🚀"];
                const borderColors = [C.blue, C.teal, C.purple, C.amber, C.teal];
                return (
                  <Card key={i} style={{ border: `1px solid ${borderColors[i % borderColors.length]}44` }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 20 }}>{icons[i % icons.length]}</span>
                      <p style={{ margin: 0, color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>{tip}</p>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Weekly budget breakdown */}
            <Card>
              <div style={{ color: C.textSecondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Weekly Safe-to-Spend Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "Daily Limit", val: weeklySpend / 7, color: C.teal, emoji: "📅" },
                  { label: "Weekly Limit", val: weeklySpend, color: C.blue, emoji: "📆" },
                  { label: "Monthly Limit", val: weeklySpend * 4.33, color: C.purple, emoji: "🗓️" },
                ].map(({ label, val, color, emoji }) => (
                  <div key={label} style={{ background: C.surfaceHigh, borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
                    <div style={{ color, fontSize: 22, fontWeight: 800 }}>{fmtDollar(val)}</div>
                    <div style={{ color: C.textSecondary, fontSize: 12, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, padding: 12, background: C.surfaceHigh, borderRadius: 10 }}>
                <div style={{ color: C.textSecondary, fontSize: 12, marginBottom: 8 }}>Budget flexibility selector</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {SPEND_OPTIONS.map((s) => {
                    const color = s <= 75 ? C.teal : s <= 100 ? C.blue : s <= 150 ? C.amber : C.red;
                    return (
                      <button key={s} onClick={() => setWeeklySpend(s)}
                        style={{
                          flex: 1, padding: "8px 0", borderRadius: 8,
                          border: `1px solid ${weeklySpend === s ? color : C.border}`,
                          background: weeklySpend === s ? `${color}22` : "transparent",
                          color: weeklySpend === s ? color : C.textSecondary,
                          cursor: "pointer", fontSize: 13, fontWeight: 700
                        }}>
                        ${s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
