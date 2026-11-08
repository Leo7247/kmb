
/* KMB BUS SIMULATOR — optimized city, textured double-decker, route selection,
   animated pedestrians, manual driving and AI-driven passenger mode. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const loading = $('loading');
  const loadError = $('loadError');

  if (!window.THREE) {
    loading.textContent = 'THREE.JS DID NOT LOAD — CHECK YOUR CONNECTION AND REFRESH.';
    $('startScreen').style.display = 'grid';
    loadError.textContent = 'The 3D library could not be downloaded from either CDN.';
    return;
  }

  if (!window.KMBTextures || !window.KMBAudio) {
    loading.textContent = 'GAME FILES DID NOT LOAD.';
    loadError.textContent = 'Check that textures.js and audio.js are in the repository root.';
    return;
  }

  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x91c9ed);
  scene.fog = new THREE.Fog(0x91c9ed,170,760);

  const camera = new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.1,1300);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled = false;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.id = 'game';

  document.body.insertBefore(renderer.domElement,document.body.firstChild);

  scene.add(new THREE.HemisphereLight(0xeaf6ff,0x59634c,1.55));

  const sun = new THREE.DirectionalLight(0xfff3dc,1.15);
  sun.position.set(-120,180,100);
  scene.add(sun);

  const mat = (color,roughness=.85,extra={}) =>
    new THREE.MeshStandardMaterial({color,roughness,...extra});

  const M = {
    grass: mat(0x6b9658),
    pavement: mat(0xb9b8b0),
    white: mat(0xf2f1e9),
    yellow: mat(0xf4d34e),
    red: mat(0xc8102e),
    darkRed: mat(0x8e0d25),
    black: mat(0x171b20),
    rubber: mat(0x17191b),
    metal: mat(0x9ca7ac,.45,{metalness:.55}),
    rail: mat(0xc5c9c8,.28,{metalness:.65}),
    glass: mat(0x85c7df,.16,{metalness:.12,transparent:true,opacity:.7}),
    windowDark: mat(0x142536,.22),
    seat: new THREE.MeshStandardMaterial({map:KMBTextures.seat,roughness:.92}),
    floor: new THREE.MeshStandardMaterial({map:KMBTextures.floor,roughness:1}),
    road: new THREE.MeshStandardMaterial({map:KMBTextures.road,roughness:1}),
    skin: mat(0xd9a982),
    tree: mat(0x2d7842),
    trunk: mat(0x765036)
  };

  const boxGeo = new THREE.BoxGeometry(1,1,1);
  const sphereGeo = new THREE.SphereGeometry(1,10,8);
  const cylGeo = new THREE.CylinderGeometry(1,1,1,12);

  function box(w,h,d,material,x,y,z,parent=scene) {
    const o = new THREE.Mesh(boxGeo,material);
    o.scale.set(w,h,d);
    o.position.set(x,y,z);
    o.castShadow = false;
    o.receiveShadow = false;
    parent.add(o);
    return o;
  }

  function cylinder(radius,height,material,x,y,z,parent=scene,segments=12) {
    const o = new THREE.Mesh(
      segments===12 ? cylGeo : new THREE.CylinderGeometry(radius,radius,height,segments),
      material
    );

    if (segments===12) {
      o.scale.set(radius,height,radius);
    } else {
      o.scale.set(1,1,1);
    }

    o.position.set(x,y,z);
    parent.add(o);
    return o;
  }

  function sphere(rx,ry,rz,material,x,y,z,parent) {
    const o = new THREE.Mesh(sphereGeo,material);
    o.scale.set(rx,ry,rz);
    o.position.set(x,y,z);
    parent.add(o);
    return o;
  }

  // -------------------- CITY --------------------

  box(1050,1,1050,M.grass,0,-.7,0);

  const roadMat = M.road;

  for (let n=-4; n<=4; n++) {
    const p=n*65;

    box(20,.12,1040,roadMat,p,.02,0);
    box(1040,.12,20,roadMat,0,.02,p);

    box(.18,.025,1040,M.white,p-10,.095,0);
    box(.18,.025,1040,M.white,p+10,.095,0);
    box(1040,.025,.18,M.white,0,.095,p-10);
    box(1040,.025,.18,M.white,0,.095,p+10);
  }

  // Lane markings use textures instead of hundreds of individual meshes.
  const laneCanvas = document.createElement('canvas');
  laneCanvas.width = 64;
  laneCanvas.height = 512;

  const laneCtx = laneCanvas.getContext('2d');
  laneCtx.clearRect(0,0,64,512);
  laneCtx.fillStyle = '#eee7ce';

  for (let y=0; y<512; y+=100) {
    laneCtx.fillRect(29,y,6,48);
  }

  const laneTex = new THREE.CanvasTexture(laneCanvas);
  laneTex.wrapS = laneTex.wrapT = THREE.RepeatWrapping;
  laneTex.repeat.set(1,2);

  const laneMat = new THREE.MeshBasicMaterial({
    map:laneTex,
    transparent:true,
    depthWrite:false
  });

  for (let n=-4; n<=4; n++) {
    const p=n*65;

    const vz = new THREE.Mesh(
      new THREE.PlaneGeometry(1,1040),
      laneMat
    );
    vz.rotation.x = -Math.PI/2;
    vz.position.set(p,.105,0);
    scene.add(vz);

    const hz = new THREE.Mesh(
      new THREE.PlaneGeometry(1040,1),
      laneMat
    );
    hz.rotation.x = -Math.PI/2;
    hz.rotation.z = Math.PI/2;
    hz.position.set(0,.106,p);
    scene.add(hz);
  }

  const buildingColors = [
    0xb9aaa0,0xc5c7c4,0xd2b99e,0x879eaa,
    0xb2b0a7,0xc7d1d3,0x9d9a91
  ];

  const buildings = [];

  function makeBuilding(x,z) {
    const h=14+Math.random()*43;
    const w=15+Math.random()*12;
    const d=15+Math.random()*12;

    const idx=Math.floor(Math.random()*KMBTextures.facades.length);

    const material = new THREE.MeshStandardMaterial({
      map:KMBTextures.facades[idx],
      color:buildingColors[idx],
      roughness:.92
    });

    const body = box(w,h,d,material,x,h/2,z);
    buildings.push({x,z,w,d,h,mesh:body});

    if (Math.random()>.55) {
      box(w*.32,1.8,d*.32,M.metal,x,h+1,z);
    }

    if (h<25) {
      const signMat = new THREE.MeshStandardMaterial({
        map:KMBTextures.shop
      });
      box(w*.82,2,.2,signMat,x,3,z+d/2+.12);
    }

    if (Math.random()>.55) {
      for (let i=0; i<2; i++) {
        box(1.5,.9,.9,M.metal,x-w/2-1,h*.4+i*2.4,z);
      }
    }
  }

  for (let x=-450; x<=450; x+=65) {
    for (let z=-450; z<=450; z+=65) {
      if (Math.abs(x)<20 || Math.abs(z)<20) continue;
      if (Math.random()>.24) makeBuilding(x+12,z+12);
    }
  }

  function makeTree(x,z) {
    cylinder(.42,3.8,M.trunk,x,1.9,z);
    sphere(2.2,2.8,2.2,M.tree,x,5,z,scene);
  }

  for (let i=0; i<90; i++) {
    const x=(Math.random()-.5)*900;
    const z=(Math.random()-.5)*900;

    if (Math.abs(x%65)>13 && Math.abs(z%65)>13) {
      makeTree(x,z);
    }
  }

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1050,180),
    mat(0x258bb5,.25,{metalness:.25})
  );

  water.rotation.x = -Math.PI/2;
  water.position.set(0,.04,-500);
  scene.add(water);

  for (let i=0; i<8; i++) {
    sphere(
      18+Math.random()*20,
      5,
      12+Math.random()*15,
      M.tree,
      -420+i*115,
      2,
      -425,
      scene
    );
  }

  // -------------------- ROUTES --------------------

  const routeSets = [
    {
      number:'1',
      name:'CENTRAL CITY LOOP',
      destination:'CENTRAL',
      stops:[
        {x:0,z:48,name:'CENTRAL'},
        {x:65,z:65,name:'ADMIRALTY'},
        {x:130,z:65,name:'WAN CHAI'},
        {x:130,z:0,name:'CAUSEWAY BAY'},
        {x:65,z:0,name:'NORTH POINT'},
        {x:0,z:0,name:'CENTRAL TERMINUS'}
      ]
    },
    {
      number:'2',
      name:'HARBOUR & NORTH POINT',
      destination:'NORTH POINT',
      stops:[
        {x:0,z:48,name:'CENTRAL'},
        {x:0,z:130,name:'SHEUNG WAN'},
        {x:65,z:130,name:'WESTERN'},
        {x:130,z:130,name:'QUARRY BAY'},
        {x:130,z:65,name:'TAI KOO'},
        {x:65,z:0,name:'NORTH POINT'}
      ]
    },
    {
      number:'3',
      name:'KOWLOON CITY LOOP',
      destination:'KOWLOON',
      stops:[
        {x:-65,z:0,name:'JORDAN'},
        {x:-130,z:0,name:'YAU MA TEI'},
        {x:-130,z:65,name:'MONG KOK'},
        {x:-65,z:130,name:'PRINCE EDWARD'},
        {x:0,z:130,name:'KOWLOON CITY'},
        {x:0,z:48,name:'CENTRAL FERRY'}
      ]
    }
  ];

  let route = routeSets[0];

  // -------------------- DOUBLE-DECKER BUS --------------------

  const bus = new THREE.Group();
  scene.add(bus);

  const bodyMat = new THREE.MeshStandardMaterial({
    map:KMBTextures.busSide,
    roughness:.62,
    metalness:.12
  });

  const frontMat = new THREE.MeshStandardMaterial({
    map:KMBTextures.busFront,
    roughness:.55
  });

  const rearMat = new THREE.MeshStandardMaterial({
    map:KMBTextures.busRear,
    roughness:.6
  });

  // Open-sided shell: glass stays transparent so both decks are visible.
  box(6.9,.28,16.9,M.yellow,0,.72,0,bus);
  box(6.9,.22,16.9,M.black,0,.48,0,bus);
  box(6.95,.24,16.9,M.red,0,5.82,0,bus);

  // Red lower side skirts and slim pillars.
  for (const side of [-1,1]) {
    box(.14,1.05,16.9,bodyMat,side*3.48,1.35,0,bus);

    for (let z=-7.7; z<=7.7; z+=2.25) {
      box(.13,4.0,.12,M.red,side*3.5,3.35,z,bus);
    }
  }

  // Front and rear panels are split around the windscreens.
  box(6.9,1.25,.14,frontMat,0,1.35,8.56,bus);
  box(6.9,.85,.14,frontMat,0,5.92,8.56,bus);
  box(6.9,1.25,.14,rearMat,0,1.35,-8.56,bus);
  box(6.9,.85,.14,rearMat,0,5.92,-8.56,bus);

  box(.42,3.0,.14,M.red,-3.22,3.6,8.56,bus);
  box(.42,3.0,.14,M.red,3.22,3.6,8.56,bus);
  box(.42,3.0,.14,M.red,-3.22,3.6,-8.56,bus);
  box(.42,3.0,.14,M.red,3.22,3.6,-8.56,bus);

  // Windows on both decks and both sides.
  for (const side of [-1,1]) {
    for (let z=-6.8; z<=6.8; z+=2.25) {
      box(.09,1.35,1.9,M.glass,side*3.53,2.45,z,bus);
      box(.09,1.28,1.9,M.glass,side*3.53,4.55,z,bus);
      box(.1,.08,1.95,M.rail,side*3.58,3.15,z,bus);
    }

    box(.18,.5,.8,M.black,side*3.7,3.1,7.4,bus);
    box(.12,.3,.55,M.metal,side*3.85,3.35,7.4,bus);
  }

  box(5.8,1.55,.1,M.glass,0,2.95,8.63,bus);
  box(5.8,1.35,.1,M.glass,0,5.05,8.63,bus);
  box(5.7,.35,.16,M.windowDark,0,5.85,8.64,bus);

  let destinationTexture = new THREE.MeshBasicMaterial({
    map:KMBTextures.destination('1 CENTRAL'),
    side:THREE.DoubleSide
  });

  box(4.2,.42,.08,destinationTexture,0,5.87,8.75,bus);

  for (const side of [-1,1]) {
    box(1.15,.48,.15,M.white,side*2.2,1.35,8.68,bus);
    box(1.0,.22,.15,M.yellow,side*2.2,2.05,8.68,bus);
    box(.8,.22,.15,M.red,side*2.2,1.0,-8.68,bus);
  }

  // Interior: lower and upper decks.
  const interior = new THREE.Group();
  bus.add(interior);

  box(6.65,.16,16.3,M.floor,0,1.05,0,interior);
  box(6.65,.16,16.3,M.floor,0,3.55,0,interior);

  const seatGroups = [];

  function addSeat(x,y,z) {
    const g = new THREE.Group();
    g.position.set(x,y,z);
    interior.add(g);

    box(1.35,.18,1.15,M.seat,0,.55,0,g);
    box(1.35,1.05,.18,M.seat,0,1.08,-.48,g);
    box(.12,.7,.12,M.metal,-.56,.35,.42,g);
    box(.12,.7,.12,M.metal,.56,.35,.42,g);

    seatGroups.push(g);
  }

  for (const deckY of [1.14,3.64]) {
    for (let z=-6; z<=5; z+=2.45) {
      addSeat(-2.05,deckY,z);
      addSeat(2.05,deckY,z);
    }
  }

  // Grab rails and poles.
  for (const y of [1.2,3.7]) {
    for (let z=-6; z<=6; z+=2) {
      cylinder(.045,1.15,M.rail,0,y+.8,z,interior,8);
    }

    for (const side of [-1,1]) {
      cylinder(.035,1.2,M.rail,side*2.9,y+.8,0,interior,8);
    }
  }

  // Staircase.
  for (let i=0; i<8; i++) {
    box(1.15,.16,.62,mat(0x777b80),1.95,1.3+i*.29,5.9-i*.72,interior);
  }

  // Driver cockpit.
  box(2.8,.45,1.4,mat(0x202a32),-1.75,1.45,7.0,interior);
  box(2.4,.55,.12,mat(0x151d25),-1.75,1.8,7.5,interior);

  const steering = new THREE.Group();
  steering.position.set(-2.55,2.0,7.15);
  interior.add(steering);

  const wheelMesh = new THREE.Mesh(
    new THREE.TorusGeometry(.42,.055,8,24),
    M.black
  );

  wheelMesh.rotation.y = Math.PI/2;
  steering.add(wheelMesh);

  cylinder(.12,.12,M.metal,0,0,0,steering,10);
  box(1.0,1.0,1.0,M.seat,-2.25,1.35,5.75,interior);

  // Passenger entrance doors.
  const doorGroup = new THREE.Group();
  doorGroup.position.set(3.58,0,3.2);
  bus.add(doorGroup);

  const doorL = box(.08,2.85,1.0,M.red,-.52,2.55,0,doorGroup);
  const doorR = box(.08,2.85,1.0,M.red,.52,2.55,0,doorGroup);

  let doorsOpen = false;
  const wheels = [];

  for (const side of [-1,1]) {
    for (const z of [-5.5,5.5]) {
      const tire = cylinder(.94,.56,M.rubber,side*3.56,.95,z,bus,20);
      tire.rotation.z = Math.PI/2;
      wheels.push(tire);

      const hub = cylinder(.49,.58,M.metal,side*3.57,.95,z,bus,16);
      hub.rotation.z = Math.PI/2;

      cylinder(.22,.6,M.black,side*3.58,.95,z,bus,12).rotation.z = Math.PI/2;
    }
  }

  function setDestination() {
    destinationTexture.map = KMBTextures.destination(
      route.number+' '+route.destination
    );
    destinationTexture.map.needsUpdate = true;
  }

  // -------------------- BUS STOPS --------------------

  const stopMeshes = [];

  routeSets.flatMap(r=>r.stops)
    .filter((s,i,a)=>a.findIndex(t=>t.x===s.x&&t.z===s.z)===i)
    .forEach(s=>{
      const shelter = new THREE.Group();
      shelter.position.set(s.x+13,0,s.z);
      scene.add(shelter);

      box(5,.18,8,M.pavement,0,.12,0,shelter);
      box(5,.15,.18,M.red,0,3.1,-3.7,shelter);

      for (const x of [-2.35,2.35]) {
        box(.12,2.9,.12,M.metal,x,1.5,-3.7,shelter);
      }

      box(4.6,.1,7.4,M.glass,0,2.55,-3.7,shelter);
      stopMeshes.push({mesh:shelter,stop:s});
    });

  // -------------------- ANIMATED PEDESTRIANS --------------------

  const people = [];
  const clothing = [
    0x315779,0x8a4e42,0x4d7555,0x5c4b7c,
    0x9a713d,0x555d68,0x9c4b58
  ];

  function makePerson(x,z,color) {
    const root = new THREE.Group();

    box(.48,.78,.28,mat(color),0,1.18,0,root);
    cylinder(.10,.14,M.skin,0,1.62,0,root,8);
    sphere(.23,.27,.22,M.skin,0,1.86,0,root);
    sphere(.235,.12,.225,mat(0x292321),0,2.02,0,root);

    const arms = [];

    for (const side of [-1,1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side*.31,1.48,0);
      root.add(pivot);

      cylinder(.095,.62,mat(color),0,-.28,0,pivot,8);
      sphere(.09,.09,.09,M.skin,0,-.62,0,pivot);
      arms.push(pivot);
    }

    const legs = [];

    for (const side of [-1,1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side*.14,.82,0);
      root.add(pivot);

      cylinder(.12,.68,mat(0x303744),0,-.32,0,pivot,8);
      box(.22,.12,.36,M.black,0,-.68,.08,pivot);
      legs.push(pivot);
    }

    root.position.set(x,0,z);
    scene.add(root);

    return {
      root,
      arms,
      legs,
      phase:Math.random()*6.28,
      homeX:x,
      homeZ:z,
      target:null,
      state:'waiting',
      speed:1.1
    };
  }

  routeSets.forEach(r=>{
    r.stops.forEach(s=>{
      for (let i=0; i<2; i++) {
        people.push(
          makePerson(
            s.x+15+i*.85,
            s.z+1.3+i*.8,
            clothing[Math.floor(Math.random()*clothing.length)]
          )
        );
      }
    });
  });

  // -------------------- AI TRAFFIC --------------------

  const traffic = [];

  function makeTrafficCar(x,z,color,type='car') {
    const g = new THREE.Group();
    scene.add(g);

    const paint = mat(color,.5,{metalness:.22});

    if (type==='van') {
      box(2.9,1.8,5.7,paint,0,1.45,0,g);
      box(2.5,.75,2.6,M.glass,0,2.35,.3,g);
    } else {
      box(2.8,.9,5.2,paint,0,1.0,0,g);
      box(2.35,.75,2.7,M.glass,0,1.72,-.15,g);
      box(2.4,.18,1.1,paint,0,1.4,-1.65,g);
    }

    for (const side of [-1,1]) {
      for (const zz of [-1.75,1.75]) {
        const t = cylinder(.43,.25,M.rubber,side*1.43,.55,zz,g,14);
        t.rotation.z = Math.PI/2;

        const h = cylinder(.2,.27,M.metal,side*1.44,.55,zz,g,12);
        h.rotation.z = Math.PI/2;
      }
    }

    for (const side of [-1,1]) {
      box(.42,.22,.08,M.white,side*.9,1.05,2.62,g);
      box(.42,.2,.08,M.red,side*.9,1.05,-2.62,g);
    }

    g.position.set(x,0,z);

    traffic.push({
      mesh:g,
      speed:7+Math.random()*7,
      laneX:x,
      phase:Math.random()*20
    });
  }

  const carColors = [
    0xe7e7e7,0x20252b,0x2675aa,0xbfc4c8,
    0xb92c32,0x8b8e92,0xd3bd8b
  ];

  for (let i=0; i<12; i++) {
    makeTrafficCar(
      (Math.floor(Math.random()*9)-4)*65+(Math.random()-.5)*5,
      (Math.random()-.5)*850,
      carColors[i%carColors.length],
      i%5===0 ? 'van' : 'car'
    );
  }

  // -------------------- GAME STATE --------------------

  const keys = Object.create(null);

  let started = false;
  let mode = 'driver';
  let walking = false;
  let deck = 0;
  let cameraMode = 0;
  let lightsOn = false;

  let speed = 0;
  let gear = 'D';
  let fare = 0;
  let onboard = 0;
  let stopWait = 0;
  let stopIndex = 0;
  let aiTarget = 0;
  let aiSpeed = 0;

  let messageTimer = 0;
  let lastTime = performance.now();
  let engineSoundClock = 0;

  const player = {
    x:0,z:0,y:0,
    yaw:0,
    vertical:0,
    onGround:true
  };

  const playerBody = makePerson(0,0,0x2672ad);
  playerBody.root.visible = false;

  let passengerSeat = {x:0,z:0,y:0};

  function say(t) {
    $('message').textContent = t;
    messageTimer = 4;
  }

  function updateHUD() {
    $('speed').textContent = Math.round(Math.abs(speed)*3.6);
    $('gear').textContent = mode==='passenger' ? 'AI' : gear;
    $('fare').textContent = '$'+fare;
    $('passengers').textContent = onboard;

    $('modeBadge').textContent =
      walking ? 'ON FOOT' :
      mode==='passenger' ? 'PASSENGER · AI DRIVER' : 'DRIVER MODE';

    $('walkBtn').textContent = walking ? 'BOARD BUS' : 'GET OUT';
    $('doorBtn').textContent = doorsOpen ? 'CLOSE DOORS' : 'OPEN DOORS';
    $('deckBtn').textContent = deck===0 ? 'UPPER DECK' : 'LOWER DECK';

    $('destination').textContent =
      'ROUTE '+route.number+' · '+route.name+
      ' · NEXT: '+(route.stops[stopIndex%route.stops.length]?.name||route.destination);
  }

  function setDoors(open) {
    doorsOpen = open;
    doorL.position.z = open ? -.55 : 0;
    doorR.position.z = open ? .55 : 0;
    KMBAudio.door();
    updateHUD();
  }

  function toggleDoors() {
    if (mode==='passenger') {
      say('The driver controls the doors at bus stops.');
      return;
    }

    if (walking) return;

    if (Math.abs(speed)>.5) {
      say('Stop the bus before opening the doors.');
      return;
    }

    setDoors(!doorsOpen);
    say(doorsOpen ? 'Doors open. Passengers can board.' : 'Doors closed.');

    if (doorsOpen) boardWaitingPassengers();
  }

  function nearestStopToBus() {
    let best=-1;
    let d=1e9;

    route.stops.forEach((s,i)=>{
      const q=Math.hypot(
        bus.position.x-s.x,
        bus.position.z-s.z
      );

      if (q<d) {
        d=q;
        best=i;
      }
    });

    return d<17 ? best : -1;
  }

  function boardWaitingPassengers() {
    const idx=nearestStopToBus();
    if (idx<0) return;

    const s=route.stops[idx];
    let boarded=0;

    people.forEach(p=>{
      if (
        p.state==='waiting' &&
        Math.hypot(p.homeX-(s.x+15),p.homeZ-s.z)<4 &&
        boarded<3
      ) {
        p.state='boarding';
        p.target=new THREE.Vector3(
          bus.position.x+2.7,
          0,
          bus.position.z+2.5
        );
        boarded++;
      }
    });

    if (boarded) {
      onboard+=boarded;
      fare+=boarded*5;
      say(
        s.name+': '+boarded+
        ' passenger(s) boarding · fare +$'+(boarded*5)
      );
    }
  }

  function exitBus() {
    if (walking) return;

    if (Math.abs(speed)>1) {
      say('Wait until the bus stops.');
      return;
    }

    if (
      mode==='passenger' &&
      Math.hypot(
        bus.position.x-route.stops[aiTarget%route.stops.length].x,
        bus.position.z-route.stops[aiTarget%route.stops.length].z
      )>20
    ) {
      say('The AI bus will stop at the next bus stop.');
      return;
    }

    if (!doorsOpen) {
      say('Open the doors first.');
      return;
    }

    walking=true;
    player.x=bus.position.x+7;
    player.z=bus.position.z;
    player.yaw=bus.rotation.y;

    playerBody.root.visible=true;
    playerBody.root.position.set(player.x,0,player.z);

    $('crosshair').style.display='block';
    $('walkHint').style.display='block';
    $('controls').style.display='flex';

    const touchBtns=document.querySelectorAll('#controls .driving button');
    touchBtns[0].textContent='WALK';
    touchBtns[1].textContent='BACK';
    touchBtns[2].textContent='JUMP';

    say('You are outside. Explore, then return to the open bus doors.');
    updateHUD();
  }

  function boardBus() {
    const d=Math.hypot(
      player.x-(bus.position.x+5),
      player.z-bus.position.z
    );

    if (d>13) {
      say('Walk closer to the bus entrance.');
      return;
    }

    if (!doorsOpen) {
      say('The doors need to be open before boarding.');
      return;
    }

    walking=false;
    playerBody.root.visible=false;
    $('crosshair').style.display='none';
    $('walkHint').style.display='none';

    if (mode==='passenger') {
      deck=0;
      cameraMode=2;
      passengerSeat={x:1.8,y:2.45,z:-2.5};
      $('controls').style.display='none';
    } else {
      cameraMode=0;
      $('controls').style.display='flex';

      const touchBtns=document.querySelectorAll('#controls .driving button');
      touchBtns[0].textContent='ACCEL';
      touchBtns[1].textContent='BRAKE';
      touchBtns[2].textContent='HANDBRAKE';
    }

    say(
      mode==='passenger'
        ? 'Back aboard. Enjoy your journey!'
        : 'You are back in the driver seat.'
    );

    updateHUD();
  }

  function changeDeck() {
    if (walking) {
      say('Board the bus to change decks.');
      return;
    }

    deck=deck===0 ? 1 : 0;

    if (mode==='passenger') {
      passengerSeat={
        x:1.8,
        y:deck===0 ? 2.45 : 4.95,
        z:-2.5
      };
      cameraMode=2;
    }

    say(deck===0 ? 'Lower deck' : 'Upper deck');
    updateHUD();
  }

  function interact() {
    if (walking) {
      boardBus();
    } else if (mode==='driver') {
      toggleDoors();
    } else {
      say('Enjoy the ride. Use GET OUT at a stop.');
    }
  }

  // -------------------- AI BUS DRIVER --------------------

  function updateAI(dt) {
    if (mode!=='passenger' || walking) return;

    const target=route.stops[aiTarget%route.stops.length];
    const tx=target.x;
    const tz=target.z;

    const dx=tx-bus.position.x;
    const dz=tz-bus.position.z;
    const dist=Math.hypot(dx,dz);

    const desired=Math.atan2(dx,dz);

    let diff=THREE.MathUtils.euclideanModulo(
      desired-bus.rotation.y+Math.PI,
      Math.PI*2
    )-Math.PI;

    bus.rotation.y+=THREE.MathUtils.clamp(
      diff,
      -1.35*dt,
      1.35*dt
    );

    const targetSpeed=dist<12 ? 0 : Math.min(14,dist*.8);

    aiSpeed+=(targetSpeed-aiSpeed)*(1-Math.exp(-1.7*dt));
    speed=aiSpeed;

    const forward=new THREE.Vector3(
      Math.sin(bus.rotation.y),
      0,
      Math.cos(bus.rotation.y)
    );

    bus.position.addScaledVector(forward,aiSpeed*dt);

    if (dist<5 && aiSpeed<1.1) {
      aiSpeed=0;
      speed=0;

      if (!doorsOpen) {
        setDoors(true);
        stopWait=3.5;

        onboard=Math.max(
          0,
          onboard-Math.min(onboard,1+Math.floor(Math.random()*2))
        );

        say('Next stop: '+target.name+'. Please mind the gap.');
        KMBAudio.bell();
      }

      if (stopWait>0) {
        stopWait-=dt;
      } else {
        setDoors(false);
        aiTarget=(aiTarget+1)%route.stops.length;
        stopIndex=aiTarget;
      }
    }
  }

  // -------------------- MANUAL DRIVING --------------------

  function updateManual(dt) {
    if (walking || mode!=='driver') return;

    if (gear==='D') {
      if (keys.w) speed+=12*dt;
      if (keys.s) speed-=21*dt;
    } else if (gear==='R') {
      if (keys.w) speed-=7*dt;
      if (keys.s) speed+=14*dt;
    } else {
      speed*=Math.pow(.08,dt);
    }

    if (keys[' ']) {
      speed*=Math.pow(.002,dt);
    }

    speed*=Math.pow(.994,dt*60);
    speed=THREE.MathUtils.clamp(speed,-10,27);

    const steer=(keys.a?1:0)-(keys.d?1:0);

    bus.rotation.y+=
      steer*Math.min(1,Math.abs(speed)/4)*.9*dt*
      (speed>=0 ? 1 : -1);

    const f=new THREE.Vector3(
      Math.sin(bus.rotation.y),
      0,
      Math.cos(bus.rotation.y)
    );

    bus.position.addScaledVector(f,speed*dt);

    bus.position.x=THREE.MathUtils.clamp(bus.position.x,-475,475);
    bus.position.z=THREE.MathUtils.clamp(bus.position.z,-475,475);

    if (Math.abs(speed)<.25) speed=0;

    if (speed!==0) {
      engineSoundClock+=dt;

      if (engineSoundClock>.45) {
        KMBAudio.engine(Math.abs(speed));
        engineSoundClock=0;
      }
    }

    if (doorsOpen && Math.abs(speed)<.3) {
      boardWaitingPassengers();
    }
  }

  function updateTraffic(dt) {
    traffic.forEach(t=>{
      t.mesh.position.z+=t.speed*dt;

      if (t.mesh.position.z>480) {
        t.mesh.position.z=-480;
      }

      const dx=t.mesh.position.x-bus.position.x;
      const dz=t.mesh.position.z-bus.position.z;

      if (Math.hypot(dx,dz)<5 && mode==='driver') {
        speed*=.97;
      }
    });
  }

  // -------------------- PEDESTRIAN ANIMATION --------------------

  function updatePeople(dt,now) {
    people.forEach(p=>{
      p.phase+=dt*(p.state==='walking'||p.state==='boarding' ? 8 : 2);

      const swing=Math.sin(p.phase)*.42;

      p.legs[0].rotation.x=swing;
      p.legs[1].rotation.x=-swing;

      p.arms[0].rotation.x=-swing*.65;
      p.arms[1].rotation.x=swing*.65;

      if (p.state==='waiting') {
        p.root.position.y=Math.sin(now*.0015+p.phase)*.025;
      }

      if (p.state==='boarding' && p.target) {
        const dx=p.target.x-p.root.position.x;
        const dz=p.target.z-p.root.position.z;
        const d=Math.hypot(dx,dz);

        if (d<.45) {
          p.root.visible=false;
          p.state='onboard';
        } else {
          p.root.position.x+=dx/d*dt*1.2;
          p.root.position.z+=dz/d*dt*1.2;
          p.root.rotation.y=Math.atan2(dx,dz);
        }
      }
    });
  }

  // -------------------- WALKING MODE --------------------

  function updateWalking(dt) {
    const f=(keys.w?1:0)-(keys.s?1:0);
    const s=(keys.d?1:0)-(keys.a?1:0);

    const v=new THREE.Vector3(s,0,f);

    if (v.lengthSq()>0) {
      v.normalize().applyAxisAngle(
        new THREE.Vector3(0,1,0),
        player.yaw
      );

      player.x+=v.x*5*dt;
      player.z+=v.z*5*dt;
      player.yaw=Math.atan2(v.x,v.z);
      playerBody.root.rotation.y=player.yaw;
    }

    if (keys[' '] && player.onGround) {
      player.vertical=6;
      player.onGround=false;
    }

    player.vertical-=17*dt;
    player.y+=player.vertical*dt;

    if (player.y<0) {
      player.y=0;
      player.vertical=0;
      player.onGround=true;
    }

    player.x=THREE.MathUtils.clamp(player.x,-490,490);
    player.z=THREE.MathUtils.clamp(player.z,-490,490);

    playerBody.root.position.set(player.x,player.y,player.z);
  }

  // -------------------- CAMERA --------------------

  const look={
    yaw:0,
    pitch:0,
    drag:false,
    lastX:0,
    lastY:0
  };

  function updateCamera() {
    if (walking) {
      camera.position.set(
        player.x,
        player.y+1.65,
        player.z
      );

      camera.rotation.order='YXZ';
      camera.rotation.y=player.yaw+look.yaw;
      camera.rotation.x=look.pitch;
      return;
    }

    if (mode==='passenger') {
      const local=new THREE.Vector3(
        passengerSeat.x,
        passengerSeat.y,
        passengerSeat.z
      );

      local.applyAxisAngle(
        new THREE.Vector3(0,1,0),
        bus.rotation.y
      );

      camera.position.copy(bus.position).add(local);
      camera.rotation.order='YXZ';
      camera.rotation.y=bus.rotation.y+look.yaw;
      camera.rotation.x=look.pitch;
      return;
    }

    if (cameraMode===1) {
      const f=new THREE.Vector3(
        Math.sin(bus.rotation.y),
        0,
        Math.cos(bus.rotation.y)
      );

      camera.position.copy(bus.position)
        .addScaledVector(f,1)
        .add(new THREE.Vector3(0,3.3,0));

      camera.lookAt(
        bus.position.x+f.x*35,
        3,
        bus.position.z+f.z*35
      );
    } else if (cameraMode===2) {
      const off=new THREE.Vector3(-2.4,2.55,6.7);
      off.applyAxisAngle(
        new THREE.Vector3(0,1,0),
        bus.rotation.y
      );

      camera.position.copy(bus.position).add(off);

      camera.lookAt(
        bus.position.x+Math.sin(bus.rotation.y)*20,
        2.5,
        bus.position.z+Math.cos(bus.rotation.y)*20
      );
    } else {
      const off=new THREE.Vector3(0,8.5,-21);
      off.applyAxisAngle(
        new THREE.Vector3(0,1,0),
        bus.rotation.y
      );

      camera.position.copy(bus.position).add(off);
      camera.lookAt(bus.position.x,2.5,bus.position.z);
    }
  }

  // -------------------- MINIMAP --------------------

  const map=$('map');
  const ctx=map.getContext('2d');

  function drawMap() {
    ctx.clearRect(0,0,160,160);
    ctx.fillStyle='#6b9658';
    ctx.fillRect(0,0,160,160);

    ctx.strokeStyle='#3b4145';
    ctx.lineWidth=4;

    for (let n=-4; n<=4; n++) {
      let p=80+n*10.2;

      ctx.beginPath();
      ctx.moveTo(p,0);
      ctx.lineTo(p,160);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0,p);
      ctx.lineTo(160,p);
      ctx.stroke();
    }

    ctx.strokeStyle='#ffe16b';
    ctx.lineWidth=2;
    ctx.beginPath();

    route.stops.forEach((s,i)=>{
      const x=80+s.x/1000*160;
      const y=80+s.z/1000*160;

      if (i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });

    ctx.stroke();

    route.stops.forEach(s=>{
      ctx.fillStyle='#ffdc36';
      ctx.beginPath();
      ctx.arc(
        80+s.x/1000*160,
        80+s.z/1000*160,
        2.8,
        0,
        Math.PI*2
      );
      ctx.fill();
    });

    const x=80+bus.position.x/1000*160;
    const y=80+bus.position.z/1000*160;

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(-bus.rotation.y);
    ctx.fillStyle='#e31b3d';
    ctx.beginPath();
    ctx.moveTo(0,-7);
    ctx.lineTo(-4,5);
    ctx.lineTo(4,5);
    ctx.fill();
    ctx.restore();

    if (walking) {
      ctx.fillStyle='#00ffff';
      ctx.beginPath();
      ctx.arc(
        80+player.x/1000*160,
        80+player.z/1000*160,
        3,
        0,
        Math.PI*2
      );
      ctx.fill();
    }
  }

  // -------------------- MAIN LOOP --------------------

  function animate(now) {
    requestAnimationFrame(animate);

    const dt=Math.min((now-lastTime)/1000,.04);
    lastTime=now;

    if (started) {
      if (walking) {
        updateWalking(dt);
      } else if (mode==='driver') {
        updateManual(dt);
      } else {
        updateAI(dt);
      }

      updateTraffic(dt);
      updatePeople(dt,now);
      wheels.forEach(w=>w.rotation.x+=speed*dt);

      steering.rotation.z+=(
        (keys.a?.45:keys.d?-.45:0)-steering.rotation.z
      )*(1-Math.exp(-7*dt));

      updateCamera();
      drawMap();

      if (messageTimer>0) {
        messageTimer-=dt;
      } else {
        $('message').textContent=walking
          ? 'Explore the area. Return to the bus to continue.'
          : mode==='passenger'
            ? 'AI driver is following your selected route.'
            : 'Drive carefully and stop at marked bus stops.';
      }

      updateHUD();
    }

    renderer.render(scene,camera);
  }

  // -------------------- INPUT --------------------

  function keyName(k) {
    return k==='ArrowUp' ? 'w' :
      k==='ArrowDown' ? 's' :
      k==='ArrowLeft' ? 'a' :
      k==='ArrowRight' ? 'd' :
      k.toLowerCase();
  }

  addEventListener('keydown',e=>{
    const k=keyName(e.key);

    if ([
      ' ','w','a','s','d',
      'arrowup','arrowdown','arrowleft','arrowright'
    ].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }

    keys[k]=true;

    if (e.repeat) return;

    if (k==='e') interact();
    if (k==='h') KMBAudio.horn();

    if (k==='g' && mode==='driver') {
      gear=gear==='D' ? 'N' : gear==='N' ? 'R' : 'D';
      say('Gear: '+gear);
    }

    if (k==='c' && mode==='driver') {
      cameraMode=(cameraMode+1)%3;
      say(['Chase camera','Front camera','Driver cockpit'][cameraMode]);
    }

    if (k==='l') {
      lightsOn=!lightsOn;
      say(lightsOn ? 'Lights on' : 'Lights off');
    }
  });

  addEventListener('keyup',e=>{
    keys[keyName(e.key)]=false;
  });

  document.querySelectorAll('[data-key]').forEach(b=>{
    const k=b.dataset.key;

    const down=e=>{
      e.preventDefault();
      keys[k]=true;
    };

    const up=e=>{
      e.preventDefault();
      keys[k]=false;
    };

    b.addEventListener('pointerdown',down);

    ['pointerup','pointerleave','pointercancel'].forEach(ev=>{
      b.addEventListener(ev,up);
    });
  });

  // Drag to look around in passenger and walking modes.
  renderer.domElement.addEventListener('pointerdown',e=>{
    if (mode==='passenger' || walking) {
      look.drag=true;
      look.lastX=e.clientX;
      look.lastY=e.clientY;
    }
  });

  addEventListener('pointerup',()=>{
    look.drag=false;
  });

  addEventListener('pointermove',e=>{
    if (!look.drag) return;

    const dx=e.clientX-look.lastX;
    const dy=e.clientY-look.lastY;

    look.lastX=e.clientX;
    look.lastY=e.clientY;

    if (walking) {
      player.yaw-=dx*.004;
    } else {
      look.yaw-=dx*.004;
    }

    look.pitch=THREE.MathUtils.clamp(
      look.pitch-dy*.003,
      -.85,
      .85
    );
  });

  // -------------------- BUTTONS / START --------------------

  $('startBtn').addEventListener('click',()=>{
    try {
      route=routeSets[Number($('routeSelect').value)]||routeSets[0];
      mode=$('playMode').value;

      setDestination();
      started=true;
      KMBAudio.init();

      $('startScreen').style.display='none';
      loading.style.display='none';

      bus.position.set(
        route.stops[0].x,
        0,
        route.stops[0].z-12
      );

      bus.rotation.y=0;
      stopIndex=0;
      aiTarget=0;
      speed=0;
      aiSpeed=0;
      doorsOpen=false;

      if (mode==='passenger') {
        setDoors(true);
        setTimeout(()=>setDoors(false),900);

        cameraMode=2;
        deck=0;
        passengerSeat={x:1.8,y:2.45,z:-2.5};
        $('controls').style.display='none';

        say('You are a passenger. The AI driver will operate the bus.');
      } else {
        $('controls').style.display='flex';
        cameraMode=0;

        say('Welcome driver. Your selected route is '+route.name+'.');
      }

      updateHUD();
    } catch(err) {
      console.error(err);
      loadError.textContent='Game start error: '+err.message;
    }
  });

  $('doorBtn').addEventListener('click',toggleDoors);

  $('walkBtn').addEventListener('click',()=>{
    if (walking) boardBus();
    else exitBus();
  });

  $('deckBtn').addEventListener('click',changeDeck);

  $('cameraBtn').addEventListener('click',()=>{
    if (mode==='passenger') {
      say('Drag the screen to look around.');
      return;
    }

    cameraMode=(cameraMode+1)%3;
    say(['Chase camera','Front camera','Driver cockpit'][cameraMode]);
  });

  $('hornBtn').addEventListener('click',()=>{
    KMBAudio.horn();
  });

  $('lightBtn').addEventListener('click',()=>{
    lightsOn=!lightsOn;
    say(lightsOn ? 'Lights switched on' : 'Lights switched off');
  });

  addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio||1,1.5)
    );

    renderer.setSize(innerWidth,innerHeight);
  });

  // Successful scene setup: hide the loading curtain and show the menu.
  loading.style.display='none';
  $('startScreen').style.display='grid';

  updateHUD();
  requestAnimationFrame(animate);
})();
