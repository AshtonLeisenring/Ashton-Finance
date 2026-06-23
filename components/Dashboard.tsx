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
  ],
  balances: { checking: 198.93, savings: 2208.84, brokerage: 6464.35, roth: 16771.44 },
};

const CATS: Record<string, string[]> = {
  income: ["CACI", "Rec Center", "Other Income"],
  expense: ["Food/Coffee","Bars & Entertainment","Gas","Shopping","Vacation","Gym","Bills","Car","Other"],
  investment: ["Vanguard Brokerage","Vanguard Roth IRA","Other"],
};

const C = {
  bg:"#0d1117",surface:"#161b22",high:"#1f2937",border:"#30363d",
  teal:"#00d4aa",amber:"#f59e0b",red:"#ef4444",blue:"#60a5fa",
  purple:"#a78bfa",green:"#34d399",text:"#f0f6fc",muted:"#8b949e",dim:"#484f58",
};

const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(n:number){return"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtK(n:number){return n>=1000?"$"+(n/1000).toFixed(1)+"k":fmt(n);}

const inp:React.CSSProperties={background:C.high,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13,width:"100%",outline:"none"};

export default function Dashboard(){
  const [state,setState]=useState<State>(DEFAULT);
  const [viewYear,setViewYear]=useState(2026);
  const [viewMonth,setViewMonth]=useState(5);
  const [selectedDay,setSelectedDay]=useState<number|null>(null);
  const [addType,setAddType]=useState<'income'|'expense'|'investment'>("expense");
  const [desc,setDesc]=useState("");
  const [amt,setAmt]=useState("");
  const [cat,setCat]=useState("Food/Coffee");
  const [mainTab,setMainTab]=useState("calendar");
  const [editId,setEditId]=useState<number|null>(null);
  const [editDesc,setEditDesc]=useState("");
  const [editAmt,setEditAmt]=useState("");
  const [editCat,setEditCat]=useState("");

  useEffect(()=>{
    try{const s=localStorage.getItem("ashton_v6");if(s)setState(JSON.parse(s));}catch(e){}
  },[]);

  function save(s:State){setState(s);try{localStorage.setItem("ashton_v6",JSON.stringify(s));}catch(e){}}

  const today=new Date();
  const thisMonthPrefix=today.getFullYear()+"-"+String(today.getMonth()+1).padStart(2,"0");
  const monthTx=state.transactions.filter(t=>t.date.startsWith(thisMonthPrefix));
  const monthIncome=monthTx.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
  const monthSpent=monthTx.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
  const monthInvest=monthTx.filter(t=>t.type==="investment").reduce((a,t)=>a+t.amount,0);
  const nw=state.balances.checking+state.balances.savings+state.balances.brokerage+state.balances.roth;
  const leftover=monthIncome-monthSpent-monthInvest;

  const viewPrefix=viewYear+"-"+String(viewMonth+1).padStart(2,"0");
  const txByDay:Record<number,Transaction[]>={};
  state.transactions.filter(t=>t.date.startsWith(viewPrefix)).forEach(t=>{
    const d=parseInt(t.date.split("-")[2]);
    if(!txByDay[d])txByDay[d]=[];
    txByDay[d].push(t);
  });

  const firstDay=new Date(viewYear,viewMonth,1).getDay();
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const selectedDateStr=selectedDay?`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`:"";
  const selectedTxs=state.transactions.filter(t=>t.date===selectedDateStr);

  function changeType(t:'income'|'expense'|'investment'){setAddType(t);setCat(CATS[t][0]);}

  function addTx(){
    if(!desc.trim()||!amt||parseFloat(amt)<=0)return;
    const amount=parseFloat(parseFloat(amt).toFixed(2));
    const newTx:Transaction={id:Date.now(),date:selectedDateStr,desc:desc.trim(),type:addType,category:cat,amount};
    const newBal={...state.balances};
    if(addType==="income")newBal.checking+=amount;
    else if(addType==="expense")newBal.checking-=amount;
    else if(addType==="investment"){
      newBal.checking-=amount;
      if(cat==="Vanguard Brokerage")newBal.brokerage+=amount;
      else if(cat==="Vanguard Roth IRA")newBal.roth+=amount;
      else newBal.savings+=amount;
    }
    save({transactions:[newTx,...state.transactions],balances:newBal});
    setDesc("");setAmt("");
  }

  function deleteTx(id:number){
    const tx=state.transactions.find(t=>t.id===id);
    if(!tx)return;
    const newBal={...state.balances};
    if(tx.type==="income")newBal.checking-=tx.amount;
    else if(tx.type==="expense")newBal.checking+=tx.amount;
    else if(tx.type==="investment"){
      newBal.checking+=tx.amount;
      if(tx.category==="Vanguard Brokerage")newBal.brokerage-=tx.amount;
      else if(tx.category==="Vanguard Roth IRA")newBal.roth-=tx.amount;
    }
    save({transactions:state.transactions.filter(t=>t.id!==id),balances:newBal});
    if(editId===id)setEditId(null);
  }

  function startEdit(t:Transaction){
    setEditId(t.id);setEditDesc(t.desc);setEditAmt(String(t.amount));setEditCat(t.category);
  }

  function saveEdit(id:number){
    const tx=state.transactions.find(t=>t.id===id);
    if(!tx)return;
    const newAmt=parseFloat(parseFloat(editAmt).toFixed(2));
    const diff=newAmt-tx.amount;
    const newBal={...state.balances};
    if(tx.type==="income")newBal.checking+=diff;
    else if(tx.type==="expense")newBal.checking-=diff;
    const updated=state.transactions.map(t=>t.id===id?{...t,desc:editDesc,amount:newAmt,category:editCat}:t);
    save({transactions:updated,balances:newBal});
    setEditId(null);
  }

  function changeMonth(dir:number){
    let m=viewMonth+dir,y=viewYear;
    if(m>11){m=0;y++;}if(m<0){m=11;y--;}
    setViewMonth(m);setViewYear(y);setSelectedDay(null);
  }

  const typeColor=addType==="income"?C.green:addType==="investment"?C.blue:C.red;

  const WEEKLY_PLAN=[
    {day:"Monday",focus:"SQL",color:C.blue,time:"6:30–8:00 PM",
     tasks:["30 min: SQLZoo tutorial or practice problem","30 min: Mode SQL Tutorial business queries","Review query you wrote last session"],
     links:[["SQLZoo","https://sqlzoo.net"],["Mode SQL Tutorial","https://mode.com/sql-tutorial"],["LeetCode SQL","https://leetcode.com/problemset/database/"]]},
    {day:"Tuesday",focus:"Python",color:C.purple,time:"6:30–8:00 PM",
     tasks:["30 min: py4e.com — work through current chapter","30 min: Kaggle Python micro-course exercises","Try to write one function from scratch"],
     links:[["py4e.com","https://py4e.com"],["Kaggle Python","https://kaggle.com/learn/python"],["Kaggle Pandas","https://kaggle.com/learn/pandas"]]},
    {day:"Wednesday",focus:"Power BI",color:C.teal,time:"6:30–8:30 PM",
     tasks:["45 min: Microsoft Learn PL-300 module","45 min: Guy in a Cube YouTube tutorial","Build or update one visual in Power BI Desktop"],
     links:[["MS Learn PL-300","https://learn.microsoft.com/en-us/certifications/exams/pl-300"],["Guy in a Cube","https://youtube.com/@GuyInACube"],["Tableau Public","https://public.tableau.com"]]},
    {day:"Thursday",focus:"Portfolio Project",color:C.amber,time:"6:30–8:30 PM",
     tasks:["Work on current portfolio project (see phases)","Push code to GitHub","Update LinkedIn with progress if milestone hit"],
     links:[["GitHub","https://github.com"],["StrataScratch","https://stratascratch.com"],["DataLemur","https://datalemur.com"]]},
    {day:"Friday",focus:"OFF",color:C.dim,time:"Evening off",
     tasks:["No studying — social time protected","BFN events, going out, rest","Optional: 15 min review if you feel like it"],
     links:[]},
    {day:"Saturday",focus:"OFF",color:C.dim,time:"All day off",
     tasks:["Full rest and recharge","Social time with friends","No pressure — consistency beats burnout"],
     links:[]},
    {day:"Sunday",focus:"SQL or Python",color:C.green,time:"9:00–11:00 AM",
     tasks:["2 hours free study before second job","Review week's material or get ahead","2:00–8:00 PM: Rec Center second job"],
     links:[["SQLZoo","https://sqlzoo.net"],["py4e.com","https://py4e.com"],["Real Python","https://realpython.com"]]},
  ];

  const PHASES=[
    {phase:"Phase 1",title:"SQL Foundation",months:"Months 1–3",color:C.teal,status:"active",
     project:"SQL Sales Dashboard — query retail dataset, answer 10 business questions, write a summary report",
     skills:["SELECT, WHERE, GROUP BY, JOINs","Window functions, CTEs, subqueries","LeetCode SQL problems (easy → medium)"],
     links:[["SQLZoo","https://sqlzoo.net"],["Mode SQL","https://mode.com/sql-tutorial"],["LeetCode SQL","https://leetcode.com/problemset/database/"],["StrataScratch","https://stratascratch.com"]]},
    {phase:"Phase 2",title:"Python for Data",months:"Months 4–6",color:C.blue,status:"upcoming",
     project:"Python Finance Analyzer — pull stock data with yfinance, calculate returns, plot with matplotlib",
     skills:["Python basics: loops, functions, dicts","pandas for data wrangling","matplotlib/seaborn for charts","yfinance for financial data"],
     links:[["py4e.com","https://py4e.com"],["Kaggle Python","https://kaggle.com/learn/python"],["Kaggle Pandas","https://kaggle.com/learn/pandas"],["Real Python","https://realpython.com"]]},
    {phase:"Phase 3",title:"Power BI / Tableau",months:"Months 7–9",color:C.purple,status:"upcoming",
     project:"End-to-end BI Report — connect SQL db to Power BI, build exec-style dashboard, publish to Tableau Public",
     skills:["Connect to data sources","Interactive dashboards","DAX basics in Power BI","PL-300 cert — target month 8–9"],
     links:[["MS Learn PL-300","https://learn.microsoft.com/en-us/certifications/exams/pl-300"],["Guy in a Cube","https://youtube.com/@GuyInACube"],["Tableau Public","https://public.tableau.com"],["Power BI Desktop","https://powerbi.microsoft.com/desktop"]]},
    {phase:"Phase 4",title:"Job Search",months:"Months 10–12",color:C.amber,status:"upcoming",
     project:"Apply to 50+ roles Jan–Mar 2027 — Capital One, Booz Allen, Deloitte, MITRE as top targets",
     skills:["GitHub portfolio with 3 polished projects","Resume with impact metrics not just duties","Aug 2026 = new grad apps open — network NOW","Behavioral + SQL technical interview prep"],
     links:[["DataLemur","https://datalemur.com"],["Levels.fyi","https://levels.fyi"],["LinkedIn","https://linkedin.com"],["Glassdoor","https://glassdoor.com"]]},
  ];

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',system-ui,sans-serif"}}>

      {/* Header */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"0 16px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:52}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:24,height:24,borderRadius:6,background:`linear-gradient(135deg,${C.teal},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>💰</div>
            <span style={{fontWeight:700,fontSize:15}}>Ashton&apos;s Finance</span>
          </div>
          <div style={{fontWeight:700,color:C.teal,fontSize:17}}>{fmtK(nw)}</div>
        </div>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",gap:2}}>
          {["calendar","transactions","career"].map(t=>(
            <button key={t} onClick={()=>setMainTab(t)} style={{padding:"7px 14px",border:"none",background:"transparent",color:mainTab===t?C.teal:C.muted,borderBottom:`2px solid ${mainTab===t?C.teal:"transparent"}`,cursor:"pointer",fontSize:13,fontWeight:mainTab===t?600:400,textTransform:"capitalize",marginBottom:-1}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"16px"}}>

        {/* Metrics */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8,marginBottom:14}}>
          {[
            {label:"Net worth",val:fmtK(nw),color:C.teal},
            {label:"Income this month",val:fmt(monthIncome),color:C.green},
            {label:"Spent this month",val:fmt(monthSpent),color:C.red},
            {label:"Left over",val:fmt(leftover),color:leftover>=0?C.green:C.red},
            {label:"Invested",val:fmt(monthInvest),color:C.blue},
            {label:"Checking",val:fmt(state.balances.checking),color:C.text},
          ].map(m=>(
            <div key={m.label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px"}}>
              <div style={{color:C.dim,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>{m.label}</div>
              <div style={{color:m.color,fontSize:18,fontWeight:700}}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* ── CALENDAR ── */}
        {mainTab==="calendar"&&(
          <div style={{display:"grid",gridTemplateColumns:selectedDay?"1fr 300px":"1fr",gap:12}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <button onClick={()=>changeMonth(-1)} style={{background:C.high,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 12px",color:C.text,cursor:"pointer",fontSize:16}}>‹</button>
                <div style={{fontWeight:600,fontSize:15}}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
                <button onClick={()=>changeMonth(1)} style={{background:C.high,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 12px",color:C.text,cursor:"pointer",fontSize:16}}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(
                  <div key={d} style={{textAlign:"center",fontSize:11,color:C.muted,padding:"3px 0",fontWeight:600}}>{d}</div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
                  const isToday=d===today.getDate()&&viewMonth===today.getMonth()&&viewYear===today.getFullYear();
                  const isSelected=d===selectedDay;
                  const dayTxs=txByDay[d]||[];
                  const inc=dayTxs.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
                  const exp=dayTxs.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
                  const inv=dayTxs.filter(t=>t.type==="investment").reduce((a,t)=>a+t.amount,0);
                  return(
                    <div key={d} onClick={()=>setSelectedDay(selectedDay===d?null:d)}
                      style={{minHeight:54,borderRadius:8,border:`1px solid ${isSelected?C.teal:isToday?C.blue:C.border}`,padding:"4px 5px",cursor:"pointer",background:isSelected?`${C.teal}18`:isToday?`${C.blue}12`:C.high,transition:"all 0.1s"}}>
                      <div style={{fontSize:11,color:isToday?C.blue:isSelected?C.teal:C.muted,fontWeight:isToday||isSelected?700:400,marginBottom:3}}>{d}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:2}}>
                        {inc>0&&<div style={{fontSize:9,background:`${C.green}22`,color:C.green,borderRadius:4,padding:"1px 3px",fontWeight:600}}>+{fmt(inc)}</div>}
                        {exp>0&&<div style={{fontSize:9,background:`${C.red}22`,color:C.red,borderRadius:4,padding:"1px 3px",fontWeight:600}}>-{fmt(exp)}</div>}
                        {inv>0&&<div style={{fontSize:9,background:`${C.blue}22`,color:C.blue,borderRadius:4,padding:"1px 3px",fontWeight:600}}>inv</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day panel */}
            {selectedDay&&(
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontWeight:600,fontSize:14}}>{MONTH_SHORT[viewMonth]} {selectedDay}</div>
                  <button onClick={()=>setSelectedDay(null)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>✕</button>
                </div>
                <div style={{display:"flex",gap:5,marginBottom:12}}>
                  {(["income","expense","investment"] as const).map(t=>(
                    <button key={t} onClick={()=>changeType(t)} style={{flex:1,padding:"6px 0",borderRadius:7,border:`1px solid ${addType===t?typeColor:C.border}`,background:addType===t?`${typeColor}22`:"transparent",color:addType===t?typeColor:C.muted,fontSize:11,cursor:"pointer",fontWeight:addType===t?700:400,textTransform:"capitalize"}}>
                      {t==="income"?"+ Income":t==="expense"?"- Spent":"Invest"}
                    </button>
                  ))}
                </div>
                <div style={{marginBottom:8}}>
                  <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder={addType==="income"?"e.g. CACI paycheck":addType==="expense"?"e.g. Chipotle":"e.g. Vanguard contribution"} style={inp}/>
                </div>
                <div style={{marginBottom:8}}>
                  <input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="Amount $" step="0.01" style={inp} onKeyDown={e=>e.key==="Enter"&&addTx()}/>
                </div>
                <div style={{marginBottom:12}}>
                  <select value={cat} onChange={e=>setCat(e.target.value)} style={inp}>
                    {CATS[addType].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <button onClick={addTx} style={{width:"100%",padding:"9px",borderRadius:8,border:"none",background:typeColor,color:addType==="income"?"#0d2e1a":addType==="investment"?"#0a1f3d":"#2d0a0a",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  Add {addType}
                </button>
                {selectedTxs.length>0&&(
                  <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                    <div style={{color:C.dim,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>This day</div>
                    {selectedTxs.map(t=>(
                      <div key={t.id} style={{padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <span style={{fontWeight:600,fontSize:13,color:t.type==="income"?C.green:t.type==="investment"?C.blue:C.red}}>{t.type==="income"?"+":"-"}{fmt(t.amount)}</span>
                            <span style={{color:C.muted,fontSize:12,marginLeft:6}}>{t.desc}</span>
                          </div>
                          <div style={{display:"flex",gap:6}}>
                            <button onClick={()=>startEdit(t)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,cursor:"pointer",fontSize:11,padding:"2px 7px"}}>edit</button>
                            <button onClick={()=>deleteTx(t.id)} style={{background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:15}}>✕</button>
                          </div>
                        </div>
                        {editId===t.id&&(
                          <div style={{marginTop:8,padding:10,background:C.high,borderRadius:8}}>
                            <input value={editDesc} onChange={e=>setEditDesc(e.target.value)} style={{...inp,marginBottom:6}}/>
                            <input type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} style={{...inp,marginBottom:6}}/>
                            <select value={editCat} onChange={e=>setEditCat(e.target.value)} style={{...inp,marginBottom:8}}>
                              {CATS[t.type].map(c=><option key={c}>{c}</option>)}
                            </select>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>saveEdit(t.id)} style={{flex:1,padding:"6px",borderRadius:7,border:"none",background:C.teal,color:C.bg,fontWeight:700,fontSize:12,cursor:"pointer"}}>Save</button>
                              <button onClick={()=>setEditId(null)} style={{flex:1,padding:"6px",borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {mainTab==="transactions"&&(
          <div>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:12}}>
              <div style={{color:C.muted,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>All transactions ({state.transactions.length})</div>
              {state.transactions.length===0&&<div style={{color:C.dim,fontSize:13}}>No transactions yet — tap a day on the calendar to add one.</div>}
              {[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)).map(t=>(
                <div key={t.id} style={{borderBottom:`1px solid ${C.border}`,paddingBottom:8,marginBottom:8}}>
                  {editId===t.id?(
                    <div style={{background:C.high,borderRadius:8,padding:10}}>
                      <div style={{display:"flex",gap:8,marginBottom:8}}>
                        <input value={editDesc} onChange={e=>setEditDesc(e.target.value)} placeholder="Description" style={{...inp,flex:2}}/>
                        <input type="number" value={editAmt} onChange={e=>setEditAmt(e.target.value)} placeholder="Amount" style={{...inp,flex:1}}/>
                      </div>
                      <select value={editCat} onChange={e=>setEditCat(e.target.value)} style={{...inp,marginBottom:8}}>
                        {CATS[t.type].map(c=><option key={c}>{c}</option>)}
                      </select>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>saveEdit(t.id)} style={{flex:1,padding:"7px",borderRadius:7,border:"none",background:C.teal,color:C.bg,fontWeight:700,fontSize:13,cursor:"pointer"}}>Save changes</button>
                        <button onClick={()=>setEditId(null)} style={{flex:1,padding:"7px",borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,cursor:"pointer"}}>Cancel</button>
                      </div>
                    </div>
                  ):(
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <span style={{fontWeight:700,fontSize:14,color:t.type==="income"?C.green:t.type==="investment"?C.blue:C.red}}>{t.type==="income"?"+":"-"}{fmt(t.amount)}</span>
                        <span style={{fontWeight:500,fontSize:13,marginLeft:10}}>{t.desc}</span>
                        <span style={{color:C.dim,fontSize:11,marginLeft:8}}>{t.category}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{color:C.dim,fontSize:11}}>{t.date}</span>
                        <button onClick={()=>startEdit(t)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,cursor:"pointer",fontSize:11,padding:"2px 8px"}}>edit</button>
                        <button onClick={()=>deleteTx(t.id)} style={{background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:15}}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
              <div style={{color:C.muted,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Account balances</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {label:"Checking",val:state.balances.checking,color:C.blue},
                  {label:"Savings",val:state.balances.savings,color:C.blue},
                  {label:"Vanguard Brokerage",val:state.balances.brokerage,color:C.purple},
                  {label:"Vanguard Roth IRA",val:state.balances.roth,color:C.purple},
                ].map(a=>(
                  <div key={a.label} style={{background:C.high,borderRadius:9,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:C.muted,fontSize:13}}>{a.label}</span>
                    <span style={{color:a.color,fontWeight:700,fontSize:13}}>{fmt(a.val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CAREER ── */}
        {mainTab==="career"&&(
          <div>
            <div style={{background:C.surface,border:`1px solid ${C.teal}`,borderRadius:12,padding:16,marginBottom:14}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>FinTech Career Roadmap</div>
              <div style={{color:C.muted,fontSize:13}}>Spring 2027 · $90–115K target · Capital One · Booz Allen · Deloitte · MITRE</div>
              <div style={{color:C.dim,fontSize:12,marginTop:4}}>CACI 7AM–3PM · Gym 3:30–5:30PM · Study 6:30PM weekdays · Fri/Sat protected social time</div>
            </div>

            {/* Weekly schedule */}
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:14}}>
              <div style={{color:C.muted,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Your weekly study schedule</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
                {WEEKLY_PLAN.map((w,i)=>(
                  <div key={i} style={{background:C.high,borderRadius:10,padding:"10px 12px",borderTop:`3px solid ${w.color}`}}>
                    <div style={{color:w.color,fontWeight:700,fontSize:12,marginBottom:2}}>{w.day}</div>
                    <div style={{color:C.text,fontSize:11,fontWeight:600,marginBottom:4}}>{w.focus}</div>
                    <div style={{color:C.dim,fontSize:10,marginBottom:8}}>{w.time}</div>
                    {w.tasks.map((task,j)=>(
                      <div key={j} style={{color:C.muted,fontSize:10,marginBottom:4,paddingLeft:8,borderLeft:`2px solid ${w.color}44`}}>{task}</div>
                    ))}
                    {w.links.length>0&&(
                      <div style={{marginTop:8,borderTop:`1px solid ${C.border}`,paddingTop:6}}>
                        {w.links.map(([name,url])=>(
                          <a key={name} href={url} target="_blank" rel="noopener noreferrer" style={{display:"block",color:w.color,fontSize:10,marginBottom:3,textDecoration:"none",fontWeight:600}}>{name} ↗</a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Phases */}
            <div style={{color:C.muted,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>12-month skill roadmap</div>
            {PHASES.map((p,i)=>(
              <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderLeft:`3px solid ${p.color}`,borderRadius:12,padding:16,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{color:p.color,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{p.phase} · {p.months}</div>
                    <div style={{fontSize:15,fontWeight:700,marginTop:2}}>{p.title}</div>
                  </div>
                  <div style={{fontSize:10,padding:"3px 8px",borderRadius:99,background:p.status==="active"?`${C.teal}22`:C.high,color:p.status==="active"?C.teal:C.dim,fontWeight:600,whiteSpace:"nowrap"}}>
                    {p.status==="active"?"🟢 Now":"Upcoming"}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                  <div>
                    <div style={{color:C.dim,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Skills</div>
                    {p.skills.map(s=><div key={s} style={{color:C.muted,fontSize:12,marginBottom:4}}>▸ {s}</div>)}
                  </div>
                  <div>
                    <div style={{color:C.dim,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Resources</div>
                    {p.links.map(([name,url])=>(
                      <a key={name} href={url} target="_blank" rel="noopener noreferrer" style={{display:"block",color:p.color,fontSize:12,marginBottom:4,textDecoration:"none",fontWeight:600}}>{name} ↗</a>
                    ))}
                  </div>
                </div>
                <div style={{background:C.high,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.muted}}>
                  <span style={{color:p.color,fontWeight:600}}>Portfolio project: </span>{p.project}
                </div>
              </div>
            ))}

            {/* Key dates */}
            <div style={{background:C.surface,border:`1px solid ${C.amber}`,borderRadius:12,padding:16}}>
              <div style={{color:C.amber,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Key dates to hit</div>
              {[
                {date:"Aug 2026",event:"New grad job apps open — start applying NOW even if you feel unprepared",color:C.red},
                {date:"Aug–Sep 2026",event:"PL-300 Power BI cert exam — target sitting it around month 8–9",color:C.purple},
                {date:"Oct 2026",event:"LinkedIn + GitHub portfolio fully polished — recruiters start screening",color:C.blue},
                {date:"Jan–Mar 2027",event:"Heavy application push — 50+ apps, interview prep daily",color:C.amber},
                {date:"Spring 2027",event:"Graduation + full-time start date target",color:C.teal},
              ].map((k,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{color:k.color,fontWeight:700,fontSize:12,minWidth:90}}>{k.date}</div>
                  <div style={{color:C.muted,fontSize:12}}>{k.event}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
