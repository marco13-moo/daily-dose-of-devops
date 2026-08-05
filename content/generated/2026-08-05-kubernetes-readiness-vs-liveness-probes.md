# Daily Dose of DevOps — Kubernetes readiness vs liveness probes

# Kubernetes Readiness vs Liveness Probes: Understanding the Differences

Kubernetes, a popular container orchestration platform, provides a robust set of tools to manage the health and connectivity of your applications. Two essential features in this regard are readiness and liveness probes. In this blog post, we’ll explore the differences between these probes and how they can be configured to enhance the reliability and performance of your applications.

## What are Readiness and Liveness Probes?

### Readiness Probes

Readiness probes are used to determine if a container is ready to start accepting traffic. When a pod is created or restarted, Kubernetes continuously polls the container at the specified interval using the readiness probe. If the probe succeeds, Kubernetes considers the container ready, and it starts distributing traffic to it. If the probe fails, Kubernetes stops sending traffic to the pod until the probe succeeds.

### Liveness Probes

Liveness probes are used to determine if a container is still running and healthy. If a liveness probe fails, Kubernetes will restart the container. This is useful for applications that might crash or become unresponsive but are still consuming resources. Liveness probes help ensure that unhealthy containers are replaced with new instances.

## How to Configure Probes

### Readiness Probes Example

Here is an example of how to configure a readiness probe in a Kubernetes deployment YAML file:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
spec:
  template:
    spec:
      containers:
      - name: example-container
        image: example-image:latest
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 5
```

### Liveness Probes Example

Here is an example of how to configure a liveness probe in the same deployment YAML file:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
spec:
  template:
    spec:
      containers:
      - name: example-container
        image: example-image:latest
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
          timeoutSeconds: 5
          failureThreshold: 3
```

## Key Takeaways

- **Readiness Probes** are used to ensure that a container is ready to receive traffic. They are useful for managing the availability of containers in your application.
- **Liveness Probes** are used to determine if a container is still running and healthy. They help prevent unhealthy containers from serving traffic and ensure that your application remains stable.
- Proper configuration of probes can significantly enhance the reliability and performance of your Kubernetes deployments.

By understanding and effectively using readiness and liveness probes, you can ensure that your applications are always available and healthy, leading to better user experiences and more efficient resource utilization.
