# Daily Dose of DevOps — Kubernetes readiness vs liveness probes

# Kubernetes Readiness vs Liveness Probes: Understanding the Differences and Their Impact

## Introduction

In the world of container orchestration, Kubernetes (K8s) is a cornerstone for managing containerized applications at scale. A critical aspect of ensuring the health and reliability of your applications within Kubernetes is the proper configuration of liveness and readiness probes. These probes are essential for Kubernetes to determine when a container is unhealthy and needs to be restarted, or when it is ready to receive traffic.

## What are Liveness and Readiness Probes?

### Liveness Probes

Liveness probes are used to determine if a container is still running and able to respond to requests. If a liveness probe fails, Kubernetes will restart the container. This is crucial for ensuring that your application is still functioning and can handle requests. Liveness probes are typically used to detect application-level failures.

### Readiness Probes

Readiness probes, on the other hand, are used to determine if a container is ready to start accepting traffic. If a readiness probe fails, Kubernetes will stop sending traffic to that container until the probe succeeds. This is particularly useful for ensuring that only healthy containers are receiving traffic, which helps maintain the overall health of the application.

## Failure Modes and Trade-offs

### Liveness Probes

#### Failure Mode
If a liveness probe fails, Kubernetes will restart the container. This can lead to temporary downtime, especially if the application is slow to restart or if the container is not designed to handle frequent restarts.

#### Trade-offs
- **Downtime**: Frequent restarts can lead to increased downtime, especially if the application is not robust against restarts.
- **Resource Utilization**: Frequent restarts can consume more resources, as Kubernetes may need to allocate and deallocate resources more frequently.

### Readiness Probes

#### Failure Mode
If a readiness probe fails, Kubernetes will stop sending traffic to the container. This can result in a degraded user experience if the application is not immediately available to handle traffic.

#### Trade-offs
- **User Experience**: Users may experience delays or unavailability if the application is not ready to handle requests.
- **Resource Wastage**: If a container is marked as not ready, it might still be consuming resources, even though it is not handling traffic.

## Example Configuration

Below is an example of how to configure liveness and readiness probes in a Kubernetes deployment YAML file.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: example-app
  template:
    metadata:
      labels:
        app: example-app
    spec:
      containers:
      - name: example-container
        image: example-image:latest
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

In this example:
- The `livenessProbe` checks the `/healthz` endpoint every 10 seconds, starting 30 seconds after the container starts.
- The `readinessProbe` checks the `/ready` endpoint every 5 seconds, starting 10 seconds after the container starts.

## Key Takeaways

1. **Liveness Probes**: Detect and restart unhealthy containers to ensure they can respond to requests.
2. **Readiness Probes**: Ensure only healthy containers receive traffic, maintaining the overall health of the application.
3. **Failure Modes**: Liveness probes can lead to increased downtime, while readiness probes can result in degraded user experiences.
4. **Configuration**: Proper configuration of probes can significantly enhance the reliability and performance of your applications in Kubernetes.

By understanding and correctly implementing liveness and readiness probes, you can ensure that your applications are robust, reliable, and performant in a Kubernetes environment.
