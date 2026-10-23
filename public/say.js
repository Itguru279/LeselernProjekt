// Vorlesen mit der Sprachausgabe des Geräts (läuft im Browser, keine Cloud nötig).

let voice = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'de-DE' && v.localService) ||
    voices.find((v) => v.lang === 'de-DE') ||
    voices.find((v) => v.lang && v.lang.startsWith('de')) ||
    null
  );
}

if ('speechSynthesis' in window) {
  voice = pickVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    voice = pickVoice();
  });
}

export function canSpeak() {
  return 'speechSynthesis' in window;
}

export function speak(text, { rate = 0.85 } = {}) {
  if (!canSpeak() || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  if (voice) u.voice = voice;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

// Alle Knöpfe mit data-say vorlesen lassen
document.addEventListener('click', (e) => {
  const el = e.target instanceof Element ? e.target.closest('.say[data-say]') : null;
  if (el) speak(el.getAttribute('data-say'));
});
