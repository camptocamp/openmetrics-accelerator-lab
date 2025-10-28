from flask import Flask, jsonify, render_template, request
from prometheus_client import Gauge, generate_latest, CONTENT_TYPE_LATEST
import math, time, threading

app = Flask(__name__)

# --- Prometheus metrics ---
kick_power = Gauge("kick_power", "Kick power")
beam_speed = Gauge("beam_speed_km_s", "Current beam speed in km/s")
accelerator_state = Gauge("accelerator_state", "Accelerator state: 0=stopped, 1=running, 2=overloaded, 3=timeout")

# --- Internal state ---
state = 0
KICK_POWER = 68 # arbitrary unit, should be stay in [0;100]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/kick_power")
def start():
    global KICK_POWER
    return jsonify({"kick_power": KICK_POWER})

@app.route("/state", methods=["POST"])
def update_state():
    data = request.get_json(force=True)
    status = int(data.get("status", 0))
    speed = float(data.get("speed", 0.0))

    beam_speed.set(speed)
    accelerator_state.set(status)

    print(f"[STATE] status={status}, speed={speed:.2f}")
    return jsonify({"message": "state updated", "status": status}), 200

@app.route("/state")
def state():
    return jsonify({
        "running": running,
        "failed": failed,
        "speed_percent_c": current_speed
    })

@app.route("/metrics")
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
