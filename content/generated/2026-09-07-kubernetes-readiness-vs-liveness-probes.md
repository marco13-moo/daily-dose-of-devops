# Daily Dose of DevOps — Kubernetes readiness vs liveness probes

# Kubernetes Probes as Failure Detectors: Semantics, Timing, and Cascading Risk

Kubernetes probes are distributed-systems failure detectors with different control effects. A readiness failure removes a Pod from Service endpoints; a liveness failure asks the kubelet to restart the container. The distinction matters because detection is necessarily imperfect: aggressive thresholds reduce detection latency but increase false positives under transient load.

## Readiness protects traffic; liveness repairs deadlock

Readiness should answer: “Can this replica safely accept new work now?” It may include critical local state and indispensable downstream dependencies, but indiscriminately probing every dependency can create a cascade: one database slowdown marks every replica unready, eliminating all capacity precisely when graceful degradation is needed.

Liveness should answer a narrower question: “Is the process irrecoverably stuck such that restart is the best available remediation?” It should not fail because a remote dependency is unavailable. Restarting healthy processes during a network partition adds cold-start pressure without repairing the dependency.

```yaml
startupProbe:
  httpGet: { path: /health/startup, port: 8080 }
  periodSeconds: 5
  failureThreshold: 30
readinessProbe:
  httpGet: { path: /health/ready, port: 8080 }
  periodSeconds: 5
  failureThreshold: 2
livenessProbe:
  httpGet: { path: /health/live, port: 8080 }
  periodSeconds: 10
  failureThreshold: 3
```

The startup probe creates a temporal firewall: until initialization succeeds, liveness checks are suppressed. This prevents slow but valid startup from entering a restart loop.

## Deriving thresholds

Probe timing should follow measured distributions, not folklore. Let the check interval be *p*, timeout *t*, and failure threshold *f*. Approximate worst-case detection latency is *p × f*, plus request timeout effects. Choose this against the service’s recovery-time objective and the cost of a false positive. Then validate under CPU throttling, garbage-collection pauses, dependency latency, and node pressure.

## Key Takeaways

- Readiness changes routing; liveness triggers restart; startup protects initialization.
- Keep liveness local and conservative.
- Design readiness for graceful degradation rather than dependency-amplified outages.
- Derive timings from latency distributions and test them under realistic resource pressure.

