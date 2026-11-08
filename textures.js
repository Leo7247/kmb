
/* KMB BUS SIMULATOR - PROCEDURAL TEXTURES */
window.KMBTextures = (() => {
  function makeTexture(draw, width = 512, height = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    draw(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
  }

  function road() {
    return makeTexture((c,w,h) => {
      c.fillStyle = "#343a40";
      c.fillRect(0,0,w,h);
      c.fillStyle = "#f5d66c";
      c.fillRect(w/2-3,0,6,h);
      c.fillStyle = "#e8e8e8";
      for(let y=0;y<h;y+=90) c.fillRect(w/2-35,y,5,45);
      for(let i=0;i<1600;i++) {
        c.fillStyle = Math.random() > .5 ? "#ffffff08" : "#00000010";
        c.fillRect(Math.random()*w,Math.random()*h,2,2);
      }
    });
  }

  function building(color) {
    return makeTexture((c,w,h) => {
      c.fillStyle = color;
      c.fillRect(0,0,w,h);
      for(let y=18;y<h-10;y+=38) {
        for(let x=15;x<w-10;x+=38) {
          c.fillStyle = Math.random() > .25 ? "#9bd6ed" : "#273c50";
          c.fillRect(x,y,23,25);
          c.fillStyle = "#ffffff35";
          c.fillRect(x+2,y+2,4,21);
        }
      }
      c.fillStyle = "#333";
      c.fillRect(0,h-12,w,12);
    });
  }

  function sign(text, color="#d71920") {
    return makeTexture((c,w,h) => {
      c.fillStyle = color;
      c.fillRect(0,0,w,h);
      c.fillStyle = "white";
      c.font = "bold 65px Arial";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(text,w/2,h/2);
    },512,160);
  }

  return {
    road: road(),
    buildings: [
      building("#b7a99a"),
      building("#c8d0d1"),
      building("#d2bba0"),
      building("#879eaa"),
      building("#b6b4aa")
    ],
    kmb: sign("KMB","#c8102e"),
    shop: sign("茶餐廳","#c21e24"),
    sky: new THREE.Color("#8fc9ee")
  };
})();
