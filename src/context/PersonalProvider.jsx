import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react';
import { useAuth } from '../hooks/useAuth';
import { activatePersonal, bootstrapPersonal, isDirty, getPersonalSnapshot, subscribePersonal } from '../data/personalStorage';
export default function PersonalProvider({children}) {
  const {user,loading,error}=useAuth();
  const scope=loading||error?'pending':user?.id||'guest';
  const state=useSyncExternalStore(subscribePersonal,getPersonalSnapshot,getPersonalSnapshot);
  useLayoutEffect(()=>{activatePersonal(scope);},[scope]);
  useEffect(()=>{if(state.scope===scope&&!state.ready&&!state.error)bootstrapPersonal();},[scope,state.scope,state.ready,state.error]);
  useEffect(()=>{const guard=event=>{if(Object.values(getPersonalSnapshot().docs).some(isDirty)){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
  if(state.scope!==scope||loading||scope!=='guest'&&scope!=='pending'&&!state.ready&&!state.error)return <main className="p-10" role="status">Kişisel kayıtlar yükleniyor…</main>;
  return children;
}
