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
phase = 0.0
CALIBRATION_FACTOR = 0.8  # bug volontaire à corriger
speed_percent = 0.0

def accelerator_loop():
    global phase, speed_percent
    while True:
        if running:
            t = time.time()
            rf_phase_angle.set((t * 60) % 360)
            beam_energy = max(0, 6.8 * math.sin(math.radians((t * 60) * CALIBRATION_FACTOR)))
            beam_energy_tev.set(beam_energy)
            speed_percent = beam_energy / 6.8 * 100
            particle_speed_percent_c.set(speed_percent)
        time.sleep(0.2)

threading.Thread(target=accelerator_loop, daemon=True).start()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/start")
def start():
    global running
    running = True
    return jsonify({"status": "started"})

@app.route("/stop")
def stop():
    global running
    running = False
    return jsonify({"status": "stopped"})

@app.route("/state")
def state():
    return jsonify({
        "running": running,
        "speed_percent_c": speed_percent
    })

@app.route("/metrics")
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
