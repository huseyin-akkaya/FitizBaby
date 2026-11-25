import {useEffect,useState,useSyncExternalStore} from 'react';
import {getPersonalSnapshot,subscribePersonal,loadRecentProducts} from '../data/personalStorage';
export function useRecentProducts(day,enabled){
 const state=useSyncExternalStore(subscribePersonal,getPersonalSnapshot,getPersonalSnapshot),[result,setResult]=useState(null),[attempt,setAttempt]=useState(0);
 const signature=state.scope+':'+day+':'+state.docs['day:'+day]?.revision+':'+attempt;
 useEffect(()=>{let active=true;if(!enabled||!state.ready||['guest','pending'].includes(state.scope))return;loadRecentProducts(day).then(data=>{if(active)setResult({signature,data});}).catch(error=>{if(active)setResult({signature,error:error.message});});return()=>{active=false;};},[signature,state.scope,state.ready,day,enabled]);
 const current=result?.signature===signature?result:null;
 return{items:current?.data?.items||[],loaded:Boolean(current?.data),loading:!current,error:current?.error,retry:()=>setAttempt(value=>value+1)};
}
