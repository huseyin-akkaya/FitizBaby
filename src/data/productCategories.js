export const categoryDefinitions = [
  { name: "Kahvaltılık", icon: "🥣" },
  { name: "Süt Ürünleri", icon: "🥛" },
  { name: "Et & Tavuk", icon: "🍗" },
  { name: "Atıştırmalık", icon: "🍫" },
  { name: "İçecekler", icon: "🥤" },
  { name: "Protein Kaynakları", icon: "💪" },
];

export const homeCategoryShortcuts = categoryDefinitions.filter(({ name }) => name !== "Protein Kaynakları");

const categoryAliases = {
  "Et & Tavuk": ["Protein Kaynakları"],
};

export const getCategoryIcon = (name) => categoryDefinitions.find((category) => category.name === name)?.icon ?? "🥗";

export const getProductCategoryNames = (product) => [
  ...new Set([product.category, ...(categoryAliases[product.category] ?? [])].filter(Boolean)),
];

export const productBelongsToCategory = (product, category) =>
  category === "Tümü" || getProductCategoryNames(product).includes(category);

export const getProductCategories = (products = []) => {
  const knownNames = categoryDefinitions.map(({ name }) => name);
  const additionalNames = [...new Set(products.map((product) => product.category).filter(Boolean))]
    .filter((name) => !knownNames.includes(name));

  return [...knownNames, ...additionalNames];
};
