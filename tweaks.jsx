/* Renew Home — Tweaks panel (A/B controls for market testing) */
const { useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#00d962",
  "headline": 1.0,
  "heroLayout": "split",
  "cardStyle": "elevated"
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const root = document.documentElement;
  const a = t.accent || '#00d962';
  root.style.setProperty('--accent', a);
  root.style.setProperty('--accent-deep', `color-mix(in oklab, ${a}, #000 16%)`);
  root.style.setProperty('--accent-ink', `color-mix(in oklab, ${a}, #000 72%)`);
  root.style.setProperty('--green', a);
  root.style.setProperty('--green-soft', `color-mix(in oklab, ${a}, #fff 86%)`);
  root.style.setProperty('--green-tint', `color-mix(in oklab, ${a}, #fff 90%)`);
  root.style.setProperty('--hl', String(t.headline ?? 1));

  const heroC = document.getElementById('heroC');
  if (heroC) heroC.classList.toggle('centered', t.heroLayout === 'centered');

  const b2c = document.getElementById('b2c');
  if (b2c) b2c.classList.toggle('cardstyle-outline', t.cardStyle === 'outline');
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(() => { applyTweaks(t); }, [t]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Brand accent" />
      <TweakColor
        label="Accent color"
        value={t.accent}
        options={['#00d962', '#00b36a', '#14b8a6', '#34d058']}
        onChange={(v) => setTweak('accent', v)}
      />

      <TweakSection label="Typography" />
      <TweakSlider
        label="Headline scale"
        value={t.headline}
        min={0.85} max={1.18} step={0.01}
        onChange={(v) => setTweak('headline', v)}
      />

      <TweakSection label="Layout" />
      <TweakRadio
        label="B2C hero"
        value={t.heroLayout}
        options={[{ value: 'split', label: 'Split' }, { value: 'centered', label: 'Centered' }]}
        onChange={(v) => setTweak('heroLayout', v)}
      />
      <TweakRadio
        label="Value cards"
        value={t.cardStyle}
        options={[{ value: 'elevated', label: 'Elevated' }, { value: 'outline', label: 'Outline' }]}
        onChange={(v) => setTweak('cardStyle', v)}
      />
    </TweaksPanel>
  );
}

// apply defaults immediately (before panel ever opens)
applyTweaks(TWEAK_DEFAULTS);

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<App />);
