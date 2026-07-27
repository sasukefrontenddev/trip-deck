'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';

type Mode = 'date' | 'time' | 'datetime';
type Props = { name:string; mode?:Mode; required?:boolean; min?:string; max?:string; defaultValue?:string; value?:string; onChange?:(value:string)=>void; placeholder?:string; className?:string };
const pad=(n:number)=>String(n).padStart(2,'0');
const dateKey=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseDate=(value?:string)=>{const m=value?.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):null};
const parseTime=(value?:string)=>{const m=value?.match(/(?:T|^)(\d{2}):(\d{2})/);return m?{hour:Number(m[1]),minute:Number(m[2])}:{hour:9,minute:0}};

export default function DateTimePicker({name,mode='date',required,min,max,defaultValue='',value,onChange,placeholder,className=''}:Props){
 const controlled=value!==undefined; const [internal,setInternal]=useState(defaultValue); const selectedValue=controlled?value!:internal; const [open,setOpen]=useState(false);
 const selectedDate=parseDate(selectedValue); const initial=selectedDate||parseDate(min)||new Date(); const [view,setView]=useState(new Date(initial.getFullYear(),initial.getMonth(),1)); const [time,setTime]=useState(parseTime(selectedValue));
 const rootRef=useRef<HTMLDivElement>(null); const triggerRef=useRef<HTMLButtonElement>(null); const popoverRef=useRef<HTMLDivElement>(null); const [mounted,setMounted]=useState(false); const [position,setPosition]=useState({top:0,left:0,width:360});
 useEffect(()=>setMounted(true),[]);
 useEffect(()=>{const close=(e:MouseEvent)=>{const node=e.target as Node;if(!rootRef.current?.contains(node)&&!popoverRef.current?.contains(node))setOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
 useEffect(()=>setTime(parseTime(selectedValue)),[selectedValue]);
 useEffect(()=>{if(!open)return;const place=()=>{const r=triggerRef.current?.getBoundingClientRect();if(!r)return;const width=Math.min(360,window.innerWidth-24);const left=Math.max(12,Math.min(r.left,window.innerWidth-width-12));const estimated=470;const below=window.innerHeight-r.bottom;const top=below>=Math.min(estimated,window.innerHeight-24)?r.bottom+10:Math.max(12,r.top-estimated-10);setPosition({top,left,width})};place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}},[open]);
 const commit=(next:string)=>{if(!controlled)setInternal(next);onChange?.(next)};
 const display=useMemo(()=>{if(!selectedValue)return placeholder||(mode==='date'?'Select date':mode==='time'?'Select time':'Select date & time');if(mode==='time'){const t=parseTime(selectedValue);return new Date(2000,0,1,t.hour,t.minute).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}const d=parseDate(selectedValue);if(!d)return selectedValue;const datePart=d.toLocaleDateString([],{weekday:'short',day:'numeric',month:'short',year:'numeric'});if(mode==='date')return datePart;const t=parseTime(selectedValue);return `${datePart} · ${new Date(2000,0,1,t.hour,t.minute).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`},[selectedValue,mode,placeholder]);
 const monthStart=new Date(view.getFullYear(),view.getMonth(),1),gridStart=new Date(view.getFullYear(),view.getMonth(),1-monthStart.getDay());const days=Array.from({length:42},(_,i)=>new Date(gridStart.getFullYear(),gridStart.getMonth(),gridStart.getDate()+i));const minDate=parseDate(min),maxDate=parseDate(max);
 const chooseDate=(d:Date)=>{const key=dateKey(d);if(mode==='date'){commit(key);setOpen(false);return}commit(`${key}T${pad(time.hour)}:${pad(time.minute)}`)};
 const updateTime=(hour:number,minute:number)=>{const next={hour,minute};setTime(next);if(mode==='time')commit(`${pad(hour)}:${pad(minute)}`);else if(selectedDate)commit(`${dateKey(selectedDate)}T${pad(hour)}:${pad(minute)}`)};
 const popover=<div ref={popoverRef} className="date-picker-popover glass date-picker-portal" style={{top:position.top,left:position.left,width:position.width}}>
  <div className="date-picker-top"><div><small>{mode==='time'?'Choose a time':'Choose a date'}</small><strong>{display}</strong></div><button type="button" onClick={()=>setOpen(false)}><XMarkIcon/></button></div>
  {mode!=='time'&&<><div className="date-picker-month"><button type="button" onClick={()=>setView(new Date(view.getFullYear(),view.getMonth()-1,1))}><ChevronLeftIcon/></button><strong>{view.toLocaleDateString([],{month:'long',year:'numeric'})}</strong><button type="button" onClick={()=>setView(new Date(view.getFullYear(),view.getMonth()+1,1))}><ChevronRightIcon/></button></div><div className="date-picker-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d}>{d}</span>)}</div><div className="date-picker-grid">{days.map(d=>{const key=dateKey(d),disabled=(!!minDate&&d<minDate)||(!!maxDate&&d>maxDate),active=selectedDate&&dateKey(selectedDate)===key;return <button type="button" key={key} disabled={disabled} className={`${d.getMonth()!==view.getMonth()?'muted':''} ${active?'active':''}`} onClick={()=>chooseDate(d)}>{d.getDate()}</button>})}</div></>}
  {mode!=='date'&&<div className="date-picker-time"><label><span>Hour</span><select value={time.hour} onChange={e=>updateTime(Number(e.target.value),time.minute)}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{pad(i)}</option>)}</select></label><span>:</span><label><span>Minute</span><select value={time.minute} onChange={e=>updateTime(time.hour,Number(e.target.value))}>{[0,5,10,15,20,25,30,35,40,45,50,55].map(i=><option key={i} value={i}>{pad(i)}</option>)}</select></label></div>}
  <div className="date-picker-actions"><button type="button" className="secondary" onClick={()=>{commit('');setOpen(false)}}>Clear</button><button type="button" className="primary small" onClick={()=>setOpen(false)}>Done</button></div>
 </div>;
 return <div ref={rootRef} className={`date-picker ${className}`}><input type="hidden" name={name} value={selectedValue} required={required}/><button ref={triggerRef} type="button" className={`date-picker-trigger ${selectedValue?'has-value':''}`} onClick={()=>setOpen(v=>!v)} aria-expanded={open}><span>{mode==='time'?<ClockIcon/>:<CalendarDaysIcon/>}</span><b>{display}</b></button>{open&&mounted&&createPortal(popover,document.body)}</div>;
}
