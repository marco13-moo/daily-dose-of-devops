# Daily Dose of DevOps — Kubernetes readiness vs liveness probes

# Kubernetes Readiness vs Liveness Probes: Understanding the Differences and Their Implications

In Kubernetes, ensuring that your application pods are both alive and ready to serve traffic is critical. Two key mechanisms for monitoring the health of your pods are **readiness probes** and **liveness probes**. These probes help in maintaining the health of your application and ensuring that only healthy instances are handling requests. Understanding the differences between these probes and their implications is essential for effective DevOps practices.

## What are Readiness and Liveness Probes?

### Liveness Probes
Liveness probes are used to determine if a container is running and healthy. If a liveness probe fails, Kubernetes will restart the container. This ensures that the application does not stay in a non-functional state.

### Readiness Probes
Readiness probes are used to determine if a container is ready to start accepting traffic. If a readiness probe fails, Kubernetes will not send traffic to the pod. This is useful in scenarios where a pod is in the process of starting up and is not yet ready to handle requests.

## Configuration of Probes

Both liveness and readiness probes can be configured using the `livenessProbe` and `readinessProbe` fields in the pod's specification. The configuration includes several parameters such as `httpGet`, `tcpSocket`, `exec`, and `initialDelaySeconds`, `periodSeconds`, `timeoutSeconds`, `failureThreshold`, and `successThreshold`.

### Example Configuration
Here is an example of how to configure both probes in a Kubernetes deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: nginx:latest
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /healthz
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
          successThreshold: 1
        readinessProbe:
          httpGet:
            path: /readiness
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
          successThreshold: 1
```

In this example, the liveness probe checks the `/healthz` endpoint every 10 seconds, and if it fails three times in a row, the container is restarted. The readiness probe checks the `/readiness` endpoint every 10 seconds, and if it fails three times in a row, the pod is not used to route traffic.

## Failure Modes and Trade-offs

### Liveness Probes
- **Failure Mode**: The application may remain in a non-functional state, causing downtime.
- **Trade-offs**: Overly aggressive liveness probes can lead to unnecessary container restarts, which can cause service disruption and increased load on the application.

### Readiness Probes
- **Failure Mode**: Traffic is sent to a pod that is not yet ready to handle requests, leading to potential errors or degraded service.
- **Trade-offs**: If the initial delay or period is too short, the application might not have enough time to initialize properly, leading to false negatives. Conversely, if it is too long, traffic might be delayed or routed to unhealthy pods.

## Key Takeaways

1. **Use Cases**: Liveness probes are used to ensure that a container is running and healthy, while readiness probes are used to determine if a container is ready to start accepting traffic.
2. **Configuration**: Both probes can be configured using `httpGet`, `tcpSocket`, or `exec` actions, with parameters like `initialDelaySeconds`, `periodSeconds`, and `failureThreshold`.
3. **Failure Modes**: Incorrectly configured liveness or readiness probes can lead to either unnecessary restarts or delayed traffic routing.
4. **Trade-offs**: Balancing the parameters of the probes is crucial to avoid both false positives and false negatives.

By understanding the differences and implications of liveness and readiness probes, you can ensure that your applications are both healthy and ready to serve traffic, leading to more robust and reliable deployments.
