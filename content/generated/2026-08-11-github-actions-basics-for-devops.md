# Daily Dose of DevOps — GitHub Actions basics for DevOps

# GitHub Actions Basics for DevOps

## Introduction

GitHub Actions is a powerful automation platform that integrates with GitHub repositories to automate your software development workflows. It allows you to run jobs on a schedule or in response to events such as pushes to branches, pull requests, or tags. This article will cover the basics of using GitHub Actions, including defining workflows, managing secrets, and handling failure modes.

## Defining a Workflow

A GitHub Actions workflow is a YAML file that defines jobs and steps to run in response to events. The workflow file is stored in the `.github/workflows` directory of your repository. Here is a basic example of a workflow that runs a build and test job on every push to the `main` branch:

```yaml
name: CI

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '14'
    - name: Install dependencies
      run: npm install
    - name: Run tests
      run: npm test
```

### Key Components

- **name**: The name of the workflow.
- **on**: Triggers for the workflow, such as push events.
- **jobs**: A collection of jobs to run.
- **runs-on**: The runner on which the job will run (e.g., `ubuntu-latest`).
- **steps**: A collection of steps to run in sequence.

### Managing Secrets

To store sensitive information such as API keys and database credentials, use GitHub secrets. Here’s how you can reference a secret in a workflow:

```yaml
- name: Deploy to Production
  if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
  env:
    API_KEY: ${{ secrets.API_KEY }}
  run: |
    # Your deployment script here
```

## Failure Modes and Trade-offs

### Common Failure Modes

1. **Network Issues**: If the runner is unable to access the internet, steps that require network access (e.g., pulling images from a private Docker registry) will fail.
2. **Resource Constraints**: If the runner does not have sufficient resources (e.g., memory, CPU), steps that require intensive processing may fail or be slow.
3. **Dependency Issues**: If dependencies are not correctly installed or if they are corrupted, the build or test steps may fail.
4. **Configuration Errors**: Incorrectly configured workflows or steps can lead to unexpected behavior or failures.

### Trade-offs

- **Cost**: Using GitHub Actions can incur costs, especially if you use a lot of minutes or if you use expensive runners.
- **Complexity**: Managing complex workflows can be challenging, especially as the number of jobs and steps increases.
- **Latency**: Depending on the location of the runner, there can be latency issues, especially for jobs that require significant network access.
- **Security**: While GitHub provides a secure environment, there are still risks associated with handling sensitive data and secrets.

## Example: Continuous Deployment with Docker

Here’s an example of a workflow that builds and deploys a Docker image to a private Docker registry:

```yaml
name: Docker Image CI

on:
  push:
    branches: [ main ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v2

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v1

    - name: Login to Docker Hub
      uses: docker/login-action@v1
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Build and push Docker image
      run: |
        docker build -t my-docker-repo .
        docker push my-docker-repo
```

## Key Takeaways

1. **Workflow Definition**: Define workflows using YAML files in the `.github/workflows` directory.
2. **Secret Management**: Use GitHub secrets to manage sensitive information securely.
3. **Failure Modes**: Be aware of common failure modes such as network issues and resource constraints.
4. **Complexity**: Keep workflows simple and modular to avoid complexity.
5. **Security**: Ensure that sensitive data is handled securely and that secrets are not exposed.

By understanding these basics, you can effectively leverage GitHub Actions to streamline your CI/CD pipeline and improve your DevOps processes.
