# Daily Dose of DevOps — GitHub Actions basics for DevOps

# GitHub Actions as a Capability System: Secure Automation by Construction

GitHub Actions combines an event system, workflow scheduler, ephemeral compute, and credential broker. Its primary security question is not “Does the YAML run?” but “What authority can untrusted input exercise?” A workflow triggered by pull-request content sits on a trust boundary: branch names, commit contents, issue text, and third-party action outputs may all be attacker-controlled.

## Minimize authority

Permissions should be explicit and job-scoped. Build jobs usually need read-only repository access; deployment jobs can receive stronger rights only after protected-environment controls succeed. OpenID Connect is preferable to long-lived cloud credentials because it exchanges a short-lived, claim-bound identity at runtime.

```yaml
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
```

Pin third-party actions to immutable commit SHAs, review their provenance, and use dependency automation to propose controlled updates. Tags are readable but mutable. Treat workflow logs and artifacts as potential exfiltration channels; masking is not a substitute for preventing secret exposure.

## Reproducibility and concurrency

Use lockfiles and deterministic installation commands. Separate build from deployment, promote the same verified artifact, and attach provenance rather than rebuilding per environment. Apply concurrency groups to prevent stale deployments from racing newer commits, while choosing cancellation semantics carefully for stateful operations.

## Key Takeaways

- Model workflows as programs executing with capabilities and untrusted inputs.
- Grant the minimum token permissions at the narrowest job scope.
- Prefer short-lived federated identity and immutable dependencies.
- Build once, verify provenance, and promote the identical artifact through environments.

