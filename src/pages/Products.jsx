// Örnek ürün verileri
// Şimdilik verileri burada sabit tutuyoruz.
// Daha sonra bunları LocalStorage veya backend'den alacağız.

import { useState } from "react";
import RangeSlider from "../components/RangeSlider";

const products = [
  {
    id: 1,
    name: "Proteinli Süt",
    brand: "SütMarkası",
    category: "Süt Ürünleri",
    calories: 120,
    protein: 20,
    carbs: 8,
    sugar: 6,
    fat: 2,
  },
  {
    id: 2,
    name: "Yulaf Ezmesi",
    brand: "YulafMarkası",
    category: "Kahvaltılık",
    calories: 370,
    protein: 13,
    carbs: 60,
    sugar: 2,
    fat: 7,
  },
  {
    id: 3,
    name: "Protein Bar",
    brand: "BarMarkası",
    category: "Atıştırmalık",
    calories: 210,
    protein: 18,
    carbs: 22,
    sugar: 5,
    fat: 8,
  },
];

function Products() {
  // Arama kutusuna yazılan değeri tutar
  const [searchTerm, setSearchTerm] = useState("");

  // Kullanıcının seçtiği kategoriyi tutar
  const [selectedCategory, setSelectedCategory] = useState("Tümü");

  //Kullanıcının seçtiği markaları tutar
  const [selectedBrands, setSelectedBrands] = useState([]);
  //Kullanıcının seçtiği sıralama yöntemini tutar
  const [sortOption, setSortOption] = useState("default");

  // Marka filtre listesindeki arama metnini tutar
  const [brandSearch, setBrandSearch] = useState("");

  // Kullanıcının minimum ve maksimum kalori filtre değerlerini tutar
  const [minCalories, setMinCalories] = useState("");
  const [maxCalories, setMaxCalories] = useState("");

  // Arama metnini küçük harfe çeviriyoruz
  const normalizedSearch = searchTerm.toLowerCase();

  // Kullanıcının minimum ve maksimum protein filtre değerlerini tutar
  const [minProtein, setMinProtein] = useState("");
  const [maxProtein, setMaxProtein] = useState("");

  // Marka listesinin tamamının gösterilip gösterilmediğini tutar
  const [showAllBrands, setShowAllBrands] = useState(false);

  // Ürünlerden kategori isimlerini çıkarıyoruz
  const categories = [
    "Tümü",
    ...new Set(products.map((product) => product.category)),
  ];

  //Ürünlerden marka isimlerini çıkarıyoruz
  const brands = ["Tümü", ...new Set(products.map((product) => product.brand))];

  // Marka listesini kullanıcının yazdığı arama metnine göre filtreler
  const filteredBrands = brands.filter((brand) =>
    brand.toLowerCase().includes(brandSearch.toLowerCase()),
  );

  // Marka listesi kapalıysa ilk 6 markayı, açıksa tüm markaları gösterir
  const visibleBrands = showAllBrands
    ? filteredBrands
    : filteredBrands.slice(0, 6);

  // Hem arama metnine hem seçilen kategoriye göre ürünleri filtreler
  const filteredProducts = products.filter((product) => {
    // Ürün adı, marka ve kategoriyi tek bir aranabilir metne dönüştürüyoruz
    const searchableText = `
      ${product.name}
      ${product.brand}
      ${product.category}
    `.toLowerCase();

    // Arama kutusundaki yazıyla eşleşiyor mu?
    const matchesSearch = searchableText.includes(normalizedSearch);

    // Ya "Tümü" seçili olmalı
    // ya da ürünün kategorisi seçilen kategoriyle aynı olmalı
    const matchesCategory =
      selectedCategory === "Tümü" || product.category === selectedCategory;

    // Kullanıcının tüm marka seçimi ya da ürünün seçilen markaya aitliği
    const matchesBrand =
      selectedBrands.length === 0 || selectedBrands.includes(product.brand);
    //Kalori filtrelemesi

    const matchesCalories =
      (minCalories === "" || product.calories >= Number(minCalories)) &&
      (maxCalories === "" || product.calories <= Number(maxCalories));

    //Protein filtrelemesi
    const matchesProtein =
      (minProtein === "" || product.protein >= Number(minProtein)) &&
      (maxProtein === "" || product.protein <= Number(maxProtein));

    return (
      matchesSearch &&
      matchesCategory &&
      matchesBrand &&
      matchesCalories &&
      matchesProtein
    );
  });

  // Filtrelenmiş ürünlerin kopyasını oluşturur.
  const sortedProducts = [...filteredProducts];

  // Filtrelenmiş ürünlerin sıralanması
  const sortFunctions = {
    "protein-high": (a, b) => b.protein - a.protein,
    "sugar-low": (a, b) => a.sugar - b.sugar,
    "calories-low": (a, b) => a.calories - b.calories,
  };
  if (sortFunctions[sortOption]) {
    sortedProducts.sort(sortFunctions[sortOption]);
  }

  // Bir markayı seçili markalar listesine ekler veya listeden çıkarır.
  const toggleBrand = (brand) => {
    if (selectedBrands.includes(brand)) {
      setSelectedBrands(
        selectedBrands.filter((selectedBrand) => selectedBrand !== brand),
      );
    } else {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };

  // Tüm filtreleri başlangıç haline döndürür
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("Tümü");
    setSelectedBrands([]);
    setMinCalories("");
    setMaxCalories("");
    setMinProtein("");
    setMaxProtein("");
    setSortOption("Varsayılan");
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Sayfa başlığı */}
      <h1 className="text-3xl font-bold mb-6">Ürünler</h1>

      {/* 
        Sayfanın ana yerleşimi
      */}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        {/* Sol filtre paneli */}
        <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          {/* Filtre paneli başlığı ve filtre simgesi */}
          <div className="mb-4 flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 5h16" />
              <path d="M7 12h10" />
              <path d="M10 19h4" />
            </svg>

            <h2 className="text-lg font-semibold text-zinc-900">Filtreler</h2>
          </div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Kategori</h3>
          {/* Kategori butonları */}
          <div className="flex flex-col gap-1">
            {categories.map((category) => {
              const categoryCount =
                category === "Tümü"
                  ? products.length
                  : products.filter((product) => product.category === category)
                      .length;

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    selectedCategory === category
                      ? "bg-green-50 font-semibold text-green-600"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <span>{category}</span>
                  <span className="text-xs">{categoryCount}</span>
                </button>
              );
            })}
          </div>
          {/*Marka*/}
          <h3 className="mt-6 mb-2 text-sm font-semibold text-zinc-900">
            Marka
          </h3>
          {/* Marka listesini filtrelemek için kullanılan arama kutusu */}
          <input
            type="text"
            placeholder="Marka ara..."
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-green-500"
          />
          {/* Markaların eklenmesi */}
          <div className="flex flex-col gap-1">
            {visibleBrands.map((brand) => {
              // Her markaya ait ürün sayısını hesaplar
              const brandCount =
                brand === "Tümü"
                  ? products.length
                  : products.filter((product) => product.brand === brand)
                      .length;
              const isChecked =
                brand === "Tümü"
                  ? selectedBrands.length === 0
                  : selectedBrands.includes(brand);

              return (
                <label
                  key={brand}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (brand === "Tümü") {
                          setSelectedBrands([]);
                        } else {
                          toggleBrand(brand);
                        }
                      }}
                      className="h-4 w-4 cursor-pointer accent-green-500"
                    />

                    <span>{brand}</span>
                  </div>

                  <span className="text-xs text-zinc-500">{brandCount}</span>
                </label>
              );
            })}
          </div>
          {filteredBrands.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllBrands(!showAllBrands)}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 text-xs font-medium text-zinc-500 transition hover:text-green-600"
            >
              {showAllBrands ? "Daha az göster" : "Daha fazla göster"}

              <span>{showAllBrands ? "↑" : "↓"}</span>
            </button>
          )}

          {/* Ürünleri minimum ve maksimum kalori değerine göre filtreleyen alan */}
          <h3 className="mt-6 mb-2 text-sm font-semibold text-zinc-900">
            Kalori (100 g için)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minCalories}
              onChange={(e) => setMinCalories(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-green-500"
            />

            <input
              type="number"
              placeholder="Max"
              value={maxCalories}
              onChange={(e) => setMaxCalories(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-green-500"
            />
          </div>
          {/* Minimum kalori slider'ını ortak RangeSlider bileşeni ile oluşturur */}
          <RangeSlider
            label="Minimum"
            value={minCalories}
            defaultValue={0}
            max={1000}
            step={10}
            onChange={setMinCalories}
          />
          {/* Maksimum kalori slider'ını ortak RangeSlider bileşeni ile oluşturur */}
          <RangeSlider
            label="Maksimum"
            value={maxCalories}
            defaultValue={1000}
            max={1000}
            step={10}
            onChange={setMaxCalories}
          />
          {/* Ürünleri minimum ve maksimum Protein değerine göre filtreleyen alan */}
          <h3 className="mt-6 mb-2 text-sm font-semibold text-zinc-900">
            Protein (100 g için)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minProtein}
              onChange={(e) => setMinProtein(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-green-500"
            />

            <input
              type="number"
              placeholder="Max"
              value={maxProtein}
              onChange={(e) => setMaxProtein(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-green-500"
            />
          </div>
          {/* Minimum protein slider'ını ortak RangeSlider bileşeni ile oluşturur */}{" "}
          <RangeSlider
            label="Minimum"
            value={minProtein}
            defaultValue={0}
            max={100}
            step={1}
            onChange={setMinProtein}
          />
          {/* Maksimum protein slider'ını ortak RangeSlider bileşeni ile oluşturur */}{" "}
          <RangeSlider
            label="Maksimum"
            value={maxProtein}
            defaultValue={100}
            max={100}
            step={1}
            onChange={setMaxProtein}
          />
          {/* Tüm filtreleri başlangıç değerlerine döndüren buton */}
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 shadow-sm transition hover:border-green-400 hover:bg-green-50 hover:text-green-600"
          >
            Filtreleri Temizle
          </button>
        </aside>

        {/* Sağ ürün alanı */}
        <div>
          {/* Arama kutusu */}
          <input
            type="text"
            placeholder="Ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4 w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-green-500"
          />

          {/*Ürün değerleri sıralama kutusu*/}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="mb-4 rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-green-500"
          >
            <option value="default">Varsayılan</option>
            <option value="protein-high">En yüksek protein</option>
            <option value="sugar-low">En düşük şeker</option>
            <option value="calories-low">En düşük kalori</option>
          </select>

          {/* Filtre sonucunda kalan ürün sayısı */}
          <p className="mb-4 text-sm text-zinc-500">
            {filteredProducts.length} ürün bulundu
          </p>

          {/* Ürün kartlarının bulunduğu grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hiç ürün bulunamazsa gösterilecek mesaj */}
            {filteredProducts.length === 0 && (
              <p className="col-span-full text-center text-sm text-zinc-500">
                Aradığın kriterlere uygun ürün bulunamadı.
              </p>
            )}

            {/* Filtrelenmiş ürünleri tek tek kart haline getiriyoruz */}
            {sortedProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                {/* Ürün adı */}
                <h2 className="text-lg font-semibold text-zinc-900">
                  {product.name}
                </h2>

                {/* Marka */}
                <p className="mt-1 text-sm text-zinc-500">{product.brand}</p>

                {/* Kategori */}
                <p className="mt-1 text-sm text-green-600">
                  {product.category}
                </p>

                {/* Makro değerleri */}
                <div className="mt-5 grid grid-cols-5 gap-2 text-center">
                  {/* Kalori */}
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {product.calories}
                    </p>
                    <p className="text-xs text-zinc-500">kcal</p>
                  </div>

                  {/* Protein */}
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {product.protein} g
                    </p>
                    <p className="text-xs text-zinc-500">Protein</p>
                  </div>

                  {/* Karbonhidrat */}
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {product.carbs} g
                    </p>
                    <p className="text-xs text-zinc-500">Karb</p>
                  </div>

                  {/* Şeker */}
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {product.sugar} g
                    </p>
                    <p className="text-xs text-zinc-500">Şeker</p>
                  </div>

                  {/* Yağ */}
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {product.fat} g
                    </p>
                    <p className="text-xs text-zinc-500">Yağ</p>
                  </div>
                </div>

                {/* Besin değerlerinin hangi miktar için olduğunu gösterir */}
                <p className="mt-5 text-center text-xs text-zinc-500">
                  100 g için
                </p>

                {/* İleride detay sayfasına bağlanacak */}
                <button className="mt-3 w-full cursor-pointer rounded-lg border border-green-500 py-2 text-sm font-semibold text-green-600 transition hover:bg-green-50">
                  Detayları Gör
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Products;
