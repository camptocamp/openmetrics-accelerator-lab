from flask import Flask, jsonify, render_template, request
from prometheus_client import Gauge, generate_latest, CONTENT_TYPE_LATEST
import math, time, threading

app = Flask(__name__)

# --- Prometheus metrics ---
kick_power = Gauge("kick_power", "Kick power")
beam_speed = Gauge("beam_speed_km_s", "Current beam speed in km/s")
beam_energy = Gauge("beam_energy_mev", "Current beam energy in MeV")
accelerator_state = Gauge("accelerator_state", "Accelerator state: 0=stopped, 1=running, 2=success, 3=overloaded, 4=timeout")

# --- Internal state ---
state = 0
KICK_POWER = 27 # arbitrary unit, should be stay in [0;100]
c = 299_792_458  # speed of light
m0 = 0.000938  # proton energy in TeV

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/kick_power")
def kick():
    global KICK_POWER
    return jsonify({"kick_power": KICK_POWER})

@app.route("/state", methods=["POST"])
def update_state():
    data = request.get_json(force=True)
    status = int(data.get("status", 0))
    speed = float(data.get("speed", 0.0))

    # Update metrics values    
    beam_speed.set(speed)
    beam_energy.set(m0*math.sqrt((c/2*abs(c - speed*1000))))
    accelerator_state.set(status)
    if(status == 1): # status=running
        kick_power.set(KICK_POWER)
    else:
        kick_power.set(0)

    print(f"[STATE] status={status}, speed={speed:.2f}")
    return jsonify({"message": "state updated", "status": status}), 200

@app.route("/metrics")
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
