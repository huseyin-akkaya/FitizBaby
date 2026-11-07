import { Link } from "react-router-dom";
import { products } from "../data/products";
import { getCategoryIcon, getProductCategories, productBelongsToCategory } from "../data/productCategories";

function Categories() {
  return <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-6">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8">
        <p className="text-sm font-semibold text-green-700">KATALOĞU KEŞFET</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Kategoriler</h1>
        <p className="mt-3 text-zinc-500">İlgilendiğin kategoriyi seçerek ürünlerini incele.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {getProductCategories(products).map(category => {
          const count = products.filter(product => productBelongsToCategory(product, category)).length;
          return <Link key={category} to={"/products?category=" + encodeURIComponent(category)} className="group flex items-center gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-green-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
            <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-green-50 text-3xl">{getCategoryIcon(category)}</span>
            <div className="min-w-0 flex-1"><h2 className="text-lg font-bold text-zinc-900 group-hover:text-green-700">{category}</h2><p className="mt-1 text-sm text-zinc-500">{count} ürün</p></div>
            <span aria-hidden="true" className="text-xl text-green-600">→</span>
          </Link>;
        })}
      </div>
    </div>
  </main>;
}

export default Categories;
