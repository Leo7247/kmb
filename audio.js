
/* KMB BUS SIMULATOR - AUDIO */
window.KMBAudio = (() => {
  let ctx = null;
  let enabled = true;

  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function tone(freq=440, duration=.15, type="sine", volume=.08) {
    if (!enabled) return;
    init();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime+duration);
  }

  return {
    init,
    horn() {
      tone(220,.5,"sawtooth",.12);
      setTimeout(()=>tone(180,.5,"sawtooth",.12),120);
    },
    click() { tone(650,.07,"square",.035); },
    door() {
      tone(500,.15,"sine");
      setTimeout(()=>tone(700,.15,"sine"),170);
    },
    beep() { tone(880,.1,"sine"); },
    toggle() { enabled = !enabled; return enabled; }
  };
})();
