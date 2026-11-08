
/* Procedural KMB vehicle, road, city and interior textures. No image downloads required. */
(() => {
  "use strict";

  if (!window.THREE) return;

  const canvasTexture = (draw, w=512, h=512, repeat=false) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;

    const g = c.getContext('2d');
    draw(g,w,h);

    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 2;

    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
    }

    return t;
  };

  const road = canvasTexture((c,w,h) => {
    c.fillStyle = '#343a40';
    c.fillRect(0,0,w,h);

    for (let i=0; i<2600; i++) {
      c.fillStyle = i%2 ? '#ffffff08' : '#0000000c';
      c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2);
    }

    c.fillStyle = '#b7a77b';
    c.fillRect(8,0,3,h);
    c.fillRect(w-11,0,3,h);

    c.fillStyle = '#f2e7c4';
    for (let y=0; y<h; y+=100) {
      c.fillRect(w/2-2,y,4,48);
    }
  },512,512,true);

  function facade(base) {
    return canvasTexture((c,w,h) => {
      c.fillStyle = base;
      c.fillRect(0,0,w,h);

      c.fillStyle = '#5b6268';
      c.fillRect(0,0,w,12);

      for (let y=20; y<h-12; y+=42) {
        for (let x=16; x<w-10; x+=39) {
          c.fillStyle = Math.random()>.18 ? '#8ec6d8' : '#283d50';
          c.fillRect(x,y,25,29);

          c.fillStyle = '#e7f3f2';
          c.fillRect(x+2,y+2,2,25);

          c.fillStyle = '#697982';
          c.fillRect(x,y+27,25,3);
        }
      }

      c.fillStyle = '#4b4641';
      c.fillRect(0,h-13,w,13);
    });
  }

  const busSide = canvasTexture((c,w,h) => {
    c.fillStyle = '#c8102e';
    c.fillRect(0,0,w,h);

    c.fillStyle = '#f2c94c';
    c.fillRect(0,h*.72,w,h*.055);

    c.fillStyle = '#eee';
    c.fillRect(0,h*.84,w,h*.16);

    c.fillStyle = '#152638';
    c.fillRect(8,12,w-16,h*.43);

    for (let x=18; x<w-12; x+=83) {
      c.fillStyle = '#8cc9e1';
      c.fillRect(x,20,70,h*.34);

      c.fillStyle = '#d8edf2';
      c.fillRect(x+4,24,3,h*.29);
    }

    c.fillStyle = '#b10d27';
    c.font = 'bold 42px Arial';
    c.textAlign = 'center';
    c.fillText('KMB',w/2,h*.68);

    c.fillStyle = '#20252b';
    c.fillRect(0,h-18,w,18);
  },1024,256);

  const busFront = canvasTexture((c,w,h) => {
    c.fillStyle = '#c8102e';
    c.fillRect(0,0,w,h);

    c.fillStyle = '#142331';
    c.fillRect(36,18,w-72,h*.48);

    c.fillStyle = '#8bc9e2';
    c.fillRect(48,28,w-96,h*.38);

    c.fillStyle = '#e5edf0';
    c.fillRect(0,h*.68,w,h*.08);

    c.fillStyle = '#f4c84c';
    c.fillRect(0,h*.79,w,h*.06);

    c.fillStyle = '#c8102e';
    c.font = 'bold 52px Arial';
    c.textAlign = 'center';
    c.fillText('KMB',w/2,h*.96);
  },512,256);

  const busRear = canvasTexture((c,w,h) => {
    c.fillStyle = '#c8102e';
    c.fillRect(0,0,w,h);

    c.fillStyle = '#162536';
    c.fillRect(45,20,w-90,h*.36);

    c.fillStyle = '#8bc9e2';
    c.fillRect(54,28,w-108,h*.28);

    c.fillStyle = '#f3d04e';
    c.fillRect(0,h*.72,w,h*.06);

    c.fillStyle = '#eee';
    c.fillRect(0,h*.84,w,h*.16);

    c.fillStyle = '#bd102b';
    c.font = 'bold 44px Arial';
    c.textAlign = 'center';
    c.fillText('KMB',w/2,h*.68);
  },512,256);

  const seat = canvasTexture((c,w,h) => {
    c.fillStyle = '#293d59';
    c.fillRect(0,0,w,h);

    c.fillStyle = '#456b91';
    for (let y=8; y<h; y+=32) {
      c.fillRect(5,y,w-10,20);
    }

    c.strokeStyle = '#8ba8bd';
    c.lineWidth = 3;

    for (let x=0; x<w; x+=32) {
      c.beginPath();
      c.moveTo(x,0);
      c.lineTo(x,h);
      c.stroke();
    }
  },256,256,true);

  const floor = canvasTexture((c,w,h) => {
    c.fillStyle = '#4d5156';
    c.fillRect(0,0,w,h);

    c.strokeStyle = '#747b80';
    c.lineWidth = 2;

    for (let x=0; x<w; x+=32) {
      c.beginPath();
      c.moveTo(x,0);
      c.lineTo(x,h);
      c.stroke();
    }

    for (let y=0; y<h; y+=32) {
      c.beginPath();
      c.moveTo(0,y);
      c.lineTo(w,y);
      c.stroke();
    }
  },256,256,true);

  const shop = canvasTexture((c,w,h) => {
    c.fillStyle = '#bd202b';
    c.fillRect(0,0,w,h);
    c.fillStyle = '#fff';
    c.font = 'bold 62px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('茶餐廳',w/2,h/2);
  },512,160);

  const destination = (route='1 CENTRAL') => canvasTexture((c,w,h) => {
    c.fillStyle = '#101820';
    c.fillRect(0,0,w,h);
    c.fillStyle = '#ffd84d';
    c.font = 'bold 44px Arial';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(route,w/2,h/2);
  },512,128);

  window.KMBTextures = {
    road,
    facades: [
      facade('#b7a99a'),
      facade('#c8d0d1'),
      facade('#d2bba0'),
      facade('#879eaa'),
      facade('#b6b4aa')
    ],
    busSide,
    busFront,
    busRear,
    seat,
    floor,
    shop,
    destination
  };
})();
