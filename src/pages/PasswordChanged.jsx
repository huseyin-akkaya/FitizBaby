import {Link} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
export default function PasswordChanged(){
 const {passwordChanged:completed}=useAuth();
 return <main className="min-h-[60vh] bg-zinc-50 px-4 py-12"><section className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-6"><h1 className="text-2xl font-bold">{completed?'Parolan değiştirildi':'Hesap güvenliği'}</h1><p className="mt-4 text-sm leading-6">{completed?'Bu hesapta açık olan tüm oturumlar kapatıldı. Bekleyen güvenlik bağlantıları geçersiz oldu. Ürün ve beslenme kayıtların korunuyor. Yeni parolanla tekrar giriş yapabilirsin.':'Hesap güvenliği işlemleri için giriş yapabilirsin.'}</p><Link to="/login" className="mt-5 inline-block rounded-xl bg-green-700 px-4 py-3 font-semibold text-white">Giriş sayfası</Link></section></main>;
}
