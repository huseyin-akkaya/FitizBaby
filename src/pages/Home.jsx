import {lazy,Suspense} from 'react';
import {useAuth} from '../hooks/useAuth';
import HeroSection from '../components/HeroSection';
import FeatureSection from '../components/FeatureSection';
const VisitorHome=lazy(()=>import('./VisitorHome'));
export default function Home(){
 const {user,loading}=useAuth();
 if(loading)return <main className="p-10" role="status">Oturum kontrol ediliyor…</main>;
 if(user)return <main><HeroSection/><FeatureSection/></main>;
 return <Suspense fallback={<main className="min-h-[70vh] bg-[#f8f7ef] p-10" role="status">FitizBaby hazırlanıyor…</main>}><VisitorHome/></Suspense>;
}
