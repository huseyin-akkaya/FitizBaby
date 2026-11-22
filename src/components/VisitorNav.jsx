import BrandMark from './BrandMark';
import './VisitorNav.css';
import {useState} from 'react';
import {Link} from 'react-router-dom';
import AuthActions from './AuthActions';
export default function VisitorNav(){
 const [open,setOpen]=useState(false);
 return <nav className="visitor-nav" aria-label="Ana menü"><div className="visitor-nav-inner"><Link to="/" className="visitor-brand" aria-label="FitizBaby ana sayfa"><BrandMark className="visitor-brand-symbol"/>Fitiz<span>Baby</span></Link><div className="visitor-nav-links"><a href="/#nasil-calisir">Nasıl çalışır?</a><a href="/#kesfet">Biraz keşfet</a><a href="/#neden-hesap">Neden hesap açayım?</a></div><div className="visitor-desktop-auth"><AuthActions/></div><button type="button" className="visitor-menu-toggle" aria-label={open?'Menüyü kapat':'Menüyü aç'} aria-expanded={open} aria-controls="visitor-mobile-menu" onClick={()=>setOpen(value=>!value)}>{open?'✕':'☰'}</button></div>{open&&<div id="visitor-mobile-menu" className="visitor-mobile-menu"><a href="/#nasil-calisir" onClick={()=>setOpen(false)}>Nasıl çalışır?</a><a href="/#kesfet" onClick={()=>setOpen(false)}>Biraz keşfet</a><a href="/#neden-hesap" onClick={()=>setOpen(false)}>Neden hesap açayım?</a><AuthActions onNavigate={()=>setOpen(false)}/></div>}</nav>;
}
