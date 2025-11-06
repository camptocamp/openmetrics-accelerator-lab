// --- Paper.js setup ---
paper.setup('accelerator');

const CIRCLE_SIZE = 200;
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
const dot = new paper.Path.Circle(paper.view.center.add(new paper.Point(CIRCLE_SIZE, 0)), 10);
dot.fillColor = 'yellow';

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
    console.log("status=" + statusCode + " speed=" + speed);
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

// --- Boucle principale ---
paper.view.onFrame = async (event) => {
  if (statusCode == STATUS_RUNNING || statusCode == STATUS_SUCCESS){

    // Temps écoulé
    const elapsed = (Date.now() - startTime) / 1000;
    durationDisplay.textContent = `Duration: ${elapsed.toFixed(1)}s`;

    // Timeout
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
      }

      if (kick >= KICK_THRESHOLD) {
        stopExperiment("OVERLOADED", 3);
        return;
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
