import { useSyncExternalStore } from 'react';
import { subscribeProducts, getProductsSnapshot } from '../data/catalogStore';

export function useProducts() {
  return useSyncExternalStore(subscribeProducts, getProductsSnapshot, getProductsSnapshot);
}
