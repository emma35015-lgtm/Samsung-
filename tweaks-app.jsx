/* Tweaks app — temas, acento, tipografía, fórmulas */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "Editorial",
  "accent": "auto",
  "textScale": 1,
  "formulas": true
}/*EDITMODE-END*/;

const THEME_MAP = { Editorial: "editorial", Noir: "noir", Cobalt: "cobalt" };

const ACCENTS = {
  auto:   { label: "Por tema", swatch: "linear-gradient(135deg,#1428a0,#8e93ff)" },
  blue:   { label: "Samsung",  pair: ["#1428a0", "#6f74c7"], swatch: "#1428a0" },
  violet: { label: "Violeta",  pair: ["#8e93ff", "#b9b1ff"], swatch: "#8e93ff" },
  cobalt: { label: "Cobalto",  pair: ["#2f6bff", "#7aa0ff"], swatch: "#2f6bff" },
};

function TweaksApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = THEME_MAP[t.theme] || "editorial";
    if (t.accent === "auto" || !ACCENTS[t.accent]) {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-2");
    } else {
      const p = ACCENTS[t.accent].pair;
      root.style.setProperty("--accent", p[0]);
      root.style.setProperty("--accent-2", p[1]);
    }
    root.style.setProperty("--font-scale", t.textScale);
    document.body.classList.toggle("hide-formulas", !t.formulas);
  }, [t.theme, t.accent, t.textScale, t.formulas]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Tema visual" />
      <TweakRadio
        label="Estilo"
        value={t.theme}
        options={["Editorial", "Noir", "Cobalt"]}
        onChange={(v) => setTweak("theme", v)}
      />
      <TweakSection label="Color de acento" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.keys(ACCENTS).map((key) => {
          const a = ACCENTS[key];
          const sel = t.accent === key;
          return (
            <button
              key={key}
              onClick={() => setTweak("accent", key)}
              title={a.label}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "7px 11px 7px 8px", borderRadius: 999,
                border: sel ? "1.5px solid #111" : "1px solid #d9d9de",
                background: sel ? "#fff" : "#fafafa", cursor: "pointer",
                fontSize: 12, fontWeight: 600, color: "#222",
              }}
            >
              <span style={{
                width: 16, height: 16, borderRadius: "50%",
                background: a.swatch, border: "1px solid rgba(0,0,0,.15)",
                boxShadow: sel ? "0 0 0 2px #fff inset" : "none",
              }} />
              {a.label}
            </button>
          );
        })}
      </div>
      <TweakSection label="Lectura" />
      <TweakSlider
        label="Tamaño de texto"
        value={t.textScale}
        min={0.9} max={1.18} step={0.02} unit="×"
        onChange={(v) => setTweak("textScale", v)}
      />
      <TweakToggle
        label="Mostrar fórmulas"
        value={t.formulas}
        onChange={(v) => setTweak("formulas", v)}
      />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("tweaks-root")).render(<TweaksApp />);
