# Setup GitHub Actions Workflows

## Problem

The GitHub OAuth token doesn't have the `workflow` scope, so workflows cannot be pushed via git push.

## Solution Options

### Option 1: Create Workflows via GitHub Web Interface (Recommended)

1. Go to your repository: https://github.com/igorbrandao18/spotlight-backend
2. Click on "Actions" tab
3. Click "New workflow"
4. Click "set up a workflow yourself"
5. Name it `deploy.yml`
6. Copy the content from `.github/workflows/deploy.yml` in this repository
7. Click "Start commit" → "Commit new file"
8. Repeat for `deploy-docker.yml` if needed

### Option 2: Update GitHub Token Permissions

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Create a new token with `workflow` scope
3. Update your git credentials:
   ```bash
   git config --global credential.helper store
   # Then push again - it will ask for credentials
   ```

### Option 3: Use GitHub CLI with Workflow Scope

1. Re-authenticate with workflow scope:
   ```bash
   gh auth refresh -s workflow
   ```
2. Then push:
   ```bash
   git push origin main
   ```

## After Workflows Are Created

Once the workflows are in the repository, you can monitor them:

```bash
# List all workflows
gh workflow list

# View recent runs
gh run list

# Watch a specific run
gh run watch <run-id>

# View workflow details
gh workflow view deploy.yml

# Trigger workflow manually
gh workflow run deploy.yml
```

## Monitor Deployment

Use GitHub CLI directly:

```bash
# Watch the latest run
gh run watch

# List recent runs with details
gh run list --limit 10

# View logs of a specific run
gh run view <run-id> --log
```

