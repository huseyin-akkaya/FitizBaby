export async function authRequest(path, data, signal) {
  let response;
  try {
    response = await fetch('/api/v1/auth/' + path, { method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers: data === undefined ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), signal: signal || AbortSignal.timeout(10000) });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Hesap sunucusuna ulaşılamadı. Backend ve veritabanı kurulumunu kontrol et.', { cause: error });
  }
  if (response.status === 204) return {};
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || 'İşlem tamamlanamadı. Lütfen yeniden dene.');
  if (!Object.hasOwn(result, 'user')) throw new Error('Hesap sunucusu geçerli bir yanıt vermedi.');
  return result;
}
