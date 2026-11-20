import { useContext } from 'react';
import { ProductContext } from '../context/productContext';
export function useProductCatalog() {
  const value = useContext(ProductContext);
  if (!value) throw new Error('Ürün sağlayıcısı bulunamadı.');
  return value;
}
export function useProducts() { return useProductCatalog().products; }
