const POSTS: Record<string, string> = {
  "What is CI/CD and why it matters": `# CI/CD as a Control System: From Commit Entropy to Production Evidence

CI/CD is often reduced to automation, but its deeper purpose is epistemic: it converts uncertain changes into evidence about whether a system remains safe to operate. A pipeline is a feedback controller. Source changes are disturbances; tests, policy checks, and telemetry are sensors; deployment strategies are actuators; service-level objectives define acceptable operating bounds.

## The control loop

Continuous integration reduces integration entropy by keeping change sets small and repeatedly testing their composition. Continuous delivery preserves a deployable state; continuous deployment automatically promotes changes after policy gates succeed. These are distinct maturity levels, and conflating them creates unsafe expectations.

A defensible pipeline evaluates more than functional correctness:

1. **Provenance:** Can every artifact be traced to reviewed source and a reproducible build?
2. **Security:** Were dependencies, secrets, permissions, and artifact signatures evaluated?
3. **Operability:** Do latency, saturation, error-rate, and rollback signals exist before promotion?
4. **Change risk:** Is rollout scope proportional to uncertainty?

\`\`\`yaml
promote:
  needs: [unit, integration, policy, sbom]
  environment: production
  steps:
    - run: cosign verify --key cosign.pub artifact.example/app:$GIT_SHA
    - run: deploy --strategy=canary --initial-traffic=1%
    - run: verify-slo --window=15m --max-error-budget-burn=2
\`\`\`

## Why small batches dominate

If each changed component has some independent probability of introducing a defect, larger batches increase both the probability of failure and the diagnostic search space. Independence is an imperfect assumption—software dependencies are correlated—but the conclusion survives: small batches shorten feedback latency and improve causal attribution. Deployment frequency is therefore valuable only when paired with fast recovery and trustworthy verification.

## Failure modes

Pipeline success is not proof of production safety. Tests may encode incomplete specifications; staging traffic rarely matches production; mutable tags can sever provenance; and approval gates can become ceremonial. A mature design treats every gate as a falsifiable claim and continuously measures its predictive power. Flaky tests, for example, are not harmless noise: they weaken the statistical meaning of a green build and train operators to ignore alarms.

## Key Takeaways

- CI/CD is a socio-technical feedback system, not merely a collection of scripts.
- Optimize for evidence quality, small batch size, bounded blast radius, and reversible change.
- A green pipeline is a risk estimate; production telemetry must close the control loop.
- Measure lead time and deployment frequency alongside change-failure rate and recovery time.
`,
  "Kubernetes readiness vs liveness probes": `# Kubernetes Probes as Failure Detectors: Semantics, Timing, and Cascading Risk

Kubernetes probes are distributed-systems failure detectors with different control effects. A readiness failure removes a Pod from Service endpoints; a liveness failure asks the kubelet to restart the container. The distinction matters because detection is necessarily imperfect: aggressive thresholds reduce detection latency but increase false positives under transient load.

## Readiness protects traffic; liveness repairs deadlock

Readiness should answer: “Can this replica safely accept new work now?” It may include critical local state and indispensable downstream dependencies, but indiscriminately probing every dependency can create a cascade: one database slowdown marks every replica unready, eliminating all capacity precisely when graceful degradation is needed.

Liveness should answer a narrower question: “Is the process irrecoverably stuck such that restart is the best available remediation?” It should not fail because a remote dependency is unavailable. Restarting healthy processes during a network partition adds cold-start pressure without repairing the dependency.

\`\`\`yaml
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
\`\`\`

The startup probe creates a temporal firewall: until initialization succeeds, liveness checks are suppressed. This prevents slow but valid startup from entering a restart loop.

## Deriving thresholds

Probe timing should follow measured distributions, not folklore. Let the check interval be *p*, timeout *t*, and failure threshold *f*. Approximate worst-case detection latency is *p × f*, plus request timeout effects. Choose this against the service’s recovery-time objective and the cost of a false positive. Then validate under CPU throttling, garbage-collection pauses, dependency latency, and node pressure.

## Key Takeaways

- Readiness changes routing; liveness triggers restart; startup protects initialization.
- Keep liveness local and conservative.
- Design readiness for graceful degradation rather than dependency-amplified outages.
- Derive timings from latency distributions and test them under realistic resource pressure.
`,
  "Terraform remote state explained": `# Terraform Remote State: A Consistency Boundary for Infrastructure Control

Terraform state is not a cache that can be casually regenerated. It is the controller’s mapping between declarative addresses and real provider objects, including dependency metadata and sensitive attributes. Remote state turns that mapping into a shared consistency boundary for teams and automation.

## State, locking, and serializability

Concurrent applies are competing writers. Without coordination, each run may calculate a valid plan from the same prior snapshot and then overwrite the other’s observations—a lost-update anomaly. A backend lock approximates single-writer serializability, but only if every writer honors it and lock leases are handled safely.

\`\`\`hcl
terraform {
  backend "s3" {
    bucket       = "org-terraform-state"
    key          = "production/network.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }
}
\`\`\`

Encryption at rest is necessary but insufficient. Use narrowly scoped identities, transport encryption, access logs, object versioning, retention controls, and tested recovery. State often contains credentials or connection material even when configuration marks outputs as sensitive; “sensitive” primarily controls presentation, not storage.

## Partition by failure domain

A single monolithic state increases lock contention, plan latency, privilege breadth, and blast radius. Excessive fragmentation, however, produces brittle cross-state dependencies and coordination overhead. Prefer boundaries aligned with ownership, lifecycle, privilege, and failure domains. Exchange stable identifiers through explicit interfaces rather than exposing entire state snapshots.

## Recovery discipline

Never repair state by editing JSON under pressure. First stop writers, preserve the current object and its versions, compare state with provider reality, and use supported operations such as import, moved blocks, or state move. A backend backup is only credible after a restore exercise demonstrates recovery point and recovery time objectives.

## Key Takeaways

- Remote state is a critical consistency and security boundary.
- Locking prevents competing writers only when all automation uses the same backend discipline.
- Partition state along operational boundaries, not arbitrary directory structure.
- Version, audit, encrypt, restrict, and regularly test restoration.
`,
  "GitHub Actions basics for DevOps": `# GitHub Actions as a Capability System: Secure Automation by Construction

GitHub Actions combines an event system, workflow scheduler, ephemeral compute, and credential broker. Its primary security question is not “Does the YAML run?” but “What authority can untrusted input exercise?” A workflow triggered by pull-request content sits on a trust boundary: branch names, commit contents, issue text, and third-party action outputs may all be attacker-controlled.

## Minimize authority

Permissions should be explicit and job-scoped. Build jobs usually need read-only repository access; deployment jobs can receive stronger rights only after protected-environment controls succeed. OpenID Connect is preferable to long-lived cloud credentials because it exchanges a short-lived, claim-bound identity at runtime.

\`\`\`yaml
permissions:
  contents: read

jobs:
  deploy:
    environment: production
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@<immutable-commit-sha>
      - run: npm ci --ignore-scripts
      - run: npm test
      - run: ./scripts/deploy.sh
\`\`\`

Pin third-party actions to immutable commit SHAs, review their provenance, and use dependency automation to propose controlled updates. Tags are readable but mutable. Treat workflow logs and artifacts as potential exfiltration channels; masking is not a substitute for preventing secret exposure.

## Reproducibility and concurrency

Use lockfiles and deterministic installation commands. Separate build from deployment, promote the same verified artifact, and attach provenance rather than rebuilding per environment. Apply concurrency groups to prevent stale deployments from racing newer commits, while choosing cancellation semantics carefully for stateful operations.

## Key Takeaways

- Model workflows as programs executing with capabilities and untrusted inputs.
- Grant the minimum token permissions at the narrowest job scope.
- Prefer short-lived federated identity and immutable dependencies.
- Build once, verify provenance, and promote the identical artifact through environments.
`,
};

const DEFAULT_POST = POSTS["What is CI/CD and why it matters"];

export function getFallbackPost(topic: string): string {
  return POSTS[topic] ?? DEFAULT_POST.replace(
    "# CI/CD as a Control System: From Commit Entropy to Production Evidence",
    `# ${topic}: A Systems Perspective`,
  );
}
