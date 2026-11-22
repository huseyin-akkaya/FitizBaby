import {useEffect,useRef,useState} from 'react';
import {dailyNutrients,summarizeDay,savedTargets} from '../utils/todaySummary';
const defaults={sound:true,haptics:true,motion:true};
const preferenceKey='fitizbaby.feedback.v1';
export function goalReaction(before,after,goals){
 const reached=[],over=[];
 for(const {key,label} of dailyNutrients){const target=goals[key],a=before[key],b=after[key];if(!(target>0)||a.missing||b.missing)continue;if(a.value<target&&b.value>=target)reached.push(label);if(a.value<=target&&b.value>target)over.push(label);}
 return{reached,over};
}
export function useTodayFeedback(){
 const [preferences,setPreferences]=useState(()=>{try{const stored=JSON.parse(localStorage.getItem(preferenceKey));return Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,typeof stored?.[key]==='boolean'?stored[key]:value]));}catch{return defaults;}}),[reaction,setReaction]=useState(null);
 const audio=useRef(null),timer=useRef(null),sequence=useRef(0);
 useEffect(()=>()=>{clearTimeout(timer.current);audio.current?.close().catch(()=>{});},[]);
 function setPreference(key,value){const next={...preferences,[key]:value};setPreferences(next);try{localStorage.setItem(preferenceKey,JSON.stringify(next));}catch{/* Preferences still apply in this tab. */}if(key==='haptics'&&!value)navigator.vibrate?.(0);}
 function prepare(){if(!preferences.sound)return;try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;audio.current??=new Context();audio.current.resume().catch(()=>{});}catch{/* Unsupported feedback never blocks saving. */}}
 function respond(type,before,after,catalog,targets){
  const goals=goalReaction(summarizeDay(before,catalog).totals,summarizeDay(after,catalog).totals,savedTargets(targets));
  const kind=goals.over.length?'over':goals.reached.length?'goal':type;
  const message=kind==='over'?`Hey, biraz yavaşlayalım 😊 ${goals.over.join(', ')} hedefini geçtin. Bu bir yarış değil; istersen porsiyonu gözden geçirelim.`:kind==='goal'?`${goals.reached.join(', ')} hedefine ulaştın! Küçük adımların birikti ✨`:type==='delete'?'Kayıt kaldırıldı. Birlikte güncelledik.':type==='add'?'Öğünün eklendi. Küçük bir adım daha 🌱':'Miktarın güncellendi. Buradayım 🌿';
  setReaction({id:++sequence.current,kind,message,celebrate:goals.reached.length>0});clearTimeout(timer.current);timer.current=setTimeout(()=>setReaction(null),kind==='over'?10000:6500);
  if(preferences.haptics){try{navigator.vibrate?.(type==='delete'?[25,45,25]:kind==='goal'?[20,35,35]:[18]);}catch{/* Optional device capability. */}}
  if(preferences.sound&&audio.current?.state==='running'){try{const ctx=audio.current,notes=type==='delete'?[440,294]:kind==='goal'?[523,659,784]:[587,784];notes.forEach((frequency,index)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+index*.09;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.035,start+.012);gain.gain.exponentialRampToValueAtTime(.001,start+.16);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(start);oscillator.stop(start+.18);});}catch{/* Saving has already succeeded. */}}
 }
 return{preferences,setPreference,prepare,respond,reaction,dismiss:()=>setReaction(null)};
}
