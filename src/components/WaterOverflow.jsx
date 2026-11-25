import {createPortal} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import './WaterOverflow.css';

export default function WaterOverflow({enabled,event,spout,color}){
 const [streams,setStreams]=useState([]),[bounds,setBounds]=useState(null);
 const timers=useRef(new Set()),source=useRef(spout),consumed=useRef(null);
 useEffect(()=>{source.current=spout;});
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   if(!enabled){
    consumed.current=event?.id;
    for(const timer of timers.current)clearTimeout(timer);
    timers.current.clear();setStreams([]);return;
   }
   if(!event||consumed.current===event.id)return;
   consumed.current=event.id;
   setStreams(old=>[...old.slice(-2),event]);
   const timer=setTimeout(()=>{setStreams(old=>old.filter(item=>item.id!==event.id));timers.current.delete(timer);},10500);
   timers.current.add(timer);
  });
  return()=>cancelAnimationFrame(frame);
 },[event,enabled]);
 useEffect(()=>{
  if(!streams.length)return;
  // Follow the bottle through both dragging and its short settling animation.
  // This loop exists only while a bounded overflow stream is visible.
  let frame,last=0;
  function measure(now){
   if(now-last>=32){
    last=now;
    const start=source.current(),app=document.querySelector('.fitiz-app');
    if(start&&app){
     const next={x:Math.max(12,Math.min(innerWidth-12,start.x)),y:Math.max(0,start.y),width:document.documentElement.clientWidth,height:Math.max(innerHeight,Math.ceil(app.getBoundingClientRect().bottom+scrollY))};
     setBounds(previous=>previous&&Object.keys(next).every(key=>next[key]===previous[key])?previous:next);
    }
   }
   frame=requestAnimationFrame(measure);
  }
  frame=requestAnimationFrame(measure);
  return()=>cancelAnimationFrame(frame);
 },[streams]);
 useEffect(()=>()=>{for(const timer of timers.current)clearTimeout(timer);},[]);
 if(!enabled||!streams.length||!bounds)return null;
 const colors={mint:'#75bca9',sky:'#6ab4d3',violet:'#a398cc'},edge=bounds.x>bounds.width/2?bounds.width-18:18;
 const path=`M ${bounds.x} ${bounds.y} C ${bounds.x+30} ${bounds.y-20},${bounds.x+35} ${bounds.y+40},${edge} ${bounds.y+120} C ${edge-12} ${bounds.y+230},${edge+12} ${bounds.height-120},${edge} ${bounds.height+65}`;
 return createPortal(<div className="water-overflow-layer" aria-hidden="true" style={{height:bounds.height+'px','--flow-color':colors[color]||colors.mint}}>{streams.map(item=><svg key={item.id} className="water-overflow-stream" data-ml={item.ml} viewBox={`0 0 ${bounds.width} ${bounds.height}`} preserveAspectRatio="none"><path className="water-overflow-river" d={path} pathLength="1" fill="none" stroke="var(--flow-color)" strokeWidth={Math.min(20,4+Math.sqrt(item.ml/100)*3)} strokeLinecap="round"/><path className="water-overflow-glint" d={path} pathLength="1" fill="none" stroke="#e2f7ff" strokeWidth="2" strokeLinecap="round"/></svg>)}</div>,document.body);
}
