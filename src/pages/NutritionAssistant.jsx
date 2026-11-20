import { saveDocuments } from '../data/personalStorage';
import { personalStorage } from '../data/personalStorage';
import { PersonalGate, PersonalSavePanel } from '../components/PersonalDocuments';
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getNutritionAssistantReply } from "../services/nutritionAssistant";

const STORAGE_KEY = "fitizbaby-nutrition-profile";
const defaults = { goal: "Dengeli beslenme", calories: 2000, protein: 120, carbs: 220, fat: 65 };
const starters = ["Protein hedefime uygun bir öğün öner", "Pratik bir kahvaltı tarifi ver", "Proteinli süt hakkında bilgi ver"];

function readProfile() {
  try {
    return { ...defaults, ...JSON.parse(personalStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaults;
  }
}

function NutritionAssistant() {
  const [profile, setProfile] = useState(readProfile);
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: "Merhaba! Hedeflerine ve ürün kataloğuna göre öğün, tarif veya ürün önerileri hazırlayabilirim. Önce günlük hedeflerini düzenleyebilir, sonra neye ihtiyacın olduğunu yazabilirsin.",
  }]);
  const [draft, setDraft] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [saved, setSaved] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isResponding]);

  function updateProfile(key, value) {
    setProfile((current) => ({ ...current, [key]: key === "goal" ? value : value === "" ? "" : Number(value) }));
    setSaved(false);
  }

  async function saveProfile() {
    const normalized = Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, key === "goal" ? value : Math.max(0, Number(value) || 0)]));
    setProfile(normalized);
    try { personalStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); await saveDocuments(['profile']); setSaved(true); } catch { setSaved(false); }
  }

  async function sendMessage(text = draft) {
    const message = text.trim();
    if (!message || isResponding) return;
    setMessages((current) => [...current, { role: "user", text: message }]);
    setDraft("");
    setIsResponding(true);
    try {
      const reply = await getNutritionAssistantReply(message, profile);
      setMessages((current) => [...current, { role: "assistant", text: reply }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: "Şu anda yanıt oluşturamadım. Lütfen tekrar dene." }]);
    } finally {
      setIsResponding(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f7f9f6] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-7xl"><PersonalSavePanel keys={['profile']} />
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/" className="text-sm font-medium text-green-700 hover:text-green-800">← Ana sayfa</Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-green-700">FitizBaby · Kişisel beslenme</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Beslenme Planım</h1>
            <p className="mt-2 max-w-2xl text-zinc-600">Günlük hedeflerini belirle, Akıllı Asistan’dan öğün, tarif ve ürün fikirleri al.</p>
          </div>
          <Link to="/products" className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:border-green-300 hover:text-green-700">Ürün kataloğunu keşfet →</Link>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-zinc-900">Günlük hedeflerin</p><p className="mt-1 text-xs text-zinc-500">Asistan bu değerleri yanıtlarında kullanır.</p></div>
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-green-50 text-xl">◎</span>
            </div>
            <label className="mt-6 block text-sm font-medium text-zinc-700" htmlFor="nutrition-goal">Beslenme hedefi</label>
            <select id="nutrition-goal" value={profile.goal} onChange={(event) => updateProfile("goal", event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100">
              {["Dengeli beslenme", "Kilo verme", "Kilo alma", "Kas gelişimi", "Formumu koruma"].map((goal) => <option key={goal}>{goal}</option>)}
            </select>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[["calories", "Kalori", "kcal"], ["protein", "Protein", "g"], ["carbs", "Karbonhidrat", "g"], ["fat", "Yağ", "g"]].map(([key, label, unit]) => (
                <label key={key} className="text-xs font-medium text-zinc-600">{label} <span className="text-zinc-400">({unit})</span><input type="number" min="0" value={profile[key]} onChange={(event) => updateProfile(key, event.target.value)} className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" /></label>
              ))}
            </div>
            <button type="button" onClick={saveProfile} className="mt-5 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">{saved ? "Hedefler kaydedildi ✓" : "Hedeflerimi kaydet"}</button>
            <p className="mt-3 text-center text-xs leading-5 text-zinc-400">Hedefler bu cihazda saklanır. Kişisel sağlık verisi göndermiyoruz.</p>
            <div className="mt-6 rounded-2xl bg-green-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-green-800">Bugünkü hedef özeti</p><p className="mt-2 text-sm font-semibold text-zinc-800">{profile.calories || 0} kcal</p><p className="mt-1 text-xs text-zinc-600">P {profile.protein || 0} g · K {profile.carbs || 0} g · Y {profile.fat || 0} g</p></div>
          </aside>

          <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm" aria-label="Akıllı Asistan sohbeti">
            <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4 sm:px-6">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-green-600 text-white"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12m-8.48 8.48-2.12 2.12"/><circle cx="12" cy="12" r="5"/></svg></div>
              <div><h2 className="font-semibold text-zinc-900">Akıllı Asistan</h2><p className="mt-0.5 text-xs text-green-700">Beslenme hedeflerin ve ürün kataloğunla bağlantılı</p></div>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500"><span className="h-2 w-2 rounded-full bg-green-500"/>Hazır</span>
            </div>
            <div className="flex min-h-[380px] max-h-[56vh] flex-col gap-4 overflow-y-auto bg-[#fcfdfb] p-5 sm:p-6" aria-live="polite">
              {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[92%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto rounded-br-md bg-green-600 text-white" : "mr-auto rounded-bl-md border border-zinc-100 bg-white text-zinc-700 shadow-sm"}`}>{message.text}</div>)}
              {isResponding && <div className="mr-auto rounded-2xl bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm">Önerin hazırlanıyor…</div>}
              <div ref={endRef}/>
            </div>
            {messages.length === 1 && <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-5 py-4 sm:px-6">{starters.map((starter) => <button key={starter} type="button" onClick={() => sendMessage(starter)} className="rounded-full border border-zinc-200 px-3 py-2 text-left text-xs text-zinc-600 transition hover:border-green-300 hover:bg-green-50 hover:text-green-800">{starter}</button>)}</div>}
            <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="border-t border-zinc-100 p-4 sm:p-5">
              <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-50">
                <label className="sr-only" htmlFor="assistant-message">Mesajın</label><textarea id="assistant-message" rows="1" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Öğün, tarif veya ürün hakkında sor…" className="max-h-32 min-h-11 flex-1 resize-y border-0 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-zinc-400" />
                <button type="submit" disabled={!draft.trim() || isResponding} aria-label="Mesajı gönder" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-600 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-zinc-300"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>
              </div>
              <p className="mt-2 px-1 text-[11px] text-zinc-400">Enter ile gönder · Shift + Enter ile yeni satır</p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function NutritionAssistantPage(){return <PersonalGate keys={['profile']}><NutritionAssistant/></PersonalGate>;}
