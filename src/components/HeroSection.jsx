import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { homeCategoryShortcuts } from "../data/productCategories";

function HeroSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
  };

  return (
    // Hero bölümünün tamamı
    <section className="bg-white">

      {/* Hero içeriğini tam ekran genişliğinde tutan ana kapsayıcı */}
      <div className="w-full">

        {/* Karikatür görselinin bulunduğu alan */}
        <div className="w-full overflow-hidden">
          <img
            src="/images/hero-cartoon.png"
            alt="FitizBaby karikatürü"
            className="block w-full h-[260px] sm:h-[340px] lg:h-auto object-cover object-top"
          />
        </div>

      <div className="relative z-10 -mt-6 rounded-t-3xl bg-white pt-6 shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
        {/* Arama kutusu ve kategorileri ortalayan kapsayıcı */}

        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* Arama kutusunun dış görünümü */}
          <form onSubmit={handleSearch} role="search" className="bg-white rounded-xl shadow-lg flex focus-within:ring-2 focus-within:ring-green-500 transition">

            {/* Kullanıcının ürün, marka veya kategori yazacağı alan */}
            <input
              type="text"
              placeholder="Ürün, marka veya kategori ara..."
              aria-label="Ürün, marka veya kategori ara"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="flex-1 px-5 py-4 outline-none bg-transparent"
            />

            {/* Arama butonu */}
            <button type="submit" aria-label="Ara" className="bg-green-500 text-white px-6 rounded-r-xl font-medium cursor-pointer transition hover:bg-green-600 flex items-center justify-center">

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

          </form>

          {/* Kullanıcıya arama için örnek ürünler gösteren yardımcı yazı */}
          <p className="mt-2 px-1 text-sm font-light text-zinc-500">
            Örnek: Yulaf Ezmesi, Pınar, Süt Ürünleri...
          </p>

          {/* Kategori kısa yollarının bulunduğu alan */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
            {homeCategoryShortcuts.map(({ name, icon }) => (
              <Link
                key={name}
                to={`/products?category=${encodeURIComponent(name)}`}
                className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                <span className="text-lg" aria-hidden="true">{icon}</span>
                {name}
              </Link>
            ))}
            <Link to="/products" className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-4 py-3 transition hover:border-green-500 hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
              <span className="text-lg" aria-hidden="true">⠿</span>
              Tüm Kategoriler
            </Link>

          </div>

        </div>

      </div>

      </div>

    </section>
  )
}

// HeroSection componentini diğer dosyalarda kullanabilmemizi sağlar
export default HeroSection
