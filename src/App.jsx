import OnboardingGate from './components/OnboardingGate';
import CompanionProvider from './context/CompanionProvider';
import {lazy,Suspense} from 'react';
const SavedMeals=lazy(()=>import('./pages/SavedMeals'));
const Welcome=lazy(()=>import('./pages/Welcome'));
const History=lazy(()=>import('./pages/History'));
const Today=lazy(()=>import('./pages/Today'));
import SiteFooter from './components/SiteFooter';
import PasswordChanged from './pages/PasswordChanged';
import AccountDeleted from './pages/AccountDeleted';
import Recovery from './pages/Recovery';
import Navbar from './components/Navbar'
import Home from './pages/Home'
import{Routes, Route} from "react-router-dom";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import AuthPage from "./pages/Auth";
import Account from "./pages/Account";
import NutritionAssistant from "./pages/NutritionAssistant";
import ProductDetail from "./pages/ProductDetail";
import Compare from "./pages/Compare";
import NutritionPlan from "./pages/NutritionPlan";
import MacroTracker from "./pages/MacroTracker";
import { Link } from 'react-router-dom';


function App() {
  return (
    <CompanionProvider><div className="fitiz-app">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/saved-meals" element={<Suspense fallback={<main className="p-10">Öğünler hazırlanıyor…</main>}><SavedMeals /></Suspense>}/>
        <Route path="/welcome" element={<Suspense fallback={<main className="p-10" role="status">Başlangıç hazırlanıyor…</main>}><Welcome /></Suspense>}/>
        <Route path="/history" element={<Suspense fallback={<main className="p-10" role="status">Geçmiş hazırlanıyor…</main>}><History /></Suspense>}/>
        <Route path="/today" element={<Suspense fallback={<main className="p-10" role="status">Bugünüm hazırlanıyor…</main>}><OnboardingGate><Today /></OnboardingGate></Suspense>}/>
        <Route path="/products" element={<Products />}/>
        <Route path="/login" element={<AuthPage mode="login" />}/>
        <Route path="/register" element={<AuthPage mode="register" />}/>
        <Route path="/forgot-password" element={<Recovery key="forgot" mode="forgot" />}/>
        <Route path="/verify-email" element={<Recovery key="verify" mode="verify" />}/>
        <Route path="/reset-password" element={<Recovery key="reset" mode="reset" />}/>
        <Route path="/password-changed" element={<PasswordChanged />}/>
        <Route path="/account-deleted" element={<AccountDeleted />}/>
        <Route path="/account" element={<Account />}/>
        <Route path="/categories" element={<Categories />}/>
        <Route path="/products/:id" element={<ProductDetail />}/>
        <Route path="/assistant" element={<NutritionAssistant />}/>
        <Route path="/compare" element={<Compare />}/>
        <Route path="/nutrition-plan" element={<NutritionPlan />}/>
        <Route path="/macro-tracker" element={<MacroTracker />}/>
        <Route path="*" element={<main className="p-10 text-center"><h1>Sayfa bulunamadı</h1><Link to="/">Ana sayfa</Link></main>}/>
        <Route path="/nutrition" element={<NutritionAssistant />}/>
      </Routes>
      <SiteFooter/>
    </div></CompanionProvider>
  )
}

export default App
