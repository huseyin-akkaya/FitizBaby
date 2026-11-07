import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "fitizbaby-favorites";
const CHANGE_EVENT = "fitizbaby:favorites-change";

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState(readFavorites);

  useEffect(() => {
    const syncFavorites = () => setFavoriteIds(readFavorites());
    window.addEventListener(CHANGE_EVENT, syncFavorites);
    window.addEventListener("storage", syncFavorites);
    return () => {
      window.removeEventListener(CHANGE_EVENT, syncFavorites);
      window.removeEventListener("storage", syncFavorites);
    };
  }, []);

  const toggleFavorite = useCallback((id) => {
    const current = readFavorites();
    const next = current.includes(id)
      ? current.filter((favoriteId) => favoriteId !== id)
      : [...current, id];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the current view usable if browser storage is unavailable.
    }
    setFavoriteIds(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { favoriteIds, toggleFavorite };
}
