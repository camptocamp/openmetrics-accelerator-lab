// --- Paper.js setup ---
paper.setup('accelerator');

const CIRCLE_SIZE = 200;
const SPEED_FACTOR = 24982704; // Used to convert internal speed to m/s
const SPEED_OF_LIGHT = 299792458;

const circle = new paper.Path.Circle(paper.view.center, CIRCLE_SIZE);
circle.strokeColor = 'white';
const dot = new paper.Path.Circle(paper.view.center.add(new paper.Point(CIRCLE_SIZE, 0)), 10);
dot.fillColor = 'yellow';

// --- Simulation state ---
let angle = 0;                // particule angular position
let speed = 1;                // angular speed
let lastKickTime = 0;
let startTime = null;
let durationDisplay = document.getElementById("duration");
let statusDisplay = document.getElementById("status");

// --- Status codes ---
/*
  0 = stopped
  1 = running
  2 = success
  3 = overloaded
  4 = timeout
*/
let statusCode = 0; // global status

const KICK_ZONE_ANGLE = 0;    // 0° = position 3h
const KICK_THRESHOLD = 80;    // overload threshold
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
  statusCode = 1; // running
  statusDisplay.textContent = "Status: RUNNING";
  document.getElementById("startBtn").disabled = true;
  postState();
}

// --- Boucle principale ---
paper.view.onFrame = async (event) => {
  if (statusCode == 1 || statusCode == 2){

    // Temps écoulé
    const elapsed = (Date.now() - startTime) / 1000;
    durationDisplay.textContent = `Duration: ${elapsed.toFixed(1)}s`;

    // Timeout
    if (elapsed >= TIMEOUT_LIMIT) {
      experimentRunning = false;
      statusCode = 3; // timeout
      speed = 0;
      statusDisplay.textContent = "Status: TIMEOUT";
      await postState();
      return;
    }

    // Déplacement du point
    angle += speed * event.delta * 60; // vitesse adaptative
    const rad = (angle * Math.PI) / 180;
    const x = paper.view.center.x + CIRCLE_SIZE * Math.cos(rad);
    const y = paper.view.center.y + CIRCLE_SIZE * Math.sin(rad);
    dot.position = new paper.Point(x, y);

    // Vérifier la zone de kick
    const angleMod = ((angle % 360) + 360) % 360;
    const nearKickZone = Math.abs(angleMod - KICK_ZONE_ANGLE) < 2; // ±2°

    if (nearKickZone && event.time - lastKickTime > 0.5) {
      lastKickTime = event.time;
      const kick = await getKickPower();
      console.log("Kick:", kick);
      speed += kick / 50; // influence du kick sur la vitesse
      if(speed * SPEED_FACTOR >= SPEED_OF_LIGHT){
        speed = (SPEED_OF_LIGHT * 0.999999991) / SPEED_FACTOR;
        statusDisplay.textContent = "Status: SUCCESS !";
      }

      if (kick >= KICK_THRESHOLD) {
        statusCode = 2; // overloaded
        speed = 0;
        statusDisplay.textContent = "Status: OVERLOADED";
        await postState();
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
    case 0:
    case 3:
    case 4:
  await startExperiment();
}
