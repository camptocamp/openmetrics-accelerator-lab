# Openmetrics Particle Accelerator Lab

This project is a small experimental “lab” designed to demonstrate how easily 
OpenMetrics metrics can be integrated into a business application for 
Prometheus monitoring.

It simulates a very simple particle accelerator where a particle 
(represented by a moving ball) travels around a ring and receives periodic 
“kicks” to accelerate and reach (almost) the speed of light.

* If the kick is too strong, the system overloads.
* If the experiment runs too long, it automatically shuts down.

The goal is to tune the `KICK_POWER` variable to reach the optimal speed 
without triggering an overload.

The project illustrates how operational metrics can be embedded directly into 
an application’s logic — allowing developers to observe its internal state and 
performance through Prometheus. 

## Usage

After cloning the repository, simply start the environment with:

```shell
docker compose up
```

Once all services are running, you can access the following components:

* [http://localhost:5000](http://localhost:5000): Application (Flask + JS) 

* [http://localhost:3000](http://localhost:3000): Grafana Dashboard

* [http://localhost:9090](http://localhost:9090): Prometheus

* [http://localhost:8080](http://localhost:8080): VSCode (in-browser IDE)

## Expected Workflow

1. Open the application in your browser.
2. Start the experiment — the simulated particle begins accelerating.
3. Observe live metrics on the Grafana dashboard (powered by Prometheus).
4. Adjust the `KICK_POWER` parameter in `app.py` directly from code-server 
   — Flask automatically reloads.
5. Re-run the experiment and observe the effect of your changes.

This loop demonstrates how easily metrics collection and visualization can be integrated into a business application, enabling fast iteration and observability-driven development.

## More

- [blogpost: Prometheus for devs](https://dev.to/camptocamp-ops/intro-to-prometheus-for-developers-675)

