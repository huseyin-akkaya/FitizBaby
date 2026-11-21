import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function PasswordField({ id, label, value, onChange, autoComplete, visible, onToggle, minLength = 1 }) {
  return <label htmlFor={id} className="block">
    <span className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</span>
    <span className="relative block">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={128}
        required
        className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 pr-16 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-green-600 focus:ring-4 focus:ring-green-100"
        placeholder={minLength > 1 ? `En az ${minLength} karakter` : "Şifren"}
      />
      <button type="button" onClick={onToggle} className="absolute inset-y-0 right-3 my-auto h-8 rounded-md px-1 text-xs font-semibold text-zinc-500 transition hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
        {visible ? "Gizle" : "Göster"}
      </button>
    </span>
  </label>;
}

function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const { user, loading, authenticate } = useAuth();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearFeedback = () => setFeedback(null);
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (isRegister && password !== confirmPassword) {
      setFeedback({ type: "error", text: "Şifreler eşleşmiyor. Lütfen tekrar kontrol et." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await authenticate(isRegister ? 'register' : 'login', isRegister ? { name, email, password } : { email, password });
      setFeedback({ type: "success", text: isRegister ? "Hesabın oluşturuldu. Hesabına yönlendiriliyorsun." : "Giriş başarılı. Hesabına yönlendiriliyorsun." });
      navigate("/account", { replace: true });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof TypeError ? "API sunucusuna ulaşılamadı. Backend sunucusunun açık olduğunu kontrol et." : error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <main className="p-10" role="status">Oturum kontrol ediliyor…</main>;
  if (user) return <Navigate to="/account" replace />;

  return <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-green-50 via-zinc-50 to-amber-50 px-4 py-8 sm:px-6 sm:py-12">
    <div className="mx-auto grid max-w-6xl items-stretch gap-6 lg:grid-cols-[1fr_0.9fr] lg:gap-8">
      <section className="relative flex min-h-64 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-green-50 via-lime-50 to-amber-50 p-6 text-zinc-900 shadow-xl shadow-green-950/5 sm:p-9 lg:min-h-[600px] lg:p-11">
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white ring-1 ring-green-900/10" aria-hidden="true">
              <svg viewBox="0 0 64 64" className="h-9 w-9" fill="none">
                <ellipse cx="31" cy="39" rx="21" ry="7" stroke="currentColor" strokeWidth="3" />
                <ellipse cx="31" cy="41" rx="16" ry="4" stroke="currentColor" strokeWidth="2" />
                <circle cx="19" cy="24" r="2.5" fill="currentColor" />
                <circle cx="28" cy="18" r="2" fill="currentColor" />
                <circle cx="34" cy="22" r="2.3" fill="currentColor" />
                <path d="M41 18c6-3 15-2 17-5M39 25c6-3 15-2 17-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-xl font-bold tracking-tight">Fitiz<span className="text-green-700">Baby</span></span>
          </div>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-green-800">Beslenme yolculuğuna eşlik eder</p>
          <h1 className="mt-3 max-w-lg text-3xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-4xl">
            {isRegister ? "Kendin için dengeli bir başlangıç yap." : "Beslenme yolculuğuna kaldığın yerden devam et."}
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-700 sm:text-base">
            Ürünleri karşılaştır, öğünlerini takip et ve hedeflerine uygun seçenekleri keşfet.
          </p>
        </div>

        <ul className="relative mt-8 grid gap-3 text-sm text-zinc-800 sm:grid-cols-3 lg:mt-15 lg:grid-cols-1">
          {[
            "Ürün ve besin değerlerini keşfet",
            "Günlük kalori ve makrolarını takip et",
            "Seçimlerini hedeflerine göre değerlendir",
          ].map((item) => <li key={item} className="flex items-center gap-3 rounded-xl bg-white/90 px-3.5 py-3 ring-1 ring-green-900/10 shadow-sm shadow-green-900/5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green-100 text-green-800" aria-hidden="true">✓</span>
            <span className="text-xs leading-5 sm:text-sm">{item}</span>
          </li>)}
        </ul>
      </section>

      <section className="flex items-center justify-center rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xl shadow-zinc-900/5 sm:p-8 lg:p-10" aria-labelledby="auth-heading">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">← Ana sayfa</Link>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-green-700">FitizBaby hesabı</p>
          <h2 id="auth-heading" className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">{isRegister ? "Hesap oluştur" : "Tekrar hoş geldin"}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{isRegister ? "Başlamak için bilgilerini gir." : "Hesabına devam etmek için giriş bilgilerini gir."}</p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            {isRegister && <label htmlFor="auth-name" className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Ad soyad</span>
              <input id="auth-name" type="text" maxLength={100} value={name} onChange={(event) => { setName(event.target.value); clearFeedback(); }} autoComplete="name" required className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-green-600 focus:ring-4 focus:ring-green-100" placeholder="Adın ve soyadın" />
            </label>}

            <label htmlFor="auth-email" className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">E-posta</span>
              <input id="auth-email" type="email" maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); clearFeedback(); }} autoComplete="email" required className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-green-600 focus:ring-4 focus:ring-green-100" placeholder="ornek@eposta.com" />
            </label>

            <PasswordField id="auth-password" label="Şifre" value={password} onChange={(event) => { setPassword(event.target.value); clearFeedback(); }} autoComplete={isRegister ? "new-password" : "current-password"} visible={passwordVisible} onToggle={() => setPasswordVisible((visible) => !visible)} minLength={isRegister ? 15 : 1} />

            {isRegister && <PasswordField id="auth-confirm-password" label="Şifreyi tekrar gir" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); clearFeedback(); }} autoComplete="new-password" visible={passwordVisible} onToggle={() => setPasswordVisible((visible) => !visible)} minLength={15} />}

            {feedback && <p role={feedback.type === "error" ? "alert" : "status"} aria-live="polite" className={`rounded-xl px-3.5 py-3 text-sm leading-5 ${feedback.type === "error" ? "bg-rose-50 text-rose-800" : feedback.type === "success" ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-900"}`}>{feedback.text}</p>}

            <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-200 disabled:cursor-wait disabled:opacity-70">
              {isSubmitting ? "İşleniyor…" : isRegister ? "Hesabımı oluştur" : "Giriş yap"}
            </button>
          </form>

          {!isRegister&&<Link to="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-green-800 underline">Parolamı unuttum</Link>}
          <p className="mt-5 rounded-xl border border-zinc-100 bg-zinc-50 px-3.5 py-3 text-xs leading-5 text-zinc-500">
            Yerel geliştirme sürümündesin. Parolan en az 15 karakter olmalı. Şifren tarayıcıda saklanmaz; backend’e iletilir ve veritabanında Argon2id hash’i olarak tutulur. Doğrulama ve parola sıfırlama yerel deneme olarak kullanılabilir; gerçek test gönderimi özel e-posta kurulumu tamamlandığında yalnızca tanımlı deneme alıcısına açılır.
          </p>

          <p className="mt-6 text-center text-sm text-zinc-600">
            {isRegister ? "Zaten hesabın var mı?" : "FitizBaby'ye yeni misin?"}{" "}
            <Link to={isRegister ? "/login" : "/register"} className="font-bold text-green-800 underline decoration-green-300 underline-offset-4 transition hover:text-green-950">
              {isRegister ? "Giriş yap" : "Hesap oluştur"}
            </Link>
          </p>
        </div>
      </section>
    </div>
  </main>;
}

export default AuthPage;
