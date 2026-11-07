import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ACTIVITY_LEVELS,
  calculateTargets,
  createMealPlan,
  emptyProfile,
  getAlternativeRecipes,
  getCatalogSuggestions,
  getRecipe,
  getPortionScale,
  recipeIngredientLabels,
  recipeNutrition,
  STORAGE_KEY,
} from "../utils/mealPlanner";

const numberFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const grams = (value) => `${numberFormat.format(Math.round(value))} g`;

function readSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return { profile: null, macros: null, mealCount: 3, plan: [] };
    const rawProfile = saved.profile && typeof saved.profile === "object" ? { ...emptyProfile, ...saved.profile } : null;
    const legacyActivity = { "1.2": "inactive", "1.375": "low", "1.55": "active", "1.725": "veryActive", "1.9": "veryActive" };
    const candidate = rawProfile ? { ...rawProfile, activity: legacyActivity[rawProfile.activity] ?? rawProfile.activity } : null;
    const profile = candidate && [candidate.age,candidate.height,candidate.weight].every(v => Number.isFinite(Number(v)) && Number(v)>0) ? candidate : null;
    const mealCount = [3, 4, 5].includes(Number(saved.mealCount)) ? Number(saved.mealCount) : 3;
    return {
      profile,
      macros: profile && saved.macros && ["calories","protein","carbs","fat"].every(key => typeof saved.macros[key] === "number" && Number.isFinite(saved.macros[key]) && saved.macros[key] >= 0 && saved.macros[key] <= (key === "calories" ? 10000 : 1000)) ? saved.macros : null,
      mealCount,
      plan: Array.isArray(saved.plan) ? saved.plan.filter(meal => meal && typeof meal === "object" && getRecipe(meal.recipeId)).map(meal => ({...meal, portionScale: Math.max(.5,Math.min(2,Number(meal.portionScale) || 1))})) : [],
      calculationVersion: 3,
    };
  } catch {
    return { profile: null, macros: null, mealCount: 3, plan: [] };
  }
}

function MacroInput({ label, value, unit, onChange }) {
  const id = `macro-${label.toLocaleLowerCase("tr-TR")}`;
  return <label htmlFor={id} className="block"><span className="mb-1.5 flex items-center justify-between text-sm font-medium text-zinc-700"><span>{label}</span><span className="text-xs text-zinc-400">{unit}</span></span><input id={id} type="number" min="0" max={unit === "kcal / gün" ? 10000 : 1000} step="1" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-50" /></label>;
}

function NutritionPlan() {
  const [savedState, setSavedState] = useState(readSavedState);
  const [profileDraft, setProfileDraft] = useState(() => readSavedState().profile ?? emptyProfile);
  const [formError, setFormError] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const resetButtonRef = useRef(null);
  const cancelResetButtonRef = useRef(null);
  const wasResetDialogOpen = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState)); } catch { /* Storage may be disabled or full. */ }
  }, [savedState]);

  useEffect(() => {
    if (!isResetDialogOpen) {
      if (wasResetDialogOpen.current) resetButtonRef.current?.focus();
      wasResetDialogOpen.current = false;
      return undefined;
    }
    wasResetDialogOpen.current = true;
    cancelResetButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsResetDialogOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isResetDialogOpen]);

  const profile = savedState.profile;
  const macros = savedState.macros;
  const currentPlan = useMemo(() => (savedState.plan ?? []).map((meal) => {
    const recipe = getRecipe(meal.recipeId);
    const portionScale = meal.portionScale ?? 1;
    return recipe ? { ...meal, portionScale, recipe, nutrition: recipeNutrition(recipe, portionScale) } : null;
  }).filter(Boolean), [savedState.plan]);
  const planTotals = useMemo(() => currentPlan.reduce((totals, meal) => {
    for (const key of ["calories", "protein", "carbs", "fat"]) totals[key] += meal.nutrition[key];
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 }), [currentPlan]);

  const submitProfile = (event) => {
    event.preventDefault();
    const values = [Number(profileDraft.age), Number(profileDraft.height), Number(profileDraft.weight)];
    const optionalBmi = profileDraft.bmi === "" ? null : Number(profileDraft.bmi);
    const validActivity = ACTIVITY_LEVELS.some((level) => level.value === profileDraft.activity);
    if (!["male","female"].includes(profileDraft.sex) || !["lose","maintain","gain"].includes(profileDraft.goal) || !values.every(Number.isFinite) || values[0] < 19 || values[0] > 100 || values[1] < 120 || values[1] > 230 || values[2] < 35 || values[2] > 300 || !validActivity || (optionalBmi !== null && (!Number.isFinite(optionalBmi) || optionalBmi < 10 || optionalBmi > 80))) {
      setFormError("19–100 yaş, 120–230 cm boy ve 35–300 kg kilo aralıklarında geçerli değerler gir. BMI alanı boş bırakılabilir.");
      return;
    }
    setFormError("");
    const validProfile = { ...profileDraft, age: values[0], height: values[1], weight: values[2], bmi: optionalBmi ?? "" };
    const targets = calculateTargets(validProfile);
    if (targets.calories < 1200) { setFormError("Bu bilgiler çok düşük bir enerji tahmini üretiyor; kişisel hedef için bir beslenme uzmanına danış."); return; }
    const newMacros = { calories: targets.calories, protein: targets.protein, carbs: targets.carbs, fat: targets.fat };
    setSavedState((current) => ({ ...current, profile: validProfile, macros: newMacros, plan: createMealPlan(newMacros.calories, newMacros, current.mealCount), calculationVersion: 3 }));
  };

  const updateMacro = (key, value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > (key === "calories" ? 10000 : 1000)) return;
    setSavedState((current) => {
      const updated = { ...current.macros, [key]: numeric };

      return { ...current, macros: updated, calculationVersion: 3, plan: current.profile ? createMealPlan(updated.calories, updated, current.mealCount, current.plan) : current.plan };
    });
  };

  const changeMealCount = (count) => setSavedState((current) => ({ ...current, mealCount: count, plan: current.profile && current.macros ? createMealPlan(current.macros.calories, current.macros, count, current.plan) : current.plan }));
  const resetNutritionPlan = () => {
    setSavedState({ profile: null, macros: null, mealCount: 3, plan: [], calculationVersion: 3 });
    setProfileDraft({ ...emptyProfile });
    setFormError("");
    setIsResetDialogOpen(false);
  };
  const swapRecipe = (meal, recipeId) => {
    const recipe = getRecipe(recipeId);
    if (!recipe) return;
    const shareByCount = savedState.mealCount === 3 ? [0.3, 0.35, 0.35] : savedState.mealCount === 4 ? [0.25, 0.3, 0.15, 0.3] : [0.23, 0.1, 0.29, 0.1, 0.28];
    const index = savedState.plan.findIndex((item) => item.slotId === meal.slotId);
    const portionScale = getPortionScale(recipe, macros.calories * (shareByCount[index] ?? 0.25));
    setSavedState((current) => ({ ...current, plan: current.plan.map((item) => item.slotId === meal.slotId ? { ...item, recipeId, portionScale, nutrition: recipeNutrition(recipe, portionScale) } : item) }));
  };
  const changePortion = (meal, direction) => setSavedState((current) => ({ ...current, plan: current.plan.map((item) => {
    if (item.slotId !== meal.slotId) return item;
    const portionScale = Math.min(2, Math.max(0.5, Math.round(((item.portionScale ?? 1) + direction * 0.25) * 100) / 100));
    const recipe = getRecipe(item.recipeId);
    return { ...item, portionScale, nutrition: recipeNutrition(recipe, portionScale) };
  }) }));

  return <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="mb-2 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800"><span className="h-2 w-2 rounded-full bg-green-500" />Kişisel günlük plan</p><h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Beslenme Planım</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">Günlük hedeflerine göre temel gıdalarla hazırlanabilen tarifler oluştur; uygun FitizBaby ürünlerini yalnızca isteğe bağlı eşleşme olarak gör.</p></div>
        <div className="flex flex-wrap gap-2">{profile && macros && <button type="button" onClick={() => setSavedState((current) => ({ ...current, plan: createMealPlan(current.macros.calories, current.macros, current.mealCount, current.plan) }))} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-green-300 hover:text-green-800 sm:self-auto"><span aria-hidden="true">↻</span> Planı yenile</button>}<button ref={resetButtonRef} type="button" onClick={() => setIsResetDialogOpen(true)} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 sm:self-auto"><span aria-hidden="true">↺</span> Sıfırla</button><Link to="/assistant" className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"><span aria-hidden="true">✦</span> Asistana sor</Link></div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wider text-green-700">01 · Sana göre hesapla</p><h2 className="mt-1 text-xl font-bold text-zinc-900">Vücut bilgilerin</h2><p className="mt-1 text-sm text-zinc-500">Hesaplama yetişkinler için yaklaşık bir başlangıç değeridir.</p></div>
          <form onSubmit={submitProfile} noValidate>
            <div className="grid grid-cols-2 gap-4">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Yaş</span><span className="relative block"><input required type="number" min="19" max="100" value={profileDraft.age} onChange={(event) => setProfileDraft({ ...profileDraft, age: event.target.value })} placeholder="Örn. 28" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-12 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-50" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">yıl</span></span></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Cinsiyet</span><select value={profileDraft.sex} onChange={(event) => setProfileDraft({ ...profileDraft, sex: event.target.value })} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-50"><option value="female">Kadın</option><option value="male">Erkek</option></select></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Boy</span><span className="relative block"><input required type="number" min="120" max="230" value={profileDraft.height} onChange={(event) => setProfileDraft({ ...profileDraft, height: event.target.value })} placeholder="Örn. 168" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-12 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-50" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">cm</span></span></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Kilo</span><span className="relative block"><input required type="number" min="35" max="300" step="0.1" value={profileDraft.weight} onChange={(event) => setProfileDraft({ ...profileDraft, weight: event.target.value })} placeholder="Örn. 64" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 pr-12 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-50" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">kg</span></span></label>
            </div>
            <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Aktivite seviyesi</span><select value={profileDraft.activity} onChange={(event) => setProfileDraft({ ...profileDraft, activity: event.target.value })} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-50">{ACTIVITY_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label} · {level.detail}</option>)}</select></label>
            <label className="mt-4 block"><span className="mb-1.5 flex items-center justify-between text-sm font-medium text-zinc-700"><span>BMI (isteğe bağlı)</span><span className="text-xs font-normal text-zinc-400">Biliyorsan girebilirsin</span></span><input type="number" min="10" max="80" step="0.1" value={profileDraft.bmi ?? ""} onChange={(event) => setProfileDraft({ ...profileDraft, bmi: event.target.value })} placeholder="Örn. 23,5" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-50" /><span className="mt-1 block text-xs leading-5 text-zinc-400">BMI kalori hesabına dahil edilmez; boş bırakabilirsin.</span></label>
            <fieldset className="mt-5"><legend className="mb-2 text-sm font-medium text-zinc-700">Hedefin</legend><div className="grid grid-cols-3 gap-2">{[{ id: "lose", label: "Kilo vermek", icon: "↓" }, { id: "maintain", label: "Korumak", icon: "↔" }, { id: "gain", label: "Kilo almak", icon: "↑" }].map((goal) => <label key={goal.id} className={`flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-xs font-medium transition sm:text-sm ${profileDraft.goal === goal.id ? "border-green-400 bg-green-50 text-green-900 ring-2 ring-green-100" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}><input className="sr-only" type="radio" name="goal" value={goal.id} checked={profileDraft.goal === goal.id} onChange={() => setProfileDraft({ ...profileDraft, goal: goal.id })} /><span className="text-lg" aria-hidden="true">{goal.icon}</span>{goal.label}</label>)}</div></fieldset>
            {formError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>}
            <button type="submit" className="mt-5 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-100">{profile ? "Hedeflerimi güncelle" : "Günlük hedefimi hesapla"}</button>
          </form>
          <div className="mt-5 rounded-xl bg-zinc-50 p-3.5 text-xs leading-5 text-zinc-500"><span className="font-semibold text-zinc-700">Nasıl hesaplanıyor?</span> Mifflin–St Jeor ile BMR hesaplanır: 10 × kilo + 6,25 × boy − 5 × yaş; erkek için +5, kadın için −161. TDEE = BMR × aktivite katsayısı. <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noreferrer" className="underline text-green-800">Denklem kaynağı</a> Hedef için koruma tahminine yaklaşık −300 / 0 / +200 kcal eklenir. Bunlar başlangıç tahminidir; gerçek ihtiyaç aktivite ve kişisel farklılıklara göre değişir.</div>
        </section>

        <div className="space-y-6">
          {profile && macros ? <>
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-green-700">02 · Günlük hedeflerin</p><div className="mt-1 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-bold text-zinc-900">Enerji ve makro dağılımı</h2><p className="mt-1 text-sm text-zinc-500">Başlangıç makroları enerjinin %20 protein, %50 karbonhidrat, %30 yağ dağılımıdır. Kalori ve gram hedeflerini ayrı ayrı düzenleyebilirsin. Makro enerjisi 4/4/9 kcal/g ile karşılaştırılır.</p></div><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">Yaklaşık tahmin</span></div></div>
              <div className="grid gap-5 p-5 sm:grid-cols-[0.8fr_1.2fr] sm:p-6">
                <div className="flex flex-col justify-center rounded-2xl bg-zinc-950 p-5 text-white"><p className="text-sm text-zinc-300">Günlük enerji hedefi</p><p className="mt-1 text-4xl font-bold tracking-tight">{numberFormat.format(macros.calories)} <span className="text-lg font-medium text-zinc-300">kcal</span></p><p className="mt-3 text-xs leading-5 text-zinc-400">BMR: {numberFormat.format(calculateTargets(profile).bmr)} kcal · TDEE (×{calculateTargets(profile).factor}): {numberFormat.format(calculateTargets(profile).maintenance)} kcal · hedefin için başlangıç: {numberFormat.format(calculateTargets(profile).calories)} kcal</p>{profile.bmi && <p className="mt-2 text-xs text-zinc-400">Girdiğin BMI: {Number(profile.bmi).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} · kalori hesabında kullanılmaz</p>}</div>
                <p className="text-sm leading-6 text-zinc-600">{profile.goal === 'lose' ? 'Kilo verme için küçük ve sürdürülebilir bir enerji açığıyla başla; öğünlerinde protein, sebze ve lifli tahıllara yer ver.' : profile.goal === 'gain' ? 'Kilo alma için enerji artışını öğünlere yay; protein kaynakları ve dengeli porsiyonlarla ilerle.' : 'Koruma hedefinde düzenli öğünler ve çeşitli besin kaynaklarıyla ilerle.'} Gerçek ilerlemene göre hedefini yeniden değerlendir.</p><div className="grid grid-cols-2 gap-3"><MacroInput label="Kalori" value={macros.calories} unit="kcal / gün" onChange={(value) => updateMacro("calories", value)} /><MacroInput label="Protein" value={macros.protein} unit="gram / gün" onChange={(value) => updateMacro("protein", value)} /><MacroInput label="Karbonhidrat" value={macros.carbs} unit="gram / gün" onChange={(value) => updateMacro("carbs", value)} /><MacroInput label="Yağ" value={macros.fat} unit="gram / gün" onChange={(value) => updateMacro("fat", value)} /></div>
              </div>
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">{Math.abs(macros.calories - (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) > 20 && <p role="status" className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Kalori ve makro hedeflerin tutarsız. <button type="button" className="underline font-semibold" onClick={() => setSavedState(current => { const total = current.macros.protein * 4 + current.macros.carbs * 4 + current.macros.fat * 9; if (!total) return current; const ratio = current.macros.calories / total; const updated = { ...current.macros, protein: Math.round(current.macros.protein * ratio), carbs: Math.round(current.macros.carbs * ratio), fat: Math.round(current.macros.fat * ratio) }; return { ...current, macros: updated, plan: createMealPlan(updated.calories, updated, current.mealCount) }; })}>Makroları kaloriye göre dengele</button></p>}<div className="flex h-2 overflow-hidden rounded-full bg-zinc-100" aria-label="Makrolardan gelen enerji dağılımı"><span className="bg-green-500" style={{ width: `${macros.calories ? Math.min(100, (macros.protein * 4 / macros.calories) * 100) : 0}%` }} /><span className="bg-amber-400" style={{ width: `${macros.calories ? Math.min(100, (macros.carbs * 4 / macros.calories) * 100) : 0}%` }} /><span className="bg-sky-400" style={{ width: `${macros.calories ? Math.min(100, (macros.fat * 9 / macros.calories) * 100) : 0}%` }} /></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-green-500" />Protein</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-400" />Karbonhidrat</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-sky-400" />Yağ</span><span className="ml-auto">Makroların enerjisi: {Math.round(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)} kcal</span></div></div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-green-700">03 · Gününü düzenle</p><h2 className="mt-1 text-xl font-bold text-zinc-900">Öğün planın</h2><p className="mt-1 text-sm text-zinc-500">Porsiyon ve tarifleri ihtiyacına göre değiştirebilirsin.</p></div><div className="grid grid-cols-3 rounded-xl bg-zinc-100 p-1">{[3, 4, 5].map((count) => <button key={count} type="button" onClick={() => changeMealCount(count)} aria-pressed={savedState.mealCount === count} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${savedState.mealCount === count ? "bg-white text-green-800 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}>{count} öğün</button>)}</div></div>
              <div className="mt-5 space-y-3">{currentPlan.map((meal, index) => {
                const alternatives = getAlternativeRecipes(meal.category, meal.recipeId, macros.calories, macros, savedState.mealCount === 3 ? [0.3, 0.35, 0.35][index] : savedState.mealCount === 4 ? [0.25, 0.3, 0.15, 0.3][index] : [0.23, 0.1, 0.29, 0.1, 0.28][index]);
                const catalogSuggestions = getCatalogSuggestions(meal.recipe);
                return <article key={meal.slotId} className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-green-200"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-xs font-bold text-green-800">{String(index + 1).padStart(2, "0")}</span><h3 className="font-semibold text-zinc-900">{meal.label}</h3></div><p className="ml-9 mt-2 font-medium text-zinc-800">{meal.recipe.name}</p><p className="ml-9 mt-1 text-xs leading-5 text-zinc-500">{meal.recipe.description}{meal.recipe.prepMinutes ? ` · ${meal.recipe.prepMinutes} dk` : ""}</p></div><label className="shrink-0"><span className="sr-only">{meal.label} tarifi değiştir</span><select value={meal.recipeId} onChange={(event) => swapRecipe(meal, event.target.value)} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 outline-none focus:border-green-500 sm:max-w-52"><option value={meal.recipeId}>Tarif alternatifleri</option>{alternatives.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></label></div><div className="ml-9 mt-3 flex flex-wrap items-center gap-1.5">{recipeIngredientLabels(meal.recipe, meal.portionScale).map((item) => <span key={item} className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600">{item}</span>)}</div>{catalogSuggestions.length > 0 && <div className="ml-9 mt-2 flex flex-wrap items-center gap-2 text-xs"><span className="text-zinc-500">İsteğe bağlı katalog ürünü:</span>{catalogSuggestions.map((product) => <Link key={product.id} to={`/products/${product.id}`} className="font-medium text-green-800 underline decoration-green-200 underline-offset-2 hover:text-green-950">{product.name}</Link>)}</div>}<div className="ml-9 mt-3 flex items-center justify-end gap-2"><span className="text-xs text-zinc-500">Porsiyon</span><button type="button" aria-label={`${meal.label} porsiyonunu azalt`} disabled={meal.portionScale <= 0.5} onClick={() => changePortion(meal, -1)} className="h-7 w-7 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40">−</button><span className="min-w-12 text-center text-xs font-semibold text-zinc-700">{Number(meal.portionScale.toFixed(2)).toLocaleString("tr-TR")}×</span><button type="button" aria-label={`${meal.label} porsiyonunu artır`} disabled={meal.portionScale >= 2} onClick={() => changePortion(meal, 1)} className="h-7 w-7 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40">+</button></div><div className="ml-9 mt-3 grid grid-cols-4 divide-x divide-zinc-100 rounded-lg bg-zinc-50 py-2 text-center"><div><p className="text-sm font-semibold text-zinc-900">{numberFormat.format(meal.nutrition.calories)}</p><p className="text-[10px] text-zinc-500">kcal</p></div><div><p className="text-sm font-semibold text-green-800">{grams(meal.nutrition.protein)}</p><p className="text-[10px] text-zinc-500">protein</p></div><div><p className="text-sm font-semibold text-amber-700">{grams(meal.nutrition.carbs)}</p><p className="text-[10px] text-zinc-500">karbonhidrat</p></div><div><p className="text-sm font-semibold text-sky-700">{grams(meal.nutrition.fat)}</p><p className="text-[10px] text-zinc-500">yağ</p></div></div></article>;
              })}</div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-green-700">04 · Günlük toplam</p><h2 className="mt-1 text-xl font-bold text-zinc-900">Planın ve hedeflerin</h2></div><p className="text-xs text-zinc-400">Tarif toplamı · yaklaşık</p></div><div className="mt-4 space-y-4">{[{ key: "calories", label: "Enerji", unit: "kcal", color: "bg-green-500" }, { key: "protein", label: "Protein", unit: "g", color: "bg-emerald-500" }, { key: "carbs", label: "Karbonhidrat", unit: "g", color: "bg-amber-400" }, { key: "fat", label: "Yağ", unit: "g", color: "bg-sky-400" }].map(({ key, label, unit, color }) => { const target = key === "calories" ? macros.calories : macros[key]; const total = Math.round(planTotals[key]); const percent = target > 0 ? Math.min(100, (total / target) * 100) : 0; return <div key={key}><div className="mb-1.5 flex items-center justify-between gap-2 text-sm"><span className="font-medium text-zinc-700">{label}</span><span className="text-zinc-600"><strong className="text-zinc-900">{numberFormat.format(total)} {unit}</strong><span className="text-zinc-400"> / {numberFormat.format(target)} {unit}</span></span></div><div className="h-2 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${percent}%` }} /></div></div>; })}</div><p className="mt-4 rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">Tarifler demo amaçlıdır. Besin değerleri genel gıda varsayımlarından hesaplanan yaklaşık tahminlerdir; doğrulanmış tarif analizi değildir. Pişirme yöntemi ve marka sonucu değiştirebilir; katalog ürünleri yalnızca isteğe bağlı eşleşme olarak gösterilir ve tarif toplamına eklenmez.</p></section>
          </> : <section className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center shadow-sm"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-2xl text-green-700" aria-hidden="true">✳</div><h2 className="mt-4 text-lg font-bold text-zinc-900">Planını oluşturmaya başlayalım</h2><p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Yaş, boy, kilo, aktivite ve hedefini gir. Günlük yaklaşık kalori ve makro hedeflerinle birlikte sana uygun öğün fikirleri burada görünsün.</p><div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-2 text-xs text-zinc-500"><span className="rounded-lg bg-zinc-50 p-2">Kalori hedefi</span><span className="rounded-lg bg-zinc-50 p-2">Düzenlenebilir makro</span><span className="rounded-lg bg-zinc-50 p-2">Tarif alternatifleri</span></div></section>}
        </div>
      </div>
      {isResetDialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4" onClick={(event) => { if (event.target === event.currentTarget) setIsResetDialogOpen(false); }}><section role="alertdialog" aria-modal="true" aria-labelledby="reset-dialog-title" aria-describedby="reset-dialog-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-xl text-rose-700" aria-hidden="true">↺</div><h2 id="reset-dialog-title" className="mt-4 text-lg font-bold text-zinc-900">Beslenme planını sıfırlamak istiyor musun?</h2><p id="reset-dialog-description" className="mt-2 text-sm leading-6 text-zinc-600">Kaydedilen vücut bilgilerin, günlük kalori ve makro hedeflerin, öğün sayın ve oluşturduğun plan silinir. Bu işlem geri alınamaz. Günlük Makro Takibi’ndeki öğün kayıtların etkilenmez.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancelResetButtonRef} type="button" onClick={() => setIsResetDialogOpen(false)} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">Vazgeç</button><button type="button" onClick={resetNutritionPlan} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">Evet, sıfırla</button></div></section></div>}
      <footer className="mx-auto mt-8 max-w-4xl text-center text-xs leading-5 text-zinc-400">Bu araç genel bilgilendirme amaçlı tahminler sunar; tıbbi tavsiye veya kişiye özel diyet tedavisi değildir. Sağlık durumun veya özel beslenme ihtiyacın varsa bir sağlık uzmanına danış.</footer>
    </div>
  </main>;
}

export default NutritionPlan;
