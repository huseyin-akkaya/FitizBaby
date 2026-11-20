export async function productsRequest(accountId, path = '', method = 'GET', data, signal) {
  let response;
  try {
    response = await fetch('/api/v1/products' + path, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: { 'X-FitizBaby-Account': accountId, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Ürün sunucusuna ulaşılamadı. İşlemin sonucunu kontrol etmek için listeyi yenile.', { cause: error });
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || 'Ürün işlemi tamamlanamadı. Yeniden dene.');
  if (result.userId !== accountId) throw new Error('Ürün yanıtı etkin hesapla eşleşmedi. Sayfayı yenile.');
  return result;
}
