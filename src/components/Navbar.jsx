import {useState} from "react";
import {Link} from "react-router-dom";

function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        // Sayfanın üst kısmındaki ana navigasyon alanı
        <nav className="w-full bg-zinc-950 text-white border-b border-zinc-800">

            {/* Navbar içeriğini belirli bir genişlikte tutar ve yatay olarak ortalar */}
            <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-6">

                {/* Logo ikonu ve FitizBaby yazısını birlikte tutan alan */}
                <div className="flex items-center gap-0 shrink-0">

                    {/* FitizBaby için oluşturduğumuz özel SVG logo alanı */}
                    <div className="w-10 h-10">

                        {/* Rüzgârla tabaktan uçan kalorileri temsil eden SVG logo */}
                        <svg viewBox="0 0 64 64" className="w-full h-full">

                            {/* Tabağın dış kısmı */}
                            <ellipse
                                cx="32"
                                cy="39"
                                rx="21"
                                ry="7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />

                            {/* Tabağın iç kısmı */}
                            <ellipse
                                cx="32"
                                cy="41"
                                rx="16"
                                ry="4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            />

                            {/* Tabaktan uçan birinci kalori parçacığı */}
                            <circle
                                cx="19"
                                cy="24"
                                r="2.5"
                                fill="currentColor"
                            />

                            {/* Tabaktan uçan ikinci kalori parçacığı */}
                            <circle
                                cx="28"
                                cy="18"
                                r="2"
                                fill="currentColor"
                            />

                            {/* Tabaktan uçan üçüncü kalori parçacığı */}
                            <circle
                                cx="34"
                                cy="22"
                                r="2.3"
                                fill="currentColor"
                            />

                            {/* Üst rüzgâr çizgisi */}
                            <path
                                d="M 41 18 C 47 15, 53 16, 58 13"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />

                            {/* Alt rüzgâr çizgisi */}
                            <path
                                d="M 39 25 C 45 22, 51 23, 56 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />

                        </svg>
                    </div>

                    {/* Site adı / yazı logosu */}
                    <span className="text-2xl font-bold leading-none">
                        Fitiz
                        <span className="text-green-500">
                            Baby
                        </span>
                    </span>

                </div>

                {/* Navbar'ın ortasında bulunan sayfa bağlantıları */}
                <div className="hidden xl:flex flex-1 justify-center gap-8 text-sm font-medium whitespace-nowrap">

                    {/* Ürünler sayfası bağlantısı */}
                    <Link to="/products" className="transition hover:text-green-400">
                        Ürünler
                    </Link>

                    {/* Kategoriler sayfası bağlantısı */}
                    <Link to="/categories" className="transition hover:text-green-400">Kategoriler</Link>

                    {/* Ürün karşılaştırma sayfası bağlantısı */}
                    <Link to="/compare" className="transition hover:text-green-400">Karşılaştır</Link>

                    {/* Kullanıcının beslenme planına ulaşacağı bağlantı */}
                    <Link to="/nutrition-plan" className="transition hover:text-green-400">Beslenme Planım
                    </Link>

                    {/* Yapay zekâ asistanı bağlantısı */}
                    <Link
                        to="/assistant"
                        className="flex items-center gap-2 transition hover:text-green-400"
                    >
                        AI Asistan

                        {/* AI Asistan özelliğinin geliştirme aşamasını belirten rozet */}
                        <span className="bg-green-500 px-2 py-0.5 text-xs rounded-md font-semibold">
                            Geliştirme aşamasında
</span>
                    </Link>

                </div>

                {/* Navbar'ın sağ tarafındaki kullanıcı işlemleri */}
                <div className="hidden xl:flex gap-3 shrink-0">

                    {/* Kullanıcı giriş butonu */}
                    <button className="bg-zinc-800 px-4 py-2 rounded-lg text-sm font-medium transition hover:bg-zinc-700 cursor-pointer">
                        Giriş Yap
                    </button>

                    {/* Yeni kullanıcı kayıt butonu */}
                    <button className="bg-green-500 px-4 py-2 rounded-lg text-sm font-medium transition hover:bg-green-600 hover:shadow-md cursor-pointer shadow-sm">
                        Kayıt Ol
                    </button>

                </div>
                {/* Mobil veya küçük ekran cihazlar için hamburger menü butonu */}
                <button aria-label="Menüyü aç veya kapat" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(!isMenuOpen)} className="xl:hidden p-2 rounded-lg cursor-pointer transition hover:bg-zinc-800">
                     {isMenuOpen ? (
                        <svg viewBox="0 0 24 24" className="w-6 h-6">
                            <line
                                x1="5"
                                y1="5"
                                x2="19"
                                y2="19"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />

                            <line
                                x1="19"
                                y1="5"
                                x2="5"
                                y2="19"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />

                        </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" className="w-6 h-6">
                        <line
                            x1="4"
                            y1="6"
                            x2="20"
                            y2="6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                        <line
                            x1="4"
                            y1="12"
                            x2="20"
                            y2="12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                        <line
                            x1="4"
                            y1="18"
                            x2="20"
                            y2="18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                      
                    </svg>)}

                    
                </button>

            </div>
            {/* Mobil menü açıldığında gösterilecek içerik */}
             <div
                className={`xl:hidden overflow-hidden border-t border-zinc-800 bg-zinc-950 px-6 transition-all duration-200 ease-out ${
                    isMenuOpen
                    ? "max-h-96 py-4 opacity-100"
                    : "max-h-0 py-0 opacity-0"
                }`}
                >
                   
                    {/* Mobil menüdeki sayfa bağlantıları */}
                    <div className="flex flex-col gap-4">
                        <Link to="/products" onClick={() => setIsMenuOpen(false)} className="transition hover:text-green-400">
                            Ürünler
                        </Link>
                        <Link to="/categories" className="transition hover:text-green-400" onClick={() => setIsMenuOpen(false)}>Kategoriler</Link>
                        <Link to="/compare" className="transition hover:text-green-400" onClick={() => setIsMenuOpen(false)}>Karşılaştır</Link>
                        <Link to="/nutrition-plan" onClick={() => setIsMenuOpen(false)} className="transition hover:text-green-400">
                            Beslenme Planım
                        </Link>
                        <Link
                            to="/assistant"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-2 transition hover:text-green-400"
                            >
                            AI Asistan

                            <span className="rounded-md bg-green-500 px-2 py-0.5 text-xs font-semibold">
                                Geliştirme aşamasında
</span>
                        </Link>
                        
                    </div>
                    {/* Mobil menüdeki kullanıcı işlemleri */}
                    <div className="mt-2 flex gap-3 border-t border-zinc-800 pt-4">
                        <button className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition hover:bg-zinc-700">
                            Giriş Yap
                        </button>
                        <button className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium transition hover:bg-green-600 ">
                            Kayıt Ol
                        </button>
                    </div>
                        
                </div>
                
            

        </nav>
    )
}

// Navbar componentini App.jsx gibi diğer dosyalarda kullanabilmemizi sağlar
export default Navbar
