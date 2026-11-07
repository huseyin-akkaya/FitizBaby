import { getProductHealth } from '../utils/productHealth';

export default function ProductHealth({ product }) {
  const result = getProductHealth(product);
  return <section className="mt-8 border-t border-zinc-100 pt-7" aria-labelledby="health-heading">
    <p className="text-xs font-semibold tracking-wider text-green-700">İÇERİĞE GÖRE DEĞERLENDİRME</p>
    <h2 id="health-heading" className="mt-2 text-xl font-bold text-zinc-900">Sağlığa katkıları ve olası riskler</h2>
    <p className="mt-2 text-sm leading-6 text-zinc-500">Aşağıdaki bilgiler, ürünün etiket verisi ile genel beslenme kanıtlarının birlikte yorumudur. Etki porsiyona, tüketim sıklığına ve kişisel sağlık durumuna bağlıdır.</p>
    {product.userProvided && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Bu ürünün bilgileri kullanıcı beyanıdır; aşağıdaki yorumlar bu bilgilerin doğru olduğu varsayımına dayanır.</p>}
    {[['Olası faydalar', result.benefits, 'border-green-200 bg-green-50/60', 'Fayda hakkında yorum yapmak için yeterli doğrulanmış içerik veya besin verisi yok.'], ['Olası zararlar ve dikkat edilmesi gerekenler', result.cautions, 'border-amber-200 bg-amber-50/60', 'Mevcut verilerden belirli bir risk çıkarılamadı. Bu sonuç ürünün risksiz veya herkes için uygun olduğunu göstermez.'], ['Bilgiyi nasıl okumalı?', result.context, 'border-zinc-200 bg-zinc-50', '']].map(([title, items, style, fallback]) => items.length || fallback ? <section key={title} className={'mt-4 rounded-2xl border p-4 sm:p-5 ' + style}><h3 className="font-bold text-zinc-900">{title}</h3>{items.length ? <ul className="mt-3 space-y-3">{items.map(item => <li key={item.title} className="rounded-xl bg-white p-4"><h4 className="text-sm font-semibold text-zinc-900">{item.title}</h4><p className="mt-1 text-sm leading-6 text-zinc-600">{item.text}</p><a href={item.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-green-800 underline">{item.source.label}</a></li>)}</ul> : <p className="mt-2 text-sm leading-6 text-zinc-600">{fallback}</p>}</section> : null)}
    <p className="mt-4 text-xs leading-5 text-zinc-500">Bu bölüm tanı veya kişisel tıbbi öneri sunmaz. Eksik etiket bilgisi “yok” sayılmaz; ürünün içerik ve besin kaynakları yukarıda ayrı gösterilir.</p>
  </section>;
}
