import { Link, useParams } from "react-router-dom";
import { products } from "../data/products";

function ProductsDetail() {
  const { id } = useParams();
  const product = products.find((item) => item.id === Number(id));

  if (!product) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-2xl font-bold">Ürün bulunamadı</h1>
        <Link className="mt-4 inline-block text-green-700" to="/products">Ürünlere dön →</Link>
      </main>
    );
  }

  const nutrients = [
    ["Kalori", `${product.calories} kcal`],
    ["Protein", `${product.protein} g`],
    ["Karbonhidrat", `${product.carbs} g`],
    ["Yağ", `${product.fat} g`],
    ["Şeker", `${product.sugar} g`],
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link className="text-sm font-medium text-green-700" to="/products">← Ürünlere dön</Link>
      <div className="mt-6 grid gap-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-10">
        <div className="flex min-h-72 items-center justify-center rounded-2xl bg-zinc-50 p-8">
          <img src={product.image} alt={product.name} className="max-h-64 max-w-full object-contain" />
        </div>
        <div className="self-center">
          <p className="text-sm font-semibold text-green-700">{product.category}</p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">{product.name}</h1>
          <p className="mt-2 text-zinc-500">{product.brand}</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {nutrients.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-1 font-semibold text-zinc-900">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-400">Besin değerleri 100 g içindir.</p>
          <Link to="/assistant" className="mt-6 inline-flex rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700">Bu ürünü asistana sor →</Link>
        </div>
      </div>
    </main>
  );
}

export default ProductsDetail;
