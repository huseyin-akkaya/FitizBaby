export async function favoritesRequest(userId, data, importing = false, signal) {
  let response;
  try {
    response = await fetch('/api/v1/favorites' + (importing ? '/import' : ''), {
      method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'X-FitizBaby-Account': userId, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: data === undefined ? undefined : JSON.stringify(data), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Favoriler sunucusuna ulaşılamadı. Kaydın değişmedi; yeniden deneyebilirsin.', { cause: error });
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || 'Favoriler kaydedilemedi. Yeniden dene.');
  if (result.userId !== userId || !Array.isArray(result.productIds) || result.productIds.some(id => typeof id !== 'string')) throw new Error('Favoriler için geçerli hesap yanıtı alınamadı.');
  return result.productIds.map(id => /^\d+$/.test(id) ? Number(id) : id);
}
