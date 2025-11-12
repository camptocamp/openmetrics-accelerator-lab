// --- Paper.js setup ---
paper.setup('accelerator');

const CIRCLE_SIZE = 200;
const PARTICULE_SIZE = 10;
const KICK_ZONE_WIDTH = 50;
const KICK_ZONE_HEIGHT = 80;
const SPEED_FACTOR = 24982704; // Used to convert internal speed to m/s
const SPEED_OF_LIGHT = 299792458;
// --- Status codes ---
const STATUS_STOPPED    = 0;
const STATUS_RUNNING    = 1;
const STATUS_SUCCESS    = 2;
const STATUS_OVERLOADED = 3;
const STATUS_TIMEOUT    = 4;

const circle = new paper.Path.Circle(paper.view.center, CIRCLE_SIZE);
circle.strokeColor = 'white';
const dot = new paper.Path.Circle(paper.view.center.add(new paper.Point(CIRCLE_SIZE, 0)), PARTICULE_SIZE);
dot.fillColor = 'yellow';
const kickRect = new paper.Rectangle(
  [
    paper.view.center.x + CIRCLE_SIZE - (KICK_ZONE_WIDTH / 2),
    paper.view.center.y - (KICK_ZONE_HEIGHT / 2) 
   ], [KICK_ZONE_WIDTH, KICK_ZONE_HEIGHT]);
const kickZone = new paper.Path.Rectangle(kickRect, 6);
kickZone.fillColor = '#6f4040ff';
kickZone.sendToBack();
const kickLineLeft = new paper.Path.Line(
  new paper.Point(
    paper.view.center.x + CIRCLE_SIZE - (PARTICULE_SIZE),
    paper.view.center.y - PARTICULE_SIZE
  ),
  new paper.Point(
    paper.view.center.x + CIRCLE_SIZE - (PARTICULE_SIZE),
    paper.view.center.y + PARTICULE_SIZE
  )
);
kickLineLeft.strokeColor = 'red';
kickLineLeft.strokeWidth = 4;
kickLineLeft.insertAbove(kickZone);
const kickLineRight = new paper.Path.Line(
  new paper.Point(
    paper.view.center.x + CIRCLE_SIZE + (PARTICULE_SIZE),
    paper.view.center.y - PARTICULE_SIZE
  ),
  new paper.Point(
    paper.view.center.x + CIRCLE_SIZE + (PARTICULE_SIZE),
    paper.view.center.y + PARTICULE_SIZE
  )
);
kickLineRight.strokeColor = 'red';
kickLineRight.strokeWidth = 4;
kickLineRight.insertAbove(kickZone);

// --- Simulation state ---
let angle = 0;                // particule angular position
let last_angle = 0;           // previous particule position
let speed = 1;                // angular speed
let lastKickTime = 0;
let startTime = null;
let durationDisplay = document.getElementById("duration");
let statusDisplay = document.getElementById("status");
let btn = document.getElementById("btn");
let statusCode = STATUS_STOPPED; // global status

const KICK_THRESHOLD = 50;    // overload threshold
const TIMEOUT_LIMIT = 30;     // max experience duration

// --- Backend interaction ---
async function getKickPower() {
  try {
    const res = await fetch('/kick_power');
    const data = await res.json();
    return data.kick_power;
  } catch (err) {
    console.error("Erreur fetch /kick_power:", err);
    return 0;
  }
}

async function postState() {
  try {
    await fetch('/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: statusCode,
        speed: speed * SPEED_FACTOR
      })
    });
  } catch (err) {
    console.error("Erreur POST /state:", err);
  }
}

async function startExperiment() {
  startTime = Date.now();
  speed = 1;
  angle = 0;
  statusCode = STATUS_RUNNING;
  statusDisplay.textContent = "Status: RUNNING";
  btn.textContent = "Abort";
  postState();
}

async function stopExperiment(reason, status) {
  speed = 0;
  angle = 0;
  statusCode = status;
  statusDisplay.textContent = "Status: " + reason;
  btn.textContent = "Start";
  postState();
}

let waves = [];

function triggerWave(origin) {
  const radius = 10;

  // arc start
  const from = new paper.Point({
    length: radius,
    angle: 45
  }).add(origin);

  // middle of the arc
  const through = new paper.Point({
    length: radius,
    angle: 90
  }).add(origin);

  // ends of the arc
  const to = new paper.Point({
    length: radius,
    angle: 135
  }).add(origin);

  const arc = new paper.Path.Arc(from, through, to);
  arc.strokeColor = 'red';
  arc.strokeWidth = 4;
  arc.opacity = 1;

  waves.push({ shape: arc, age: 0 });
}

// Main display loop
paper.view.onFrame = async (event) => {
  if (statusCode == STATUS_RUNNING || statusCode == STATUS_SUCCESS){

    // Compute experience duration
    const elapsed = (Date.now() - startTime) / 1000;
    durationDisplay.textContent = `Duration: ${elapsed.toFixed(1)}s`;

    // Check for a timeout
    if (elapsed >= TIMEOUT_LIMIT) {
      if(statusCode == STATUS_SUCCESS)
        stopExperiment("SUCCESS", STATUS_STOPPED);
      else
        stopExperiment("TIMEOUT", STATUS_TIMEOUT);
      return;
    }

    // Move particule
    last_angle = angle;
    angle += speed * event.delta; 
    angle = angle % (2*Math.PI);
    const x = paper.view.center.x + CIRCLE_SIZE * Math.cos(angle);
    const y = paper.view.center.y + CIRCLE_SIZE * Math.sin(angle);
    dot.position = new paper.Point(x, y);

    // Apply Kick if in the kick zone
    if (last_angle > angle) {
      const kick = await getKickPower();
      console.log("Kick:", kick);
      speed += kick / 50;
      if(speed * SPEED_FACTOR >= SPEED_OF_LIGHT){
        speed = (SPEED_OF_LIGHT * 0.999999991) / SPEED_FACTOR;
        statusCode = 2
        await postState();
        statusDisplay.textContent = "Status: SUCCESS !";
      } else {
        // Objective is not reach, display a kick 
        triggerWave(new paper.Point(paper.view.center.x + CIRCLE_SIZE, paper.view.center.y));
      }

      if (kick >= KICK_THRESHOLD) {
        stopExperiment("OVERLOADED", 3);
        return;
      }
    }

    // Arc update
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.age++;

      // expansion and fading
    const x = paper.view.center.x + CIRCLE_SIZE * Math.cos(angle);
      tt = new paper.Point(paper.view.center.x + CIRCLE_SIZE, paper.view.center.y - (2 * w.age));
      w.shape.scale(1.05, tt);
      w.shape.opacity = Math.max(1 - w.age / 30, 0);

      if (w.age > 30) {
        w.shape.remove();
        waves.splice(i, 1);
      }
    }
  }
};

// --- Envoi régulier d’état ---
setInterval(() => {
  if (statusCode == 1) {
    postState(speed);
  }
}, 200);

// --- Button handler ---
// --- Status codes ---
/*
  0 = stopped
  1 = running
  2 = success
  3 = overloaded
  4 = timeout
*/
async function startAbort() {
  switch(statusCode){
    case STATUS_STOPPED:
    case STATUS_OVERLOADED:
    case STATUS_TIMEOUT:
      await startExperiment();
      break;
    case STATUS_RUNNING:
    case STATUS_SUCCESS:
      await stopExperiment("ABORT", 0);
      break;
  }
}
