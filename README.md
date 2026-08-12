# Daily Dose of DevOps

![Project Badge](https://img.shields.io/badge/status-production-green)

**Automated DevOps Blog Generator | DEV Community + Hugging Face + GitHub Actions + Vercel**

---

## 🚀 Project Overview

**Daily Dose of DevOps** generates advanced DevOps articles, publishes them to **DEV Community**, and retains the Markdown source in GitHub. GitHub remains the canonical archive so platform policy changes cannot strand the content.

The system is powered by:

- **Hugging Face**: AI model generates technical content.
- **DEV Community**: Publishes Markdown articles through the Forem API.
- **GitHub archive**: Saves every generated article under `content/generated/`.
- **GitHub Actions**: Runs daily to automate the generation and publication workflow.
- **Vercel**: Hosts a preview API endpoint for generated posts.
- **TypeScript & Node.js**: Strongly-typed, maintainable, modern JS stack.

---

## 📦 Project Structure

```text
daily-dose-of-devops/
├── api/
│   └── generate-and-publish.ts   # Core generation & publishing logic
├── content/
│   ├── topics.yaml               # Rotating list of blog topics
│   └── published.json            # Tracks published topics to avoid duplicates
├── prompts/
│   └── devops-blog.prompt.md     # Base AI prompt for blog generation
├── docs/                         # Optional documentation or screenshots
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
└── vercel.json                   # Vercel deployment config


## ⚡ Features

1. **Automated Blog Generation**
   - Uses a Hugging Face LLM to write short, professional DevOps posts.
   - Includes markdown formatting and short code snippets when relevant.

2. **Daily Publication**
   - GitHub Actions triggers every day at 07:00 UTC.
   - Posts automatically to your **DEV Community profile**.

3. **Topic Rotation & Deduplication**
   - Pulls from a rotating list of topics in `topics.yaml`.
   - Prevents duplicate posts by tracking published topics in `published.json`.

4. **CI/CD & DevOps Excellence**
   - Fully typed TypeScript code.
   - Build and run scripts included for CI/CD pipelines.
   - Hosted preview via **Vercel** for rapid validation before publishing.


## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/marco13-moo/daily-dose-of-devops.git
cd daily-dose-of-devops

2. Install dependencies

npm install

3. Configure Secrets

Create a .env file or set GitHub repository secrets:

HUGGINGFACE_API_TOKEN=<your_huggingface_token>
DEV_API_KEY=<your_dev_api_key>

Build the project
npm run build

## 📝 How it Works

1. **Pick a topic** from `topics.yaml` that hasn’t been published yet.
2. **Generate content** via Hugging Face LLM.
3. **Publish post** to DEV Community.
4. **Update `published.json`** with topic, URL, and timestamp.
5. **Commit & push** updates back to GitHub automatically.

---

## 📈 DevOps & Portfolio Highlights

This project demonstrates:

- **Automation:** Full daily blog generation pipeline.
- **CI/CD:** GitHub Actions builds, tests, and deploys automatically.
- **Cloud Deployment:** Vercel API previews without running anything locally.
- **State Management:** Tracks published topics to prevent duplicates.
- **Extensibility:** Easily add topics, change models, or add logging.

---

## 🛠️ Technologies Used

| Layer          | Technology / Tool                     |
|----------------|--------------------------------------|
| AI Generation  | Hugging Face (Qwen2.5-7B-Instruct)    |
| Blogging       | DEV Community / Forem API             |
| CI/CD          | GitHub Actions                        |
| Preview API    | Vercel                                |
| Language       | TypeScript, Node.js                   |
| Configuration  | YAML (`topics.yaml`), JSON (`published.json`) |

## 🔗 Links

- **Repo:** [GitHub](https://github.com/marco13-moo/daily-dose-of-devops)  
- **Live API Preview:** `https://daily-dev-blog.vercel.app/api/generate-and-publish`

## Migrating the Hashnode archive

The migration reads the 20 complete articles still exposed by the public Hashnode RSS feed. It is idempotent and preserves each Hashnode URL as the DEV canonical URL.

```bash
npm run build

# Safe preview: creates DEV drafts
DEV_API_KEY=<your_key> npm run migrate:hashnode

# Publish the imported archive
DEV_API_KEY=<your_key> DEV_MIGRATION_PUBLISH=true npm run migrate:hashnode
```

Hashnode no longer exposes the older archive through its free API. Those posts require a Hashnode export or manual source files before they can be migrated.
