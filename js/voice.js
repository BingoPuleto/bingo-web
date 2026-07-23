const Voice = (() => {
  const STORAGE_KEY = 'bingo_voice_announcements_enabled';
  const LANG = 'pt-BR';

  const announcedNumbers = new Set();
  let preferredVoice = null;

  function supported() {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance === 'function'
    );
  }

  function readStoredPreference() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // Sem preferência salva ainda: anúncio por voz habilitado por padrão.
      return saved === null ? true : saved === 'true';
    } catch (_) {
      // localStorage indisponível (ex.: modo de navegação privada) — usa o padrão.
      return true;
    }
  }

  let enabled = supported() && readStoredPreference();

  function pickPreferredVoice() {
    if (!supported()) return;
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      preferredVoice =
        voices.find((v) => v.lang === LANG) ||
        voices.find((v) => (v.lang || '').toLowerCase().startsWith('pt')) ||
        null;
    } catch (_) {
      preferredVoice = null;
    }
  }

  function init() {
    if (!supported()) return;
    pickPreferredVoice();
    // A lista de vozes normalmente carrega de forma assíncrona.
    try {
      window.speechSynthesis.onvoiceschanged = pickPreferredVoice;
    } catch (_) {
      // Ignorado: nem todo navegador expõe esse evento.
    }
  }

  function isSupported() {
    return supported();
  }

  function isEnabled() {
    return enabled;
  }

  function setEnabled(value) {
    enabled = supported() && Boolean(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch (_) {
      // Falha ao persistir a preferência não deve afetar o jogo.
    }
    if (!enabled) {
      stop();
    }
  }
  
  function seed(numbers) {
    (numbers || []).forEach((n) => announcedNumbers.add(n));
  }

  const BINGO_CALLS = {
    13: 'Faz o L!',
    22: 'Dois patinhos na lagoa',
    24: 'Número do amigo',
    33: 'Idade de Cristo',
    51: 'Uma boa ideia',
    67: 'Six Seven!',
  };

  const BINGO_CALLS_NOREPEAT = {
    61: 'Meia um',
    62: 'Meia dois',
    63: 'Meia três',
    64: 'Meia quatro',
    65: 'Meia cinco',
    66: 'Meia seis',
    68: 'Meia oito'
  };

  function announceNumber(number) {
    if (!supported() || !enabled) return;
    if (announcedNumbers.has(number)) return;
    announcedNumbers.add(number);

    try {
      let text;

      if (number === 69) text = `Lá ele! Número ${number}`;
      else if (BINGO_CALLS[number]) text = `${BINGO_CALLS[number]}, Número ${number}`;
      else if (BINGO_CALLS_NOREPEAT[number]) text = `Número ${BINGO_CALLS_NOREPEAT[number]}`;
      else text = `Número ${number}`;  

      const utterance = new SpeechSynthesisUtterance(text);
      console.log('Anunciando número por voz:', text);
      utterance.lang = LANG;
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      // Qualquer falha do SpeechSynthesis é silenciosa: não afeta o jogo.
    }
  }

  function stop() {
    if (!supported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch (_) {
      // Ignorado propositalmente.
    }
  }

  function setEnabledSilent(value) {
    enabled = supported() && Boolean(value);
    if (!enabled) stop();
  }

  init();

  return {
    isSupported,
    isEnabled,
    setEnabled,
    seed,
    announceNumber,
    setEnabledSilent,
    stop,
  };
})();