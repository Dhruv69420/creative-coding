const canvasSketch = require('canvas-sketch');
const eases = require('eases');
const random = require('canvas-sketch-util/random');
const math = require('canvas-sketch-util/math');
const colormap = require('colormap');

const settings = {
  dimensions: [ 1080, 1080 ],
  animate: true
};

const particles = [];
const cursor = { x: 9999, y: 9999 };

const colors = colormap({
  colormap : 'viridis',
  nshades: 20
})

let elCanvas, imgA;

const sketch = ({ context, width, height, canvas }) => {

  let x, y, particle, radius;
  
  const imgACanvas = document.createElement('canvas');
  const imgAContext = imgACanvas.getContext('2d');
  
  imgACanvas.width = imgA.width;
  imgACanvas.height = imgA.height;

  imgAContext.drawImage(imgA, 0, 0);

  const imgAData = imgAContext.getImageData(0, 0, imgA.width, imgA.height).data;

  const numCircles = 30;
  const gapCircles = 2;
  const gapDot = 2;
  let dotRadius = 12;
  let cirRadius = 0;
  const fitRadius = dotRadius;

  elCanvas = canvas;
  canvas.addEventListener('mousedown', handleMouseDown);

  for( let i = 0; i < numCircles; i++ ){
    const circumference = 2 * Math.PI * cirRadius;
    const numFit = i ? Math.floor(circumference / (fitRadius * 2 + gapDot)) : 1;
    const fitSlice = Math.PI * 2 / numFit;
    let ix, iy, idx, r, g, b, colA;

    for(let j = 0; j < numFit; j++){
      const theta = fitSlice * j;

      x = Math.cos(theta) * cirRadius;
      y = Math.sin(theta) * cirRadius;

      x += width / 2;
      y += height / 2;

      ix = Math.floor((x/ width) * imgA.width);
      iy = Math.floor((y/ height) * imgA.height);
      idx = (iy * imgA.width + ix ) * 4;      

      r = imgAData[idx];
      g = imgAData[idx + 1];
      b = imgAData[idx + 2];
      colA = `rgb(${r}, ${g}, ${b})`;
      
      // radius = dotRadius;
      radius = math.mapRange(r, 0, 255, 1, 12)

      particle = new Particle({ x, y, radius, colA });
      particles.push(particle);
    }
    cirRadius += fitRadius * 2 + gapCircles;
    dotRadius = ( 1 - eases.quadOut(i / numCircles )) * fitRadius;
  }

  return ({ context, width, height }) => {
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    context.drawImage(imgACanvas, 0, 0);

    particles.sort((a, b)=> a.scale - b.scale);

    particles.forEach( particle =>{
      particle.update();
      particle.draw(context);
    })
  };
};

const handleMouseDown = (e) =>{
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  handleMouseMove(e);
}

const handleMouseMove = (e) =>{
  const x = (e.offsetX / elCanvas.offsetWidth) * elCanvas.width;
  const y = (e.offsetY / elCanvas.offsetHeight) * elCanvas.height;

  cursor.x = x;
  cursor.y = y;  
}

const handleMouseUp = (e) =>{
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);

  cursor.x = 9999;
  cursor.y = 9999;
}

const loadImage = async (url) =>{

  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = () => resolve(img);
    img.error = () => reject();
    img.src = url;
  })

}

const start = async () =>{

  imgA = await loadImage('images/Mr.Mukul.jpg');
  canvasSketch(sketch, settings);

}

start();

class Particle {
  constructor({ x, y, radius = 10, colA }){
    // Position
    this.x = x;
    this.y = y;

    // Acceleration
    this.ax = 0;
    this.ay = 0;

    // Velocity
    this.vx = 0;
    this.vy = 0;

    // Initial position
    this.ix = x;
    this.iy = y;

    this.radius = radius;
    this.scale = 1;
    this.color = colA;

    this.minDist = random.range(100, 200);
    this.pushFactor = random.range(0.01, 0.02);
    this.pullFactor = random.range(0.002, 0.006);
    this.dampingFactor = random.range(0.90, 0.95);
  }

  update() {

    let dx, dy, dd, distDelta, colorIdx;
    
    // pull force
    dx = this.ix - this.x;
    dy = this.iy - this.y;
    dd = Math.sqrt( dx*dx + dy*dy );

    this.ax = dx * this.pullFactor;
    this.ay = dy * this.pullFactor;

    this.scale = math.mapRange(dd, 0, 200, 1, 5);

    // colorIdx = Math.floor(math.mapRange(dd, 0, 200, 0, colors.length - 1, true));

    // this.color = colors[colorIdx];
    
    // push force
    dx = this.x - cursor.x;
    dy = this.y - cursor.y;
    dd = Math.sqrt( dx*dx + dy*dy );

    distDelta = this.minDist - dd;

    if( dd < this.minDist ){
      this.ax = ( dx / dd ) * distDelta * this.pushFactor;
      this.ay = ( dy / dd ) * distDelta * this.pushFactor;
    }
    
    this.vx += this.ax;
    this.vy += this.ay;

    this.vx *= this.dampingFactor;
    this.vy *= this.dampingFactor;

    this.x += this.vx;
    this.y += this.vy;
  }

  draw( context ){
    context.save();
    context.translate(this.x, this.y);
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(0, 0, this.radius * this.scale, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}
