// Tekrarlanan range slider yapısını yeniden kullanılabilir hale getiren bileşen
function RangeSlider({
  label,
  value,
  defaultValue,
  min = 0,
  max,
  step,
  onChange,
}) {
  // Slider'ın mevcut değerinin toplam aralık içindeki yüzdesini hesaplar
  const currentValue = Number(value || defaultValue);
  
  const percentage = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className="mt-3">
      <p className="mb-1 text-xs text-zinc-500">{label}</p>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full accent-green-500"
        style={{
          background: `linear-gradient(
    to right,
    var(--color-green-600) 0%,
    var(--color-green-600) ${percentage}%,
    var(--color-zinc-200) ${percentage}%,
    var(--color-zinc-200) 100%
  )`,
        }}
      />
    </div>
  );
}

export default RangeSlider;
