# Daily Dose of DevOps — What is CI/CD and why it matters

# CI/CD as a Control System: From Commit Entropy to Production Evidence

CI/CD is often reduced to automation, but its deeper purpose is epistemic: it converts uncertain changes into evidence about whether a system remains safe to operate. A pipeline is a feedback controller. Source changes are disturbances; tests, policy checks, and telemetry are sensors; deployment strategies are actuators; service-level objectives define acceptable operating bounds.

## The control loop

Continuous integration reduces integration entropy by keeping change sets small and repeatedly testing their composition. Continuous delivery preserves a deployable state; continuous deployment automatically promotes changes after policy gates succeed. These are distinct maturity levels, and conflating them creates unsafe expectations.

A defensible pipeline evaluates more than functional correctness:

1. **Provenance:** Can every artifact be traced to reviewed source and a reproducible build?
2. **Security:** Were dependencies, secrets, permissions, and artifact signatures evaluated?
3. **Operability:** Do latency, saturation, error-rate, and rollback signals exist before promotion?
4. **Change risk:** Is rollout scope proportional to uncertainty?

```yaml
promote:
  needs: [unit, integration, policy, sbom]
  environment: production
  steps:
    - run: cosign verify --key cosign.pub artifact.example/app:$GIT_SHA
    - run: deploy --strategy=canary --initial-traffic=1%
    - run: verify-slo --window=15m --max-error-budget-burn=2
```

## Why small batches dominate

If each changed component has some independent probability of introducing a defect, larger batches increase both the probability of failure and the diagnostic search space. Independence is an imperfect assumption—software dependencies are correlated—but the conclusion survives: small batches shorten feedback latency and improve causal attribution. Deployment frequency is therefore valuable only when paired with fast recovery and trustworthy verification.

## Failure modes

Pipeline success is not proof of production safety. Tests may encode incomplete specifications; staging traffic rarely matches production; mutable tags can sever provenance; and approval gates can become ceremonial. A mature design treats every gate as a falsifiable claim and continuously measures its predictive power. Flaky tests, for example, are not harmless noise: they weaken the statistical meaning of a green build and train operators to ignore alarms.

## Key Takeaways

- CI/CD is a socio-technical feedback system, not merely a collection of scripts.
- Optimize for evidence quality, small batch size, bounded blast radius, and reversible change.
- A green pipeline is a risk estimate; production telemetry must close the control loop.
- Measure lead time and deployment frequency alongside change-failure rate and recovery time.

