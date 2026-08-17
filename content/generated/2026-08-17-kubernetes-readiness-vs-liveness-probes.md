# Daily Dose of DevOps — Kubernetes readiness vs liveness probes

# Kubernetes Readiness vs Liveness Probes: Understanding the Differences and Choosing Wisely

Kubernetes provides several mechanisms to manage the health and availability of your applications, including readiness and liveness probes. These probes help ensure that only healthy pods are serving traffic and that failed pods are restarted. Understanding the differences between these probes is crucial for maintaining the stability and performance of your applications in a Kubernetes environment.

## Introduction

In Kubernetes, probes are used to monitor the health of containers within a pod. There are two types of probes: liveness and readiness. Liveness probes are critical for ensuring that failed containers are restarted. Readiness probes, on the other hand, are used to determine whether a container is ready to accept traffic.

## Liveness Probes

### Purpose
Liveness probes are used to determine if a container is running and healthy. If a liveness probe fails, Kubernetes will restart the container.

### Types
- **HTTP GET**: This probe sends an HTTP request to the container.
- **TCP Socket**: This probe checks if the container is listening on a network port.
- **Exec**: This probe runs a command in the container and checks its exit code.

### Configuration Example

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Failure Modes
- **Timeout**: The probe takes longer than the specified timeout to complete.
- **Exit Code**: The command returns a non-zero exit code.
- **HTTP Status Code**: The HTTP request returns a status code that is not in the list of successful status codes.

### Trade-Offs
- **False Positives**: If a container is temporarily unresponsive, a liveness probe might incorrectly mark it as unhealthy.
- **False Negatives**: If a container is permanently unhealthy, a liveness probe might not detect the issue in time.

## Readiness Probes

### Purpose
Readiness probes are used to determine if a container is ready to serve traffic. If a readiness probe fails, Kubernetes will not send traffic to that container.

### Types
- **HTTP GET**: Similar to liveness probes, this probe sends an HTTP request.
- **TCP Socket**: Checks if the container is listening on a network port.
- **Exec**: Runs a command in the container and checks its exit code.

### Configuration Example

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Failure Modes
- **Timeout**: The probe takes longer than the specified timeout to complete.
- **Exit Code**: The command returns a non-zero exit code.
- **HTTP Status Code**: The HTTP request returns a status code that is not in the list of successful status codes.

### Trade-Offs
- **False Positives**: If a container is not fully initialized but still responds to traffic, a readiness probe might incorrectly mark it as ready.
- **False Negatives**: If a container is fully initialized but temporarily unable to handle traffic, a readiness probe might incorrectly mark it as not ready.

## Key Takeaways

1. **Liveness Probes** ensure that unhealthy containers are restarted. They are crucial for maintaining the overall health of your application.
2. **Readiness Probes** ensure that only healthy containers receive traffic. They are important for maintaining the quality of service for your application.
3. **False Positives and Negatives** can occur with both liveness and readiness probes. Understanding these can help you configure them more effectively.
4. **Configuration**: Proper configuration of probes can significantly improve the stability and performance of your applications in Kubernetes.

By understanding the differences and trade-offs between liveness and readiness probes, you can better manage the health and availability of your applications in Kubernetes.
