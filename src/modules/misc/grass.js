/**
 * Original version http://labs.hyperandroid.com/js1k
 */


let lerpTime = 10000;    // time taken to fade sky colors
let nextLerpTime = 15000;  // after fading, how much time to wait to fade colors again.
// start with this sky index.
let lerpindex = 0;

let canvas = null;
let garden = null;

let gradient;
let time;

let Grass = function() {
  return this;
};

Grass.prototype = {


  grass_height: 0,    // grass height
  maxAngle: 0,    // maximum grass rotation angle (wind movement)
  angle: 0,    // construction angle. thus, every grass is different to others
  coords: null,  // quadric bezier curves coordinates
  color: null,  // grass color. modified by ambient component.
  offset_control_point: 4,    // grass base width. greater values, wider at the basement.
  period: 5000,
  lastAmbient: -1,
  fillStyle: '',

  initialize: function(canvasWidth, canvasHeight, minHeight, maxHeight, angleMax, initialMaxAngle) {

    // grass start position
    var sx = Math.floor(Math.random() * canvasWidth);
    var sy = canvasHeight;

    // quadric curve middle control point. higher values means wider grass from base to peak.
    // try offset_control_x=10 for thicker grass.
    var offset_control_x = 1.5;

    this.grass_height = minHeight + Math.random() * maxHeight;
    this.maxAngle = 10 + Math.random() * angleMax;
    this.angle = Math.random() * initialMaxAngle * (Math.random() < 0.5 ? 1 : -1) * Math.PI / 180;

    // hand crafted value. modify offset_control_x to play with grass curvature slope.
    var csx = Math.round(sx - offset_control_x);

    // grass curvature. greater values make grass bender.
    // try with:
    //        var csy= sy-this.alto_hierba;  -> much more bended grass.
    //        var csy= sy-1;                 -> totally unbended grass.
    //        var csy= sy-this.alto_hierba/2;-> original. good looking grass.
    var csy = 0;
    if (Math.random() < 0.1) {
      csy = Math.round(sy - this.grass_height);
    } else {
      csy = Math.round(sy - this.grass_height / 2);
    }

    /**
     I determined that both bezier curves that conform each grass should have
     the same middle control point to be parallel.
     You can play with psx/psy adding or removing values to slightly modify grass
     geometry.
    **/
    var psx = Math.round(csx);
    // changed var psy= csy; to
    var psy = Math.round(csy - offset_control_x);

    // the bigger offset_control_point, the wider on its basement.
    this.offset_control_point = 3;
    var dx = Math.round(sx + this.offset_control_point);
    var dy = Math.round(sy);

    this.coords = [sx, sy, csx, csy, psx, psy, dx, dy];

    // grass color.
    this.color = [16 + Math.floor(Math.random() * 32),
    100 + Math.floor(Math.random() * 155),
    16 + Math.floor(Math.random() * 32)];

  },

  /**
   * paint every grass.
   * @param ctx is the canvas2drendering context
   * @param time for grass animation.
   * @param ambient parameter to dim or brighten every grass.
   * @returns nothing
   */
  paint: function(ctx, timestamp, ambient) {

    if(this.lastAmbient != ambient){
      this.lastAmbient = ambient;
      this.fillStyle =`rgb( ${Math.round(this.color[0] * ambient)}, ${Math.round(this.color[1] * ambient)}, ${Math.round(this.color[2] * ambient)} )`;
    } 

    // grass peak position. how much to rotate the peak.
    // less values (ie the .0005), will make as if there were a softer wind.
    var inc_punta_hierba = 0.06* Math.sin(  timestamp / this.period );

    // rotate the point, so grass curves are modified accordingly. If just moved horizontally, the curbe would
    // end by being unstable with undesired visuals.
    let angle = this.angle + Math.PI / 2 + inc_punta_hierba * this.maxAngle *  Math.cos( timestamp / this.period );
    var px = Math.round(this.coords[0] + this.offset_control_point + this.grass_height * Math.cos(angle));
    var py = Math.round(this.coords[1] - this.grass_height * Math.sin(angle));

    var c = this.coords;



    ctx.beginPath();
    ctx.moveTo(c[0], c[1]);
    ctx.bezierCurveTo(c[0], c[1], c[2], c[3], px, py);
    ctx.bezierCurveTo(px, py, c[4], c[5], c[6], c[7]);
    ctx.closePath();
    ctx.fillStyle = this.fillStyle;
    ctx.fill();

  }
};

let Garden = function() {
  return this;
};

Garden.prototype = {
  grass: null,
  ambient: 1,
  // sky colors
  colors: [[0x00, 0x00, 0x3f,
    0x00, 0x3f, 0x7f,
    0x1f, 0x5f, 0xc0,
    0x3f, 0xa0, 0xff],

  [0x00, 0x3f, 0x7f,
    0xa0, 0x5f, 0x7f,
    0xff, 0x90, 0xe0,
    0xff, 0x90, 0x00],


  [0x00, 0x00, 0x00,
    0x00, 0x2f, 0x7f,
    0x00, 0x28, 0x50,
    0x00, 0x1f, 0x3f],

  [0x1f, 0x00, 0x5f,
    0x3f, 0x2f, 0xa0,
    0xa0, 0x1f, 0x1f,
    0xff, 0x7f, 0x00]],

  // ambient intensities for each sky color
  ambients: [1, 0.35, 0.05, 0.5],
  stars: [],
  firefly_radius: 1.5,
  num_fireflyes: 40,
  num_stars: 512,
  width: 0,
  height: 0,
  updateMode: 'synced',
  sunTimes: null,
  lastUpdateTime: 0,

  initialize: function(width, height, size) {
    this.width = width;
    this.height = height;
    this.grass = [];

    for (let i = 0; i < size; i++) {
      let g = new Grass();
      g.initialize(
        width,
        height,
        10,      // min grass height
        height * 1 / 5, // max grass height
        20,     // grass max initial random angle
        40      // max random angle for animation
      );
      this.grass.push(g);
    }

    for (let i = 0; i < this.num_stars; i++) {
      this.stars.push(Math.floor(Math.random() * (width - 10) + 5));
      this.stars.push(Math.floor(Math.random() * (height - 10) + 5));
    }
  },

  paint: function(ctx, time) {
    // draw stars if ambient below .3 -> night
    if (this.ambient < 0.3) {

      ctx.save();

      // modify stars translucency by ambient (as transitioning to day, make them dissapear).
      ctx.globalAlpha = 1 - ((this.ambient - 0.05) / 0.25);

      // as well as making them dimmer
      intensity = 1 - (this.ambient / 2 - 0.05) / 0.25;

      // how white do you want the stars to be ??
      var c = Math.floor(192 * intensity);
      var strc = 'rgb(' + c + ',' + c + ',' + c + ')';
      ctx.strokeStyle = strc;

      // first num_fireflyes coordinates are fireflyes themshelves.
      for (var j = 0; j < this.stars.length; j += 2) {
        var inc = 1; s

        // every one out of 3 stars move at 1.5 increment
        if (j % 3 === 0) {
          inc = 1.5;
        } else if (j % 11 === 0) {
          // every one out of 11 stars move at 2.5 increment
          inc = 2.5;
        }
        // all the others at increment 1
        this.stars[j] = (this.stars[j] + 0.1 * inc) % canvas.width;

        var y = this.stars[j + 1];
        ctx.strokeRect( Math.round(this.stars[j]), Math.round(this.stars[j + 1]), 1, 1);

      }

      ctx.globalAlpha = 1;

      var i;
      // draw fireflyes
      ctx.fillStyle = '#ffff00';
      for (i = 0; i < this.num_fireflyes * 2; i += 2) {
        ctx.beginPath();
        var angle = Math.PI * 2 * Math.sin(time * 3E-4) + i * Math.PI / 50;
        var radius = this.firefly_radius;
        ctx.arc(

          Math.round(this.stars[i] +
          Math.cos(time * 3E-4) * Math.sin(time * 0.00001 * i) +  // move horizontally with time
          radius * Math.cos(angle)),

          Math.round(this.height / 2 +
          0.5 * this.stars[i + 1] +
          20 * Math.sin(time * 3E-4) * 5 * Math.cos(time * 0.00001 * i) +  // move vertically with time
          radius * Math.sin(angle)),

          radius,
          0,
          Math.PI * 2,
          false);

        ctx.fill();
      }

      ctx.restore();
    }

    for (i = 0; i < this.grass.length; i++) {
      this.grass[i].paint(ctx, time, this.ambient);
    }
  },

  update: function(ctx, timestamp, once = false) {

    if ( (timestamp - this.lastUpdateTime) > (1000 / 24)) {
      this.lastUpdateTime = timestamp;
      const syncedBackgroundUpdateDelay = 1000;

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
      var ntime = new Date().getTime();
      var elapsed = ntime - time;
      this.paint(ctx, elapsed);

      // lerp.
      if (elapsed > nextLerpTime) {
        lerpindex = Math.floor((elapsed - nextLerpTime) / nextLerpTime);
        if ((elapsed - nextLerpTime) % nextLerpTime < lerpTime) {
          this.lerp(ctx, (elapsed - nextLerpTime) % nextLerpTime, lerpTime);
        }
      }

      if (!once) {
        window.requestAnimationFrame((t) => { let u = this.update.bind(this); u(ctx, t); });
      }
    } else {
      if (!once) {
        window.requestAnimationFrame((t) => { let u = this.update.bind(this); u(ctx, t); });
      }
    }
  },

  /**
   * fade sky colors
   * @param time current time
   * @param last how much time to take fading colors
   */
  lerp: function(ctx, time, last) {
    gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    colors = this.colors;

    var i0 = lerpindex % colors.length;
    var i1 = (lerpindex + 1) % colors.length;


    for (var i = 0; i < 4; i++) {
      var rgb = 'rgb(';
      for (var j = 0; j < 3; j++) {
        rgb += Math.floor((colors[i1][i * 3 + j] - colors[i0][i * 3 + j]) * time / last + colors[i0][i * 3 + j]);
        if (j < 2) rgb += ',';
      }
      rgb += ')';
      gradient.addColorStop(i / 3, rgb);
    }

    this.ambient = (this.ambients[i1] - this.ambients[i0]) * time / last + this.ambients[i0];
  },

  set updateMode(mode) {
    let availableModes = ['synced', 'manual'];

    if (mode in availableModes) {
      this.updateMode = mode;
    }

  },

  calcSunTimes: function(lat, long) {
    this.sunTimes = SunCalc.getTimes(new Date(), lat, long);
  }

};


function init() {
  canvas = document.getElementById('s');
  let ctx = canvas.getContext('2d');
  canvas.width = 800;
  canvas.height = 600;

  document.body.style.background = "url(" + canvas.toDataURL() + ")";

  garden = new Garden();
  garden.initialize(canvas.width, canvas.height, 300);

  garden.lerp(ctx, 0, 2000);

  time = new Date().getTime();
  window.requestAnimationFrame((t) => { let u = garden.update.bind(garden); u(ctx, t); });
}



window.addEventListener(
  'load',
  () => { init(null) },
  false);
