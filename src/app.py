from flask import Flask, jsonify, render_template
from prometheus_client import Gauge, generate_latest, CONTENT_TYPE_LATEST
import math, time, threading

app = Flask(__name__)

# --- Metrics exposées à Prometheus ---
beam_energy_tev = Gauge("beam_energy_tev", "Current beam energy in TeV")
particle_speed_percent_c = Gauge("particle_speed_percent_c", "Particle speed as % of light speed")
rf_phase_angle = Gauge("rf_cavity_phase_angle", "RF cavity phase angle (degrees)")

# --- Variables internes ---
running = False
has_failed = False
start_time = None

CALIBRATION_FACTOR = 0.8  # bug volontaire (à corriger à 1.0)
BASE_FREQ = 2 * math.pi * 0.5  # fréquence d’oscillation du champ RF
ENERGY_MAX = 6.8  # TeV
speed_percent = 0.0
phase_drift = 0.0

def accelerator_loop():
    global running, has_failed, start_time, speed_percent, phase_drift
    while True:
        if running:
            t = time.time() - start_time

            # Phase réelle du champ RF (le “kick” attendu)
            rf_phase = t * BASE_FREQ
            rf_phase_angle.set(math.degrees(rf_phase) % 360)

            # Drift : si calibration mauvaise, déphasage croissant
            phase_drift += (CALIBRATION_FACTOR - 1.0) * 0.02
            effective_phase = rf_phase + phase_drift

            # L’énergie chute quand le champ est en opposition de phase
            field_alignment = math.cos(effective_phase)
            energy = max(0, ENERGY_MAX * field_alignment)
            beam_energy_tev.set(energy)

            # Convertir en vitesse relative à c
            speed_percent = max(0, (energy / ENERGY_MAX) * 100)
            particle_speed_percent_c.set(speed_percent)

            # Condition d’arrêt : le faisceau s’effondre
            if energy < 0.05:
                running = False
                has_failed = True
        time.sleep(0.2)

threading.Thread(target=accelerator_loop, daemon=True).start()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/start")
def start():
    global running, has_failed, start_time, phase_drift
    if not running and not has_failed:
        running = True
        start_time = time.time()
        phase_drift = 0.0
        return jsonify({"status": "started"})
    elif has_failed:
        return jsonify({"status": "failed"})
    else:
        return jsonify({"status": "running"})

@app.route("/state")
def state():
    return jsonify({
        "running": running,
        "failed": has_failed,
        "speed_percent_c": speed_percent
    })

@app.route("/metrics")
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
