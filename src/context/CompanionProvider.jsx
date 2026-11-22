import {useEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import {useCompanionEngine} from '../hooks/useCompanionEngine';
import {CompanionContext} from './companionContext';
import SiteCompanion from '../components/SiteCompanion';
function SessionCompanion({scope,name,children}){
 const feedback=useCompanionEngine(scope,name),location=useLocation(),current=useRef(feedback);useEffect(()=>{current.current=feedback;});
 useEffect(()=>{const path=location.pathname;if(/login|register|password|verify-email|account-deleted/.test(path))return;const category=new URLSearchParams(location.search).get('category')||'';const event=path==='/products'&&/atıştır|abur|cips|çikolata/i.test(category)?'snacks':path.startsWith('/products/')?'detail':({'/products':'products','/categories':'categories','/compare':'compare','/nutrition-plan':'plan','/today':'today','/macro-tracker':'today','/assistant':'assistant','/nutrition':'assistant','/account':'account'})[path]||'welcome';const timer=setTimeout(()=>current.current.speak(event),1200);const pause=setTimeout(()=>current.current.speak('pause'),120000);return()=>{clearTimeout(timer);clearTimeout(pause);current.current.clearPresentation();};},[location.pathname,location.search]);
 return <CompanionContext.Provider value={feedback}>{children}<SiteCompanion feedback={feedback}/></CompanionContext.Provider>;
}
export default function CompanionProvider({children}){const {user,loading}=useAuth();const scope=loading?'pending':user?.id||'guest';return <SessionCompanion key={scope} scope={scope} name={user?.name?.trim().split(/\s+/)[0]||'arkadaşım'}>{children}</SessionCompanion>;}
