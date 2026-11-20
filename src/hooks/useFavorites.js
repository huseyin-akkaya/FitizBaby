import { useContext } from 'react';
import { FavoritesContext } from '../context/favoritesContext';

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('Favoriler sağlayıcısı bulunamadı.');
  return context;
}
