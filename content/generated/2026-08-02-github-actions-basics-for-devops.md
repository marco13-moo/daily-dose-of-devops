# Daily Dose of DevOps — GitHub Actions basics for DevOps

# GitHub Actions Basics for DevOps

GitHub Actions is a continuous integration and delivery (CI/CD) tool that integrates seamlessly with GitHub repositories. It allows you to automate your software delivery process, from building and testing your code to deploying it to production. In this blog post, we'll cover the basics of GitHub Actions and how you can use it in your DevOps workflow.

## What is GitHub Actions?

GitHub Actions is a serverless infrastructure that runs jobs in containers. These jobs can be triggered by events such as a push to a branch, opening a pull request, or creating a new release. It provides a declarative way to define workflows using YAML files, which are stored in your repository.

## Setting Up GitHub Actions

To get started with GitHub Actions, you first need to have a GitHub repository. If you don't already have one, create a new repository on GitHub.

### Step 1: Create a Workflow File

GitHub Actions uses a YAML file to define workflows. You can store this file in the `.github/workflows` directory of your repository. Here is an example of a basic workflow file that runs a simple shell command:

```yaml
# .github/workflows/hello-world.yml
name: Hello World

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Check out repository code
      uses: actions/checkout@v2

    - name: Run a one-liner
      run: echo Hello, world!
```

In this example, the workflow is triggered on a push to the `main` branch. It runs on an Ubuntu machine and includes two steps:
1. Checking out the code from the repository.
2. Running a simple echo command.

### Step 2: Trigger the Workflow

Once you have the workflow file set up, you can trigger it by pushing changes to the repository or by opening a pull request. The workflow will then execute the steps defined in the YAML file.

## Key Takeaways

- **GitHub Actions is a powerful CI/CD solution** that integrates with GitHub repositories.
- **Workflows are defined in YAML files** stored in the `.github/workflows` directory.
- **Triggers** can be set to run workflows on specific events, such as pushing to a branch or creating a pull request.
- **Steps in a workflow** can include actions like checking out code, running scripts, or deploying applications.

By leveraging GitHub Actions, you can automate your software delivery process, ensuring that your code is tested and deployed efficiently. Whether you're a developer, DevOps engineer, or team lead, integrating GitHub Actions into your workflow can significantly enhance your productivity and the quality of your software.

Happy automating!
