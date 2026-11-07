import { useState } from "react";
import { Link } from "react-router-dom";
import GoalProductFinder from "./GoalProductFinder";
import SmartCompareModal from "./SmartCompareModal";

function FeatureSection() {
const [isSmartCompareOpen, setIsSmartCompareOpen] = useState(false);
const [isGoalFinderOpen, setIsGoalFinderOpen] = useState(false);
return (
    <>
    <section className="bg-white py-10">
        <div className="max-w-7xl mx-auto px-6">
            {/*kartların zemininin hazırlanması*/}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {/*Akıllı karşılaştır kartının oluşturulması*/}
                <div className="rounded-2xl border border-green-100 bg-green-50 p-6 shadow-sm transition hover:shadow-md h-full">
                   <div className="flex items-start gap-4 h-full">
                   
                   {/*Akıllı Karşılaştır Kart ikonunun oluşturulması*/}
                   <div className="text-green-700 shrink-0">
                        <svg viewBox="0 0 64 64" className="w-14 h-14">
                        <circle
                            cx="26"
                            cy="26"
                            r="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                        />

                        <polyline
                            points="16,30 22,24 27,27 35,18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        <line
                            x1="40"
                            y1="40"
                            x2="52"
                            y2="52"
                            stroke="#111827"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
</svg>
                   </div>
                   <div className="flex flex-1 flex-col min-w-0"><h3 className="text-lg font-semibold min-h-[56px]">Akıllı Karşılaştır</h3>
                     <p className="mt-2 text-sm text-zinc-600">
                        Aynı gruptan iki ürünü seç; senin için önemli olan tek ölçütte hangisinin öne çıktığını gör.
                    </p>
                        {/*Kartın alt kısmında bulunan butonun oluşturulması*/}
                        <button
                            type="button"
                            onClick={() => setIsSmartCompareOpen(true)}
                            className="mt-auto cursor-pointer pt-4 inline-flex items-center gap-2 text-sm font-medium text-green-600 transition hover:text-green-700"
                        >
                            İki ürünü hızlı karşılaştır
                            <span>→</span>
                        </button></div>
                    </div>
                    
                </div>
                
                {/*Hedeflerine Uygun Seç Kartının oluşturulması*/}
                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-6 shadow-sm transition hover:shadow-md h-full">
                    <div className="flex items-start gap-4 h-full">
                        {/*Hedeflerine Uygun Seç Kart ikonunun oluşturulması*/}
                        <div className="text-violet-700 shrink-0">
                            <svg viewBox="0 0 64 64" className="w-14 h-14">
                            <circle
                                cx="40"
                                cy="22"
                                r="18"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />

                            <circle
                                cx="40"
                                cy="22"
                                r="10"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />

                            {/* Okun ana gövdesi */}
                            <line
                                x1="17"
                                y1="46"
                                x2="40"
                                y2="22"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                            />

                            {/* Okun ucu */}
                            <line
                                x1="40"
                                y1="22"
                                x2="31"
                                y2="24"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                            />

                            <line
                                x1="40"
                                y1="22"
                                x2="38"
                                y2="31"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                            />

                            {/* Kuyruk çizgileri */}
                            <line
                                x1="22"
                                y1="39"
                                x2="15"
                                y2="37"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />

                            <line
                                x1="23"
                                y1="40"
                                x2="25"
                                y2="47"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />

                            <line
                                x1="17"
                                y1="46"
                                x2="19"
                                y2="53"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <line
                                x1="17"
                                y1="46"
                                x2="10"
                                y2="44"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />

                            
                            </svg>
                        </div>
                        <div className="flex flex-1 flex-col min-w-0">
                            <h3 className="text-lg font-semibold min-h-[56px]">Hedeflerine Uygun Seç</h3>
                            <p className="mt-2 text-sm text-zinc-600">
                                  Bir kategori ve besin önceliği seç; ürünleri uygun referans ölçülerinde keşfet.
                            </p>
                            {/*Kartın alt kısmında bulunan butonun oluşturulması*/}
                            <button
                                type="button"
                                onClick={() => setIsGoalFinderOpen(true)}
                                className="mt-auto cursor-pointer pt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-600 transition hover:text-violet-700"
                            >
                                Hedefine göre ürün bul
                                <span>→</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Günlük Makro Takibi Kartının oluşturulması*/}
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm transition hover:shadow-md h-full">
                    <div className="flex items-start gap-4 h-full">
                        {/* Günlük Makro Takibi Kart ikonunun oluşturulması*/}
                        <div className="text-amber-600 shrink-0">
                            <svg viewBox="0 0 64 64" className="w-14 h-14">
                                <rect
                                    x="10"
                                    y="34"
                                    width="10"
                                    height="20"
                                    rx="2"
                                    fill="green"
                                    stroke="black"
                                    strokeWidth="1"
                                />
                                <rect
                                    x="27"
                                    y="24"
                                    width="10"
                                    height="30"
                                    rx="2"
                                    fill="green"
                                    stroke="black"
                                    strokeWidth="1"
                                />
                                <rect
                                    x="44"
                                    y="14"
                                    width="10"
                                    height="40"
                                    rx="2"
                                    fill="orange"
                                    stroke="black"
                                    strokeWidth="1"
                                />
                            </svg>
                        </div>
                        <div className="flex flex-1 flex-col min-w-0">
                            <h3 className="text-lg font-semibold min-h-[56px]">
                                Günlük Makro Takibi
                            </h3>
                            <p className="mt-2 text-sm text-zinc-600">
                                Günlük aldığın makroları takip et, hedeflerine ne kadar yaklaştığını gör.
                            </p>
                            {/*Kartın alt kısmında bulunan butonun oluşturulması*/}
                            <Link
                                to="/macro-tracker"
                                className="mt-auto inline-flex cursor-pointer items-center gap-2 pt-4 text-sm font-medium text-amber-600 transition hover:text-amber-700"
                            >
                                Takibe Başla
                                <span>→</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Yapay Zekâ Asistanı Kartının oluşturulması*/}
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-6 shadow-sm transition hover:shadow-md h-full">
                    <div className="flex items-start gap-4 h-full">
                        {/* Yapay Zekâ Asistanı Kart ikonunun oluşturulması*/}
                        <div className="text-sky-600 shrink-0">
                            <svg viewBox="0 0 64 64" className="w-14 h-14">
                                {/* Yapay zekâ asistanının kafası */}
                                <rect
                                    x="14"
                                    y="18"
                                    width="36"
                                    height="28"
                                    rx="8"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                />
                                {/* Yapay zekâ asistanının anteni */}
                                <line
                                    x1="32"
                                    y1="10"
                                    x2="32"
                                    y2="18"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                />
                                {/* Yapay zekâ asistanının anten noktası */}
                                <circle
                                    cx="32"
                                    cy="8"
                                    r="3"
                                    fill="currentColor"
                                />
                                {/* Yapay zekâ asistanının sol gözü */}
                                <circle
                                    cx="24"
                                    cy="30"
                                    r="3"
                                    fill="currentColor"
                                />
                                {/* Yapay zekâ asistanının sağ gözü */}
                                <circle
                                    cx="40"
                                    cy="30"
                                    r="3"
                                    fill="currentColor"
                                />
                                {/* Yapay zekâ asistanının ağzı */}
                                <line
                                    x1="26"
                                    y1="38"
                                    x2="38"
                                    y2="38"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                />
                                {/* Yapay zekâ asistanının vücut kısmı */}
                                <rect
                                    x="18"
                                    y="46"
                                    width="28"
                                    height="10"
                                    rx="2"
                                    fill="currentColor"
                                />
                                {/* Yapay zekâ asistanının sağ kolu */}
                                <line
                                    x1="20"
                                    y1="48"
                                    x2="50"
                                    y2="48"
                                    stroke="currentColor"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                />
                                
                                {/* Yapay zekâ asistanının sol kolu */}
                                <line
                                    x1="13"
                                    y1="48"
                                    x2="50"
                                    y2="48"
                                    stroke="currentColor"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                />
                                {/* Yapay zekâ asistanının sol kulağı */}
                                <rect
                                    x="8"
                                    y="25"
                                    width="6"
                                    height="12"
                                    rx="3"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                />
                                {/* Yapay zekâ asistanının sağ kulağı */}
                                <rect
                                    x="50"
                                    y="25"
                                    width="6"
                                    height="12"
                                    rx="3"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                />
                                
                            </svg>
                        </div>
                        <div className="flex flex-1 flex-col min-w-0 ">
                            <h3 className="text-lg font-semibold min-h-[56px]">
                                AI Asistan
                            </h3>
                            <p className="mt-2 text-sm text-zinc-600">
                                 Hedefine göre öneriler al, günlük menünü planla ve ürünleri daha doğru seç.
                            </p>
                            {/*Kartın alt kısmında bulunan butonun oluşturulması*/}
                            <Link
                                to="/assistant"
                                className="mt-auto pt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
                            >
                                Asistanı Aç
                                <span>→</span>
                            </Link>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    </section>
    {isSmartCompareOpen && <SmartCompareModal onClose={() => setIsSmartCompareOpen(false)} />}
    {isGoalFinderOpen && <GoalProductFinder onClose={() => setIsGoalFinderOpen(false)} />}
    </>
);
}
export default FeatureSection
