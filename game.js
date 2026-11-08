
/* =========================================================
   KMB BUS SIMULATOR
   Three.js city, bus driving, traffic and passenger walking
   ========================================================= */

(() => {
  "use strict";

  if (!window.THREE) {
    document.getElementById("loading").textContent =
      "THREE.JS COULD NOT LOAD. CHECK YOUR INTERNET CONNECTION.";
    return;
  }

  const $ = id => document.getElementById(id);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x91c9ed);
  scene.fog = new THREE.Fog(0x91c9ed, 100, 650);

  const camera = new THREE.PerspectiveCamera(
    70, innerWidth / innerHeight, .1, 1200
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.id = "game";
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  scene.add(new THREE.HemisphereLight(0xe5f5ff, 0x526044, 1.7));

  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-100,180,100);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  scene.add(sun);

  const mat = (color, roughness=.85) =>
    new THREE.MeshStandardMaterial({color,roughness});

  const materials = {
    road: new THREE.MeshStandardMaterial({
      map: KMBTextures.road, roughness: 1
    }),
    grass: mat(0x6a9c58),
    pavement: mat(0xb5b5ae),
    white: mat(0xffffff),
    yellow: mat(0xffd22f),
    red: mat(0xc8102e),
    black: mat(0x15191d),
    glass: new THREE.MeshStandardMaterial({
      color:0x8ac8e8, roughness:.18, metalness:.1
    }),
    rubber: mat(0x161719),
    metal: mat(0x999fa5)
  };

  const box = (w,h,d,material,x,y,z,parent=scene) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w,h,d), material
    );
    mesh.position.set(x,y,z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const cylinder = (r,h,material,x,y,z,parent=scene) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r,r,h,12),material
    );
    mesh.position.set(x,y,z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Ground
  box(1000,1,1000,materials.grass,0,-.65,0);

  // Roads and pavements
  const roads = [];
  for(let n=-4;n<=4;n++) {
    const p=n*65;
    const road1=box(19,.12,1000,materials.road,p,.02,0);
    const road2=box(1000,.12,19,materials.road,0,.02,p);
    roads.push(road1,road2);
    box(2,.13,1000,materials.white,p-10,.04,0);
    box(2,.13,1000,materials.white,p+10,.04,0);
    box(1000,.13,2,materials.white,0,.04,p-10);
    box(1000,.13,2,materials.white,0,.04,p+10);
    for(let z=-480;z<500;z+=25) {
      box(.35,.14,10,materials.yellow,p,.05,z);
    }
    for(let x=-480;x<500;x+=25) {
      box(10,.14,.35,materials.yellow,x,.05,p);
    }
  }

  // Procedural city buildings
  const buildingColors = [
    0xb9aaa0,0xc5c7c4,0xd2b99e,0x879eaa,
    0xb2b0a7,0xc7d1d3,0x9d9a91
  ];

  function makeBuilding(x,z) {
    const height=12+Math.random()*48;
    const width=15+Math.random()*13;
    const depth=15+Math.random()*13;
    const color=buildingColors[
      Math.floor(Math.random()*buildingColors.length)
    ];
    const material=new THREE.MeshStandardMaterial({
      map: KMBTextures.buildings[
        Math.floor(Math.random()*KMBTextures.buildings.length)
      ],
      color,
      roughness:.9
    });
    box(width,height,depth,material,x,height/2,z);

    // Rooftop details
    if(Math.random()>.45) {
      box(width*.3,2,depth*.3,materials.metal,
        x,height+1,z);
    }

    // Shopfront sign
    if(height<25) {
      const signMat=new THREE.MeshStandardMaterial({
        map:KMBTextures.shop,
        emissive:0x220000
      });
      box(width*.85,2,.25,signMat,x,3,z+depth/2+.14);
    }

    // Air-conditioning units
    if(Math.random()>.5) {
      for(let i=0;i<3;i++) {
        box(1.5,1,1,materials.metal,
          x-width/2-1, height*.35+i*3,z);
      }
    }
  }

  for(let x=-450;x<=450;x+=65) {
    for(let z=-450;z<=450;z+=65) {
      if(Math.abs(x)<18 || Math.abs(z)<18) continue;
      if(Math.random()>.18) makeBuilding(x+12,z+12);
    }
  }

  // Trees
  function makeTree(x,z) {
    cylinder(.45,4,mat(0x765036),x,2,z);
    const crown=new THREE.Mesh(
      new THREE.SphereGeometry(2.5,9,8),
      mat(0x287b43)
    );
    crown.position.set(x,5,z);
    crown.castShadow=true;
    scene.add(crown);
  }

  for(let i=0;i<150;i++) {
    const x=(Math.random()-.5)*900;
    const z=(Math.random()-.5)*900;
    if(Math.abs(x%65)<13 || Math.abs(z%65)<13) continue;
    makeTree(x,z);
  }

  // Harbour / water at the edge of the map
  const water=new THREE.Mesh(
    new THREE.PlaneGeometry(1000,170),
    new THREE.MeshStandardMaterial({
      color:0x258bb5,metalness:.3,roughness:.25
    })
  );
  water.rotation.x=-Math.PI/2;
  water.position.set(0,.05,-490);
  scene.add(water);

  // Bus model
  const bus=new THREE.Group();
  scene.add(bus);

  box(7,3.8,17,materials.red,0,2.2,0,bus);
  box(6.7,1.3,16.6,materials.red,0,4.65,0,bus);
  box(6.75,.25,16.6,materials.yellow,0,3.95,0,bus);

  // Lower-deck windows
  for(let side of [-1,1]) {
    for(let z=-6;z<=6;z+=3) {
      box(.08,1.15,2.55,materials.glass,
        side*3.53,2.85,z,bus);
    }
  }

  // Upper-deck windows
  for(let side of [-1,1]) {
    for(let z=-6;z<=6;z+=3) {
      box(.08,.85,2.55,materials.glass,
        side*3.42,4.65,z,bus);
    }
  }

  // Windscreen and destination display
  box(5.7,1.2,.12,materials.glass,0,3.1,8.56,bus);
  box(4.7,.55,.15,mat(0x101820),0,5.25,8.57,bus);
  const destinationSign=new THREE.MeshStandardMaterial({
    map:KMBTextures.kmb,
    emissive:0x330000
  });
  box(3.6,.55,.16,destinationSign,0,5.25,8.68,bus);

  // Wheels
  const wheels=[];
  for(let side of [-1,1]) {
    for(let z of [-5.5,5.5]) {
      const wheel=cylinder(.95,.55,materials.rubber,
        side*3.55,.95,z,bus);
      wheel.rotation.z=Math.PI/2;
      wheels.push(wheel);
      cylinder(.48,.58,materials.metal,
        side*3.56,.95,z,bus).rotation.z=Math.PI/2;
    }
  }

  // Headlights
  for(let side of [-1,1]) {
    box(1.1,.45,.15,materials.white,side*2.1,1.8,8.62,bus);
    box(1.1,.4,.15,materials.yellow,side*2.1,1.1,8.62,bus);
  }

  // Door
  const door=new THREE.Group();
  door.position.set(3.57,0,3);
  bus.add(door);
  const doorPanel=box(.12,2.9,2.1,materials.red,0,2.05,0,door);

  // Bus interior floor and seats
  box(6.4,.2,15,mat(0x454545),0,1.1,0,bus);
  for(let z=-5;z<=5;z+=2.5) {
    for(let side of [-1,1]) {
      box(1.5,.65,1.1,mat(0x303e54),
        side*1.8,1.65,z,bus);
      box(1.5,1.1,.18,mat(0x303e54),
        side*1.8,2.2,z-.48,bus);
    }
  }

  bus.position.set(0,0,0);

  // Bus stop locations
  const stops=[
    {x:0,z:48,name:"CENTRAL"},
    {x:65,z:65,name:"ADMIRALTY"},
    {x:130,z:65,name:"WAN CHAI"},
    {x:130,z:0,name:"CAUSEWAY BAY"},
    {x:65,z:0,name:"NORTH POINT"},
    {x:0,z:0,name:"CENTRAL TERMINUS"}
  ];

  const stopObjects=[];
  stops.forEach((s,i)=>{
    const group=new THREE.Group();
    group.position.set(s.x+13,0,s.z);
    scene.add(group);
    box(5,.25,9,materials.pavement,0,.15,0,group);
    box(5,.18,.2,materials.red,0,3,-4,group);
    box(.15,3,.15,materials.metal,-2.4,1.5,-4,group);
    box(.15,3,.15,materials.metal,2.4,1.5,-4,group);
    box(4.7,.12,8,materials.glass,0,2.7,-4,group);
    const sign=box(2.2,1.1,.2,materials.red,0,3.9,4,group);
    stopObjects.push({group,position:s,name:s.name});
  });

  // NPC passenger models
  const passengers=[];
  function makePerson(x,z,color=0x3c5875) {
    const p=new THREE.Group();
    const body=box(.65,1.05,.4,mat(color),0,1.05,0,p);
    cylinder(.25,.5,mat(0xf0c5a0),0,1.85,0,p);
    box(.23,.75,.25,materials.black,-.18,.38,0,p);
    box(.23,.75,.25,materials.black,.18,.38,0,p);
    p.position.set(x,0,z);
    scene.add(p);
    return p;
  }

  stops.forEach(s=>{
    for(let i=0;i<3;i++) {
      const p=makePerson(s.x+14+(Math.random()*2),s.z+i*1.4,
        [0x3c5875,0x8a4e42,0x4d7555,0x5c4b7c][i]);
      passengers.push({mesh:p,stop:s,waiting:true});
    }
  });

  // Other road traffic
  const traffic=[];
  function makeCar(x,z,color) {
    const car=new THREE.Group();
    box(2.8,1.1,5,mat(color),0,1,0,car);
    box(2.3,.8,2.5,materials.glass,0,1.8,-.2,car);
    for(let side of [-1,1]) {
      for(let zz of [-1.6,1.6]) {
        const w=cylinder(.48,.25,materials.rubber,
          side*1.4,.55,zz,car);
        w.rotation.z=Math.PI/2;
      }
    }
    car.position.set(x,0,z);
    scene.add(car);
    traffic.push({mesh:car,speed:8+Math.random()*8});
  }

  for(let i=0;i<16;i++) {
    makeCar((Math.random()-.5)*600,(Math.random()-.5)*600,
      [0xffffff,0x222222,0x2675aa,0xcccccc,0xc52d2d][i%5]);
  }

  // Player and game state
  const player={
    x:4.5,z:0,y:0,
    yaw:0,vertical:0,onGround:true
  };
  const keys={};
  let started=false;
  let walking=false;
  let doorsOpen=false;
  let lightsOn=false;
  let cameraMode=0;
  let speed=0;
  let gear="D";
  let fare=0;
  let passengerCount=0;
  let stopIndex=0;
  let stopTimer=0;
  let currentStop=-1;
  let lastTime=performance.now();
  let messageTimer=0;
  let busDistance=0;

  const playerBody=makePerson(player.x,player.z,0x2266aa);
  playerBody.visible=false;

  function say(text) {
    $("message").textContent=text;
    messageTimer=4;
  }

  function updateHUD() {
    $("speed").textContent=Math.round(Math.abs(speed)*3.6);
    $("gear").textContent=gear;
    $("fare").textContent="$"+fare;
    $("passengers").textContent=passengerCount;
    $("mode").textContent=walking?"PASSENGER MODE":"DRIVER MODE";
    $("walkBtn").textContent=walking?"GET ON":"GET OUT";
    $("doorBtn").textContent=doorsOpen?"CLOSE DOORS":"OPEN DOORS";
  }

  function nearestStop() {
    let best=-1,dist=Infinity;
    stops.forEach((s,i)=>{
      const d=Math.hypot(bus.position.x-s.x,bus.position.z-s.z);
      if(d<dist){dist=d;best=i;}
    });
    return dist<15?best:-1;
  }

  function openDoors() {
    doorsOpen=true;
    doorPanel.position.x=.8;
    KMBAudio.door();
    say("Doors opened. Passengers may board or leave.");
    const idx=nearestStop();
    if(idx>=0) {
      currentStop=idx;
      stopTimer=0;
    }
  }

  function closeDoors() {
    doorsOpen=false;
    doorPanel.position.x=0;
    KMBAudio.door();
    say("Doors closed. Ready to depart.");
  }

  function toggleDoors() {
    if(!walking && Math.abs(speed)<.5) {
      doorsOpen?closeDoors():openDoors();
    } else if(Math.abs(speed)>=.5) {
      say("Stop the bus before opening the doors!");
    }
  }

  function exitBus() {
    if(walking) return;
    if(Math.abs(speed)>1) {
      say("Stop the bus before getting off!");
      return;
    }
    if(!doorsOpen) {
      say("Open the doors first!");
      return;
    }
    walking=true;
    player.x=bus.position.x+6;
    player.z=bus.position.z;
    player.yaw=bus.rotation.y;
    playerBody.visible=true;
    playerBody.position.set(player.x,0,player.z);
    $("crosshair").style.display="block";
    $("walk-hint").style.display="block";
    $("controls").style.display="none";
    say("You are outside the bus. Walk around and explore!");
    updateHUD();
  }

  function enterBus() {
    const d=Math.hypot(player.x-bus.position.x,player.z-bus.position.z);
    if(d>12) {
      say("Get closer to the bus to board.");
      return;
    }
    if(!doorsOpen) {
      say("Open the bus doors first.");
      return;
    }
    walking=false;
    playerBody.visible=false;
    $("crosshair").style.display="none";
    $("walk-hint").style.display="none";
    $("controls").style.display="flex";
    say("Welcome aboard! You are now the driver.");
    updateHUD();
  }

  function interact() {
    if(walking) {
      enterBus();
      return;
    }
    toggleDoors();
  }

  function handleStop() {
    const idx=nearestStop();
    if(idx<0 || !doorsOpen || Math.abs(speed)>1) return;
    if(stopTimer>0) return;
    const waiting=passengers.filter(p=>p.waiting && p.stop===stops[idx]);
    const boarding=Math.min(waiting.length,5);
    waiting.slice(0,boarding).forEach(p=>{
      p.waiting=false;
      p.mesh.visible=false;
    });
    passengerCount+=boarding;
    fare+=boarding*5;
    stopTimer=8;
    say(stops[idx].name+": "+boarding+" passenger(s) boarded. Fare +$"+(boarding*5));
    updateHUD();
  }

  function updateBus(dt) {
    if(walking) return;

    const accelerating=keys.w;
    const braking=keys.s;
    const handbrake=keys[" "];

    if(gear==="D") {
      if(accelerating) speed+=17*dt;
      if(braking) speed-=28*dt;
    } else if(gear==="R") {
      if(accelerating) speed-=10*dt;
      if(braking) speed+=20*dt;
    } else {
      speed*=Math.pow(.2,dt);
    }

    if(handbrake) speed*=Math.pow(.01,dt);
    speed*=Math.pow(.992,dt*60);
    speed=THREE.MathUtils.clamp(speed,-12,32);

    const steer=(keys.a?1:0)-(keys.d?1:0);
    const steerFactor=Math.min(1,Math.abs(speed)/5);
    bus.rotation.y+=steer*1.35*steerFactor*dt*
      (speed>=0?1:-1);

    const forward=new THREE.Vector3(
      Math.sin(bus.rotation.y),0,Math.cos(bus.rotation.y)
    );
    bus.position.addScaledVector(forward,speed*dt);
    busDistance+=Math.abs(speed*dt);

    // Keep the bus within the city
    bus.position.x=THREE.MathUtils.clamp(bus.position.x,-470,470);
    bus.position.z=THREE.MathUtils.clamp(bus.position.z,-470,470);

    wheels.forEach(w=>w.rotation.x+=speed*dt);

    // Basic collision against nearby buildings
    if(Math.abs(bus.position.x)>480 || Math.abs(bus.position.z)>480) {
      speed=0;
    }

    if(Math.abs(speed)<.4) speed=0;

    if(stopTimer>0) stopTimer-=dt;
    handleStop();

    // Traffic movement
    traffic.forEach(t=>{
      t.mesh.position.z+=t.speed*dt;
      if(t.mesh.position.z>500)t.mesh.position.z=-500;
      const dx=t.mesh.position.x-bus.position.x;
      const dz=t.mesh.position.z-bus.position.z;
      if(Math.hypot(dx,dz)<5) {
        speed*=.96;
      }
    });

    // Simple passenger departure at stops
    if(currentStop>=0 && doorsOpen && stopTimer<=0) {
      currentStop=-1;
    }

    updateHUD();
  }

  function updateWalking(dt) {
    const forward=(keys.w?1:0)-(keys.s?1:0);
    const sideways=(keys.d?1:0)-(keys.a?1:0);
    const moveSpeed=keys.shift?10:5.5;

    const direction=new THREE.Vector3(
      sideways,0,forward
    );
    if(direction.length()>0) {
      direction.normalize().applyAxisAngle(
        new THREE.Vector3(0,1,0),player.yaw
      );
      player.x+=direction.x*moveSpeed*dt;
      player.z+=direction.z*moveSpeed*dt;
      player.yaw=Math.atan2(direction.x,direction.z);
      playerBody.rotation.y=player.yaw;
    }

    if(keys[" "] && player.onGround) {
      player.vertical=7;
      player.onGround=false;
    }

    player.vertical-=18*dt;
    player.y+=player.vertical*dt;
    if(player.y<=0) {
      player.y=0;
      player.vertical=0;
      player.onGround=true;
    }

    player.x=THREE.MathUtils.clamp(player.x,-490,490);
    player.z=THREE.MathUtils.clamp(player.z,-490,490);
    playerBody.position.set(player.x,player.y,player.z);
  }

  function updateCamera() {
    if(walking) {
      camera.position.set(player.x,player.y+2.2,player.z);
      const look=new THREE.Vector3(
        player.x+Math.sin(player.yaw)*10,
        player.y+2,
        player.z+Math.cos(player.yaw)*10
      );
      camera.lookAt(look);
      return;
    }

    if(cameraMode===1) {
      const forward=new THREE.Vector3(
        Math.sin(bus.rotation.y),0,Math.cos(bus.rotation.y)
      );
      camera.position.copy(bus.position)
        .addScaledVector(forward,1)
        .add(new THREE.Vector3(0,4,0));
      camera.lookAt(
        bus.position.x+forward.x*30,
        3,
        bus.position.z+forward.z*30
      );
    } else {
      const offset=new THREE.Vector3(0,8,-19);
      offset.applyAxisAngle(new THREE.Vector3(0,1,0),bus.rotation.y);
      camera.position.copy(bus.position).add(offset);
      camera.lookAt(bus.position.x,2.5,bus.position.z);
    }
  }

  // Minimap
  const mapCanvas=$("map");
  const mapCtx=mapCanvas.getContext("2d");

  function drawMap() {
    const c=mapCtx;
    c.clearRect(0,0,150,150);
    c.fillStyle="#6b9a68";
    c.fillRect(0,0,150,150);
    c.strokeStyle="#444";
    c.lineWidth=5;
    for(let n=-4;n<=4;n++) {
      const p=75+n*9.5;
      c.beginPath();c.moveTo(p,0);c.lineTo(p,150);c.stroke();
      c.beginPath();c.moveTo(0,p);c.lineTo(150,p);c.stroke();
    }
    stops.forEach(s=>{
      const x=75+s.x/1000*150;
      const y=75+s.z/1000*150;
      c.fillStyle="#ffdc36";
      c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();
    });
    const x=75+bus.position.x/1000*150;
    const y=75+bus.position.z/1000*150;
    c.save();
    c.translate(x,y);
    c.rotate(-bus.rotation.y);
    c.fillStyle="#d71920";
    c.beginPath();
    c.moveTo(0,-7);c.lineTo(-4,5);c.lineTo(4,5);c.closePath();
    c.fill();
    c.restore();
    if(walking) {
      c.fillStyle="#00ffff";
      c.beginPath();
      c.arc(75+player.x/1000*150,75+player.z/1000*150,3,0,Math.PI*2);
      c.fill();
    }
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt=Math.min((now-lastTime)/1000,.05);
    lastTime=now;

    if(started) {
      if(walking) updateWalking(dt);
      else updateBus(dt);

      updateCamera();
      drawMap();

      if(messageTimer>0) {
        messageTimer-=dt;
      } else {
        $("message").textContent=walking
          ?"Explore the city. Find your bus to board again."
          :"Follow the road and stop to pick up passengers.";
      }
    }

    renderer.render(scene,camera);
  }

  // Keyboard input
  addEventListener("keydown",e=>{
    const k=e.key.toLowerCase();
    if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) {
      e.preventDefault();
    }
    keys[k==="arrowup"?"w":
      k==="arrowdown"?"s":
      k==="arrowleft"?"a":
      k==="arrowright"?"d":k]=true;

    if(e.repeat)return;
    if(k==="e")interact();
    if(k==="h")KMBAudio.horn();
    if(k==="c") {
      cameraMode=(cameraMode+1)%2;
      say(cameraMode?"Front camera":"Chase camera");
    }
    if(k==="g") {
      gear=gear==="D"?"N":gear==="N"?"R":"D";
      say("Gear: "+gear);
    }
    if(k==="l") {
      lightsOn=!lightsOn;
      say(lightsOn?"Lights on":"Lights off");
    }
  });

  addEventListener("keyup",e=>{
    const k=e.key.toLowerCase();
    keys[k==="arrowup"?"w":
      k==="arrowdown"?"s":
      k==="arrowleft"?"a":
      k==="arrowright"?"d":k]=false;
  });

  // Touch controls
  document.querySelectorAll("[data-key]").forEach(button=>{
    const key=button.dataset.key;
    const down=e=>{e.preventDefault();keys[key]=true;};
    const up=e=>{e.preventDefault();keys[key]=false;};
    button.addEventListener("pointerdown",down);
    button.addEventListener("pointerup",up);
    button.addEventListener("pointerleave",up);
    button.addEventListener("pointercancel",up);
  });

  $("startBtn").addEventListener("click",()=>{
    started=true;
    $("start-screen").style.display="none";
    $("loading").style.display="none";
    KMBAudio.init();
    say("Welcome driver! Your shift starts now.");
    updateHUD();
  });

  $("doorBtn").addEventListener("click",toggleDoors);
  $("walkBtn").addEventListener("click",()=>{
    if(walking)enterBus();
    else exitBus();
  });
  $("hornBtn").addEventListener("click",()=>KMBAudio.horn());
  $("cameraBtn").addEventListener("click",()=>{
    cameraMode=(cameraMode+1)%2;
    say(cameraMode?"Front camera":"Chase camera");
  });
  $("lightBtn").addEventListener("click",()=>{
    lightsOn=!lightsOn;
    say(lightsOn?"Lights switched on":"Lights switched off");
  });

  // Resize
  addEventListener("resize",()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });

  updateHUD();
  requestAnimationFrame(animate);
})();
