
/* Lightweight Web Audio sound effects. Audio starts after a user gesture. */
window.KMBAudio = (() => {
  let ctx = null;
  let enabled = true;

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;

    if (!ctx && AC) {
      ctx = new AC();
    }

    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function tone(freq=440,duration=.15,type='sine',volume=.06) {
    if (!enabled) return;

    init();
    if (!ctx) return;

    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = type;
    o.frequency.value = freq;

    g.gain.setValueAtTime(volume,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);

    o.connect(g);
    g.connect(ctx.destination);

    o.start();
    o.stop(ctx.currentTime+duration);
  }

  return {
    init,

    horn() {
      tone(220,.45,'sawtooth',.11);
      setTimeout(() => tone(185,.4,'sawtooth',.1),110);
    },

    click() {
      tone(680,.07,'square',.025);
    },

    door() {
      tone(490,.13,'sine',.05);
      setTimeout(() => tone(690,.14,'sine',.05),160);
    },

    bell() {
      tone(880,.18,'sine',.05);
      setTimeout(() => tone(1175,.22,'sine',.04),180);
    },

    engine(speed=0) {
      if (speed>2) {
        tone(65+Math.min(speed,30)*3,.07,'sawtooth',.012);
      }
    },

    toggle() {
      enabled = !enabled;
      return enabled;
    }
  };
})();
