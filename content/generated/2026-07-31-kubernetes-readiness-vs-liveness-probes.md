# Daily Dose of DevOps — Kubernetes readiness vs liveness probes

# Kubernetes Readiness vs Liveness Probes: Understanding the Difference

In the world of container orchestration, Kubernetes is a cornerstone tool for deploying and managing containerized applications. One of the essential features in Kubernetes is the ability to define how your applications should be monitored and managed. Two critical monitoring mechanisms in Kubernetes are readiness and liveness probes. Understanding the difference between these probes is crucial for ensuring your applications run smoothly and efficiently.

## What Are Readiness Probes?

Readiness probes are used to determine if a container is ready to start accepting traffic. This is often used to delay the routing of traffic to a container until it is fully initialized and ready to handle requests. The probe can be configured to check the application's availability and health by pinging an endpoint or command within the container.

### Example of a Readiness Probe

```yaml
readinessProbe:
  tcpSocket:
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```

In this example, Kubernetes will start checking the container's port 8080 for incoming traffic 5 seconds after the container starts and will check every 10 seconds thereafter. If the container is not ready, traffic will not be routed to it.

## What Are Liveness Probes?

Liveness probes, on the other hand, are used to determine if a container is still running and healthy. If a container fails the liveness probe, Kubernetes will restart the container. This is crucial for ensuring that containers that have failed or become unresponsive are automatically restarted, preventing downtime and data loss.

### Example of a Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 30
```

In this example, Kubernetes will send an HTTP GET request to the `/healthz` endpoint on port 8080 15 seconds after the container starts and will then check every 30 seconds thereafter. If the container does not respond as expected, it will be restarted.

## Key Differences

- **Purpose**: Readiness probes are used to check if a container is ready to handle traffic, while liveness probes are used to check if a container is still running and healthy.
- **Impact**: If a container fails a readiness probe, traffic is not routed to it; if it fails a liveness probe, the container is restarted.
- **Timing**: Readiness probes are checked before traffic is routed, while liveness probes are checked after traffic is already being routed to the container.

## Key Takeaways

1. **Understand the Purpose**: Use readiness probes to delay traffic routing until the application is fully initialized, and use liveness probes to ensure that the application remains healthy and responsive.
2. **Configure Correctly**: Properly configure the initial delay and period intervals for both probes to avoid unnecessary container restarts or delays in traffic routing.
3. **Utilize Multiple Probes**: In some cases, it can be beneficial to use a combination of readiness and liveness probes to ensure both the initialization and health of your containers.

By mastering the use of readiness and liveness probes, you can enhance the reliability and performance of your Kubernetes deployments.
