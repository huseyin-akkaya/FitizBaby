function Navbar() {

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
                <div className="flex flex-1 justify-center gap-8 text-sm font-medium whitespace-nowrap">

                    {/* Ürünler sayfası bağlantısı */}
                    <a href="#" className="transition hover:text-green-400">
                        Ürünler
                    </a>

                    {/* Kategoriler sayfası bağlantısı */}
                    <a href="#" className="transition hover:text-green-400">
                        Kategoriler
                    </a>

                    {/* Ürün karşılaştırma sayfası bağlantısı */}
                    <a href="#" className="transition hover:text-green-400">
                        Karşılaştır
                    </a>

                    {/* Kullanıcının beslenme planına ulaşacağı bağlantı */}
                    <a href="#" className="transition hover:text-green-400">
                        Beslenme Planım
                    </a>

                    {/* Yapay zekâ asistanı bağlantısı */}
                    <a
                        href="#"
                        className="flex items-center gap-2 transition hover:text-green-400"
                    >
                        AI Asistan

                        {/* AI Asistan özelliğinin yeni olduğunu belirten rozet */}
                        <span className="bg-green-500 px-2 py-0.5 text-xs rounded-md font-semibold">
                            Yeni
                        </span>
                    </a>

                </div>

                {/* Navbar'ın sağ tarafındaki kullanıcı işlemleri */}
                <div className="flex gap-3 shrink-0">

                    {/* Kullanıcı giriş butonu */}
                    <button className="bg-zinc-800 px-4 py-2 rounded-lg text-sm font-medium transition hover:bg-zinc-700 cursor-pointer">
                        Giriş Yap
                    </button>

                    {/* Yeni kullanıcı kayıt butonu */}
                    <button className="bg-green-500 px-4 py-2 rounded-lg text-sm font-medium transition hover:bg-green-600 hover:shadow-md cursor-pointer shadow-sm">
                        Kayıt Ol
                    </button>

                </div>

            </div>

        </nav>
    )
}

// Navbar componentini App.jsx gibi diğer dosyalarda kullanabilmemizi sağlar
export default Navbar