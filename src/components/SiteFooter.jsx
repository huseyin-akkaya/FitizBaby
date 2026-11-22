import {Link,useLocation} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import BrandMark from './BrandMark';
export default function SiteFooter(){const {user}=useAuth(),{pathname}=useLocation();if(!user&&pathname==='/')return null;return <footer className="app-footer"><Link to="/" className="app-footer-brand"><BrandMark/><span>Fitiz<span>Baby</span></span></Link><p>Kendini tanı. Seçimlerini keşfet.</p><div className="app-footer-links"><Link to={user?'/products':'/'}>{user?'Ürünler':'Keşfet'}</Link><Link to={user?'/account':'/login'}>{user?'Hesabım':'Giriş yap'}</Link></div></footer>;}
