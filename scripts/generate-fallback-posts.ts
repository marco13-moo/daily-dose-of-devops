import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getTopicCatalog } from "../api/topic-rotator.js";

type CategoryProfile = {
  operatingModel: string;
  primarySignal: string;
  failureMode: string;
  control: string;
  example: string;
};

const OUTPUT_ROOT = path.join("content", ".fallback-posts");

const PROFILES: Record<string, CategoryProfile> = {
  "platform-engineering": {
    operatingModel: "a product-oriented internal platform with explicit service ownership and paved-road contracts",
    primarySignal: "adoption, successful self-service completion, lead time, and platform-induced toil",
    failureMode: "centralising delivery behind a ticket queue while calling the result self-service",
    control: "versioned golden paths, discoverable ownership, policy guardrails, and measured developer outcomes",
    example: `apiVersion: backstage.io/v1alpha1\nkind: Component\nmetadata:\n  name: payments-api\n  annotations:\n    platform.example/owner: payments\nspec:\n  type: service\n  lifecycle: production`,
  },
  kubernetes: {
    operatingModel: "a multi-tenant Kubernetes platform with declarative reconciliation and bounded workload privileges",
    primarySignal: "saturation, scheduling latency, error-budget burn, reconciliation failure, and recovery time",
    failureMode: "treating Kubernetes defaults as an operating model and allowing every team to invent cluster policy",
    control: "tested admission policy, workload identity, resource envelopes, progressive delivery, and explicit tenancy boundaries",
    example: `apiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata:\n  name: critical-api\nspec:\n  minAvailable: 80%\n  selector:\n    matchLabels:\n      app: critical-api`,
  },
  security: {
    operatingModel: "a zero-trust delivery system in which identity, provenance, and policy are evaluated continuously",
    primarySignal: "control coverage, policy exceptions, credential lifetime, remediation latency, and provenance verification",
    failureMode: "adding ceremonial approval gates without constraining capabilities or verifying the produced artifact",
    control: "short-lived identity, least privilege, immutable dependencies, signed provenance, and policy-as-code enforcement",
    example: `permissions:\n  contents: read\n  id-token: write\nsteps:\n  - uses: actions/checkout@<immutable-sha>\n  - run: cosign verify --certificate-identity-regexp='^https://github.com/example/' artifact`,
  },
  observability: {
    operatingModel: "an SLO-led telemetry platform that connects service behaviour to customer-visible outcomes",
    primarySignal: "error-budget burn, tail latency, cardinality growth, telemetry loss, and diagnostic time",
    failureMode: "collecting every available signal without ownership, retention economics, or an incident hypothesis",
    control: "stable semantic conventions, tiered retention, cardinality budgets, sampling policy, and telemetry pipeline SLOs",
    example: `processors:\n  memory_limiter:\n    limit_mib: 512\n  batch:\n    send_batch_size: 1024\nexporters:\n  otlp:\n    endpoint: telemetry-gateway:4317`,
  },
};

const OPENINGS = [
  "The expensive failure is rarely the missing tool; it is the absent operating contract.",
  "Scale converts an informal convention into an outage mechanism.",
  "A platform capability becomes dangerous when ownership is implicit but authority is broad.",
  "Enterprise reliability deteriorates when automation accelerates change without strengthening evidence.",
];

function slugifyTopic(topic: string): string {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function stableIndex(value: string, modulo: number): number {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % modulo;
}

function renderArticle(category: string, topic: string): string {
  const profile = PROFILES[category];
  if (!profile) throw new Error(`No fallback-writing profile exists for category: ${category}`);

  const [subject, ...contextParts] = topic.split(":");
  const context = contextParts.join(":").trim() || "in production";
  const opening = OPENINGS[stableIndex(topic, OPENINGS.length)];

  return `# ${topic}\n\n${opening} For **${subject.toLowerCase()} ${context}**, the decisive question is not whether a team can demonstrate the technology once. It is whether the organisation can operate it repeatedly, audit its decisions, and recover when assumptions fail.\n\n## The operating problem\n\nTreat ${subject.toLowerCase()} as part of ${profile.operatingModel}. Define the consumer, owner, support boundary, change policy, and recovery objective before selecting implementation details. When operating ${subject.toLowerCase()} ${context}, undocumented authority and ambiguous ownership create more risk than a missing feature.\n\nA credible design measures ${profile.primarySignal}. Those measures should be visible to both the platform owner and consuming teams. If the measurements cannot distinguish adoption from coercion, or reliability from mere activity, the operating model is not yet falsifiable.\n\n## A practical control\n\nStart with a narrow contract that can be tested automatically. The implementation should encode ${profile.control}. The following fragment is illustrative; production values must be derived from workload evidence and organisational policy.\n\n\`\`\`yaml\n${profile.example}\n\`\`\`\n\nRoll the control out to one representative service, observe failure behaviour, and exercise rollback before broad adoption. Record exceptions as expiring decisions with an accountable owner, not permanent bypasses.\n\n## Trade-offs\n\nStandardisation reduces cognitive load and makes controls observable, but an excessively rigid path displaces complexity into workarounds. Flexibility improves local fit, but every variant expands the support surface and weakens fleet-wide guarantees. For ${subject.toLowerCase()} ${context}, prefer a small mandatory safety kernel surrounded by replaceable implementation choices.\n\nThe organisation must also pay for operability. More validation increases feedback time; more telemetry increases cost and cardinality risk; stronger isolation can reduce utilisation. Make those costs explicit and compare them with the blast radius and recovery cost they buy down.\n\n## What teams get wrong\n\nThe recurrent anti-pattern is ${profile.failureMode}. Teams then measure task completion instead of production outcomes, accumulate exceptions without expiry, and discover during an incident that the nominal control has no tested recovery path.\n\nAnother error is adopting a reference architecture without its assumptions. Validate identity boundaries, dependency failure, capacity pressure, partial rollout, rollback, and audit reconstruction in the environment that will actually carry production traffic.\n\n## Key Takeaways\n\n- Treat ${subject.toLowerCase()} as an owned product and control system, not a tool installation.\n- Design for the constraints captured by “${context}”; document the authority, failure domain, and recovery objective.\n- Measure ${profile.primarySignal}.\n- Automate ${profile.control}.\n- Test degraded operation and rollback before scaling adoption.\n`;
}

const catalog = getTopicCatalog();
for (const { category, topic } of catalog) {
  const directory = path.join(OUTPUT_ROOT, category);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${slugifyTopic(topic)}.md`), renderArticle(category, topic), "utf8");
}

console.log(`Generated ${catalog.length} repository-backed fallback posts in ${OUTPUT_ROOT}.`);
