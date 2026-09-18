# Daily Dose of DevOps — Terraform remote state explained

# Terraform Remote State: A Consistency Boundary for Infrastructure Control

Terraform state is not a cache that can be casually regenerated. It is the controller’s mapping between declarative addresses and real provider objects, including dependency metadata and sensitive attributes. Remote state turns that mapping into a shared consistency boundary for teams and automation.

## State, locking, and serializability

Concurrent applies are competing writers. Without coordination, each run may calculate a valid plan from the same prior snapshot and then overwrite the other’s observations—a lost-update anomaly. A backend lock approximates single-writer serializability, but only if every writer honors it and lock leases are handled safely.

```hcl
terraform {
  backend "s3" {
    bucket       = "org-terraform-state"
    key          = "production/network.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

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

