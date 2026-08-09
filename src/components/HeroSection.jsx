function HeroSection() {
  return (
    // Hero bölümünün tamamı
    <section className="bg-zinc-100">

      {/* Hero içeriğini tam ekran genişliğinde tutan ana kapsayıcı */}
      <div className="w-full">

        {/* Karikatür görselinin bulunduğu alan */}
        <div className="w-full overflow-hidden">
          <img
            src="/images/hero-cartoon.png"
            alt="FitizBaby karikatürü"
            className="block w-full h-auto"
          />
        </div>

        {/* Arama kutusu ve kategorileri ortalayan kapsayıcı */}
        {/* -mt-7 sayesinde alan karikatürün biraz üzerine çıkıyor */}
        <div className="max-w-5xl mx-auto px-6 -mt-7 relative z-10">

          {/* Arama kutusunun dış görünümü */}
          <div className="bg-white rounded-xl shadow-lg flex focus-within:ring-2 focus-within:ring-green-500 transition">

            {/* Kullanıcının ürün, marka veya kategori yazacağı alan */}
            <input
              type="text"
              placeholder="Ürün, marka veya kategori ara..."
              className="flex-1 px-5 py-4 outline-none bg-transparent"
            />

            {/* Arama butonu */}
            <button className="bg-green-500 text-white px-6 rounded-r-xl font-medium cursor-pointer transition hover:bg-green-600 flex items-center justify-center">

              {/* Arama kutusundaki büyüteç ikonu */}
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
              >

                {/* Büyütecin yuvarlak kısmı */}
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />

                {/* Büyütecin sapı */}
                <line
                  x1="16"
                  y1="16"
                  x2="21"
                  y2="21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

              </svg>
            </button>

          </div>

          {/* Kullanıcıya arama için örnek ürünler gösteren yardımcı yazı */}
          <p className="mt-2 px-1 text-sm font-light text-zinc-500">
            Örnek: Yulaf, Süt, Hindi göğsü, Lor peyniri...
          </p>

          {/* Kategori kısa yollarının bulunduğu alan */}
          <div className="mt-6 flex gap-3 justify-center">

            {/* Kahvaltılık kategorisi ve logosu */}
            <button className="bg-white px-4 py-3 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition hover:shadow-md hover:-translate-y-0.5">
              <span className="text-lg">
                🥣
              </span>
              Kahvaltılık
            </button>
            {/*Süt Ürünleri kategorisi ve logosu */}
            <button className="bg-white px-4 py-3 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition hover:shadow-md hover:-translate-y-0.5">
                <span className="text-lg">
                    🥛
                </span>
                Süt Ürünleri
            </button>
            {/*Et & Tavuk kategorisi ve logosu */}
            <button className="bg-white px-4 py-3 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition hover:shadow-md hover:-translate-y-0.5">
              <span className="text-lg">
                🍗
              </span>
              Et & Tavuk
            </button>
            {/*Atıştırmalık kategorisi ve logosu */}
            <button className="bg-white px-4 py-3 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition hover:shadow-md hover:-translate-y-0.5">
              <span className="text-lg">
                🍫
              </span>
              Atıştırmalık
            </button>
            {/*İçecek kategorisi ve logosu */}
            <button className="bg-white px-4 py-3 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition hover:shadow-md hover:-translate-y-0.5">
              <span className="text-lg">
                🥤
              </span>
              İçecekler
            </button>
            {/*Tüm Kategoriler ve logosu*/}
            <button className="border border-zinc-300 bg-white px-4 py-3 rounded-xl flex items-center gap-2 cursor-pointer transition hover:border-green-500 hover:text-green-600">
              <span className="text-lg">
                ⠿
              </span>
              Tüm Kategoriler
            </button>

          </div>

        </div>

      </div>

    </section>
  )
}

// HeroSection componentini diğer dosyalarda kullanabilmemizi sağlar
export default HeroSection