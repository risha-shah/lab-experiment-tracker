import React, {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LineChart,Line,BarChart,Bar,CartesianGrid,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts';
import {FlaskConical,Plus,Upload,Trash2} from 'lucide-react';
import './style.css';

const API=import.meta.env.VITE_API_URL||'http://localhost:8000';
async function api(path,options){
  const r=await fetch(API+path,options);
  if(!r.ok){let detail;try{detail=(await r.json()).detail}catch{}throw new Error(typeof detail==='string'?detail:'Request failed: '+r.status)}
  return r.status===204?null:r.json();
}
const json=(data)=>({headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function App(){
  const [experiments,setExperiments]=useState([]),[current,setCurrent]=useState(null),[detail,setDetail]=useState(null);
  const [title,setTitle]=useState(''),[description,setDescription]=useState('');
  const [trial,setTrial]=useState(''),[condition,setCondition]=useState(''),[value,setValue]=useState(''),[unit,setUnit]=useState('cm');
  const [chart,setChart]=useState('line'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function refresh(id){
    const list=await api('/api/experiments');setExperiments(list);
    const chosen=id&&list.some(x=>x.id===id)?id:(list[0]?.id||null);
    setCurrent(chosen);setDetail(chosen?await api('/api/experiments/'+chosen):null);
  }
  useEffect(()=>{refresh(null).catch(e=>setError(e.message))},[]);
  async function run(fn){setBusy(true);setError('');try{await fn()}catch(e){setError(e.message)}finally{setBusy(false)}}
  function create(e){e.preventDefault();run(async()=>{const created=await api('/api/experiments',{method:'POST',...json({title,description})});setTitle('');setDescription('');await refresh(created.id)})}
  function add(e){e.preventDefault();run(async()=>{await api('/api/experiments/'+current+'/measurements',{method:'POST',...json({trial,condition,value:Number(value),unit})});setTrial('');setCondition('');setValue('');await refresh(current)})}
  function upload(e){const file=e.target.files?.[0];if(!file)return;run(async()=>{const data=new FormData();data.append('file',file);await api('/api/experiments/'+current+'/upload',{method:'POST',body:data});await refresh(current)});e.target.value=''}
  function remove(){if(!window.confirm('Delete this experiment and all of its measurements?'))return;run(async()=>{await api('/api/experiments/'+current,{method:'DELETE'});await refresh(null)})}
  function demo(){run(async()=>{const created=await api('/api/experiments',{method:'POST',...json({title:'Plant Growth vs Temperature',description:'Comparing plant growth across five temperature conditions.'})});const data=[['15°C',2.1],['20°C',3.2],['25°C',4.8],['30°C',4.1],['35°C',2.9]];for(let i=0;i<data.length;i++)await api('/api/experiments/'+created.id+'/measurements',{method:'POST',...json({trial:String(i+1),condition:data[i][0],value:data[i][1],unit:'cm'})});await refresh(created.id)})}
  const rows=detail?.measurements||[];
  const values=rows.map(r=>r.value);
  const mean=values.length?(values.reduce((a,b)=>a+b,0)/values.length).toFixed(2):'—';
  const plot=rows.map(r=>({name:r.condition,value:r.value}));
  const units=[...new Set(rows.map(r=>r.unit))];
  return <div className="layout">
    <aside><div className="brand"><FlaskConical/> labnote<span>.</span></div><div className="navtitle">WORKSPACE</div><div className="navheading">Experiments <b>{experiments.length}</b></div><div className="navtitle">YOUR EXPERIMENTS</div>
      {experiments.map(x=><button className={'navitem '+(x.id===current?'active':'')} key={x.id} disabled={busy} onClick={()=>run(()=>refresh(x.id))}>{x.title}</button>)}
      <p className="sidebar-footer">A student-built science project</p>
    </aside>
    <main><header><div><div className="eyebrow">EXPERIMENT WORKSPACE</div><h1>Make sense of your experiments.</h1><p className="muted">Record trials, upload data, and compare results in one place.</p></div><FlaskConical className="heroicon" size={36}/></header>
      {error&&<div className="error" role="alert">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}
      <section className="panel new"><div><h2>New experiment</h2><p className="muted">Start with a question you want to test.</p></div><form onSubmit={create}><input aria-label="Experiment title" placeholder="Experiment title" minLength="2" required value={title} onChange={e=>setTitle(e.target.value)}/><input aria-label="Description" placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)}/><button disabled={busy} className="primary"><Plus size={16}/> Create</button></form></section>
      {!detail?<section className="empty"><FlaskConical size={40}/><h2>Your lab starts here</h2><p>Create an experiment or explore the sample data.</p><button className="primary" onClick={demo} disabled={busy}>Load sample experiment</button></section>:<>
        <div className="titlebar"><div><div className="eyebrow">CURRENT EXPERIMENT</div><h2>{detail.title}</h2><p className="muted">{detail.description||'Add measurements below to get started.'}</p></div><button className="danger" onClick={remove} disabled={busy}><Trash2 size={16}/> Delete</button></div>
        <div className="stats"><div><small>Measurements</small><strong>{rows.length}</strong></div><div><small>Average</small><strong>{mean}</strong></div><div><small>Minimum</small><strong>{values.length?Math.min(...values):'—'}</strong></div><div><small>Maximum</small><strong>{values.length?Math.max(...values):'—'}</strong></div></div>
        <section className="panel"><div className="panelheading"><div><h2>Results visualization</h2><p className="muted">Compare results across experimental conditions.</p></div><div className="tabs"><button className={chart==='line'?'selected':''} onClick={()=>setChart('line')}>Line</button><button className={chart==='bar'?'selected':''} onClick={()=>setChart('bar')}>Bar</button></div></div>
          {rows.length?<div className="chart"><ResponsiveContainer width="100%" height="100%">{chart==='line'?<LineChart data={plot}><CartesianGrid stroke="#e5ebe8" strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Line type="monotone" dataKey="value" stroke="#2b8973" strokeWidth={3}/></LineChart>:<BarChart data={plot}><CartesianGrid stroke="#e5ebe8" strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#2b8973" radius={[5,5,0,0]}/></BarChart>}</ResponsiveContainer></div>:<div className="placeholder">Your chart will appear after you add measurements.</div>}
          {units.length>1&&<p className="warning">Multiple units found ({units.join(', ')}). Compare only measurements with matching units.</p>}
        </section>
        <section className="panel"><div className="panelheading"><div><h2>Record measurements</h2><p className="muted">Add a trial manually or import your CSV.</p></div><label className="upload"><Upload size={16}/> Upload CSV<input type="file" accept=".csv,text/csv" disabled={busy} onChange={upload}/></label></div>
          <form className="measureform" onSubmit={add}><input aria-label="Trial" placeholder="Trial" required value={trial} onChange={e=>setTrial(e.target.value)}/><input aria-label="Condition" placeholder="Condition" required value={condition} onChange={e=>setCondition(e.target.value)}/><input aria-label="Value" type="number" step="any" placeholder="Value" required value={value} onChange={e=>setValue(e.target.value)}/><input aria-label="Unit" placeholder="Unit" required value={unit} onChange={e=>setUnit(e.target.value)}/><button disabled={busy} className="primary"><Plus size={16}/> Add</button></form>
          <div className="table-scroll"><table><thead><tr><th>Trial</th><th>Condition</th><th>Value</th><th>Unit</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.trial}</td><td>{r.condition}</td><td>{r.value}</td><td>{r.unit}</td></tr>)}{!rows.length&&<tr><td colSpan="4" className="nodata">No measurements yet</td></tr>}</tbody></table></div>
          <p className="hint">CSV columns: trial,condition,value,unit · 1,000 rows maximum</p>
        </section>
      </>}
      <footer>Labnote — Experiment tracking for curious students</footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
