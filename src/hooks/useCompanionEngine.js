import {chooseCompanionStory} from '../utils/companionStories';
import {useCallback,useEffect,useRef,useState} from 'react';
import {dailyNutrients,summarizeDay,savedTargets} from '../utils/todaySummary';
import {companionMessage} from '../utils/companionMessages';
const defaults={enabled:true,jokes:true,roam:true,fade:true,wave:true,squat:true,rope:true,pullup:true,pushup:true,situp:true,slip:true,sound:true,haptics:true,motion:true,personalize:true,automatic:true,fun:true,funny:false,serious:false,absurd:false};

export function goalReaction(before,after,goals){
 const reached=[],over=[];
 for(const {key,label} of dailyNutrients){const target=goals[key],a=before[key],b=after[key];if(!(target>0)||a.missing||b.missing)continue;if(a.value<target&&b.value>=target)reached.push(label);if(a.value<=target&&b.value>target)over.push(label);}
 return{reached,over};
}
export function useCompanionEngine(scope,name){
 const preferenceKey='fitizbaby.companion.v2.'+scope;
 const [preferences,setPreferences]=useState(()=>{try{const stored=JSON.parse(localStorage.getItem(preferenceKey))||JSON.parse(localStorage.getItem('fitizbaby.feedback.v1'));return {...Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,typeof stored?.[key]==='boolean'?stored[key]:value])),frequency:['quiet','normal','lively'].includes(stored?.frequency)?stored.frequency:'normal'};}catch{return defaults;}}),[reaction,setReaction]=useState(null);
 const audio=useRef(null),timer=useRef(null),sequence=useRef(0),lastMessage=useRef(0);
 const panelBusy=useRef(false);const setPanelBusy=useCallback(value=>{panelBusy.current=value;if(value&&channel.current.active?.reaction.kind==='chat'){clearTimeout(timer.current);channel.current.active=null;setReaction(null);}},[]);
 const storyIndex=useRef(0);const nextStory=useCallback(options=>chooseCompanionStory(options,storyIndex.current++),[]);
 const channel=useRef({scene:null,active:null,pending:[]});
 const show=useCallback(function display(item){const state=channel.current;state.active=item;lastMessage.current=Date.now();setReaction(item.reaction);clearTimeout(timer.current);timer.current=setTimeout(()=>{state.active=null;setReaction(null);const next=state.pending.shift();if(next&&!state.scene)display(next);},item.duration);},[]);
 const enqueue=useCallback((reaction,duration)=>{const state=channel.current,item={reaction,duration};if(state.scene||state.active){if(state.pending.length>=3)state.pending.shift();state.pending.push(item);}else show(item);},[show]);
 const beginScene=useCallback(()=>{const state=channel.current;if(state.scene||state.active)return null;const token=Symbol('filiz-scene');state.scene=token;return token;},[]);
 const endScene=useCallback(token=>{const state=channel.current;if(state.scene!==token)return;state.scene=null;lastMessage.current=Date.now();const next=state.pending.shift();if(next)show(next);},[show]);
 const dismiss=useCallback(()=>{clearTimeout(timer.current);channel.current.active=null;setReaction(null);const next=channel.current.pending.shift();if(next&&!channel.current.scene)show(next);},[show]);
 const clearPresentation=useCallback(()=>{clearTimeout(timer.current);channel.current={scene:null,active:null,pending:[]};setReaction(null);},[]);
 useEffect(()=>()=>{clearTimeout(timer.current);audio.current?.close().catch(()=>{});},[]);
 function setPreference(key,value){const next={...preferences,[key]:value};setPreferences(next);try{localStorage.setItem(preferenceKey,JSON.stringify(next));}catch{/* Preferences still apply in this tab. */}if(key==='enabled'&&!value)clearPresentation();if(key==='haptics'&&!value){try{navigator.vibrate?.(0);}catch{/* Optional. */}}}
 function applyPreferences(patch){const allowed=Object.fromEntries(Object.entries(patch).filter(([key,value])=>Object.hasOwn(defaults,key)&&typeof value==='boolean'||key==='frequency'&&['quiet','normal','lively'].includes(value)));const next={...preferences,...allowed};setPreferences(next);if(!next.enabled)clearPresentation();try{localStorage.setItem(preferenceKey,JSON.stringify(next));return true;}catch{return false;}}
 function prepare(){if(!preferences.enabled||!preferences.sound)return;try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;audio.current??=new Context();audio.current.resume().catch(()=>{});}catch{/* Unsupported feedback never blocks saving. */}}
 function playCue(type,kind){
  if(preferences.haptics){try{navigator.vibrate?.(type==='delete'?[25,45,25]:kind==='goal'?[20,35,35]:[18]);}catch{/* Optional device capability. */}}
  if(preferences.sound&&audio.current?.state==='running'){try{const ctx=audio.current,notes=type==='delete'?[440,294]:kind==='goal'?[523,659,784]:[587,784];notes.forEach((frequency,index)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+index*.09;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.035,start+.012);gain.gain.exponentialRampToValueAtTime(.001,start+.16);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(start);oscillator.stop(start+.18);});}catch{/* Saving has already succeeded. */}}
 }
 function respond(type,before,after,catalog,targets){
  if(!preferences.enabled)return;
  const goals=goalReaction(summarizeDay(before,catalog).totals,summarizeDay(after,catalog).totals,savedTargets(targets));
  const kind=goals.over.length?'over':goals.reached.length?'goal':type;
  const message=companionMessage(kind,preferences,preferences.personalize?name:'arkadaşım',sequence.current);if(!message)return;
  enqueue({id:++sequence.current,kind,message,celebrate:goals.reached.length>0},kind==='over'?10000:6500);
  playCue(type,kind);
 }
 function respondAchievement(id){if(!preferences.enabled)return;const events={'first-meal':'rhythmfirst','week-three':'rhythmthree','week-five':'rhythmfive','welcome-back':'rhythmreturn'},event=events[id];if(!event)return;const message=companionMessage(event,preferences,preferences.personalize?name:'arkadaşım',sequence.current);if(!message)return;enqueue({id:++sequence.current,kind:'achievement',message,celebrate:true},8500);playCue('add','goal');}
 function respondWater(milestone,undo=false){if(!preferences.enabled)return;const message=companionMessage(milestone?'water'+milestone:undo?'waterundo':'wateradd',preferences,preferences.personalize?name:'arkadaşım',sequence.current);if(!message)return;enqueue({id:++sequence.current,kind:'water',message,celebrate:Boolean(milestone)},6500);playCue(undo?'delete':'add',milestone?'goal':'add');}
 function speak(event,force=false){if(!preferences.enabled||(!force&&panelBusy.current)||(!force&&!preferences.automatic)||document.visibilityState==='hidden')return;if(channel.current.scene||channel.current.active){if(!force)return;}const now=Date.now();const cooldown={quiet:120000,normal:45000,lively:20000}[preferences.frequency]||45000;if(!force&&now-lastMessage.current<cooldown)return;const message=companionMessage(event,preferences,preferences.personalize?name:'arkadaşım',sequence.current);if(!message)return;enqueue({id:++sequence.current,kind:'chat',message},8500);}

 return{scope,preferences,speak,setPreference,prepare,respond,reaction,dismiss,clearPresentation,beginScene,endScene,setPanelBusy,nextStory,applyPreferences,respondWater,respondAchievement};
}
