#!/bin/bash
set -euo pipefail

RUNNER_USER="ec2-user"
RUNNER_DIR="/home/$RUNNER_USER/actions-runner"
RUNNER_VERSION="${runner_version}"

# --- Install dependencies (curl-minimal is pre-installed on AL2023) ---
dnf install -y jq libicu tar gzip git

# --- Install Node.js 20 + pnpm (needed by migration jobs) ---
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
npm install -g pnpm@9

# --- Fetch GitHub PAT from Secrets Manager ---
PAT=$(aws secretsmanager get-secret-value \
  --region "${aws_region}" \
  --secret-id "${runner_pat_secret_name}" \
  --query SecretString --output text)

# --- Get a short-lived registration token from the GitHub API ---
REG_TOKEN=$(curl -sf -X POST \
  -H "Authorization: token $PAT" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${github_owner}/${github_repo}/actions/runners/registration-token" \
  | jq -r '.token')

# --- Download and extract the runner agent ---
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"
curl -sfL "https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-linux-x64-$RUNNER_VERSION.tar.gz" \
  | tar xz
chown -R "$RUNNER_USER:$RUNNER_USER" "$RUNNER_DIR"

# --- Configure the runner (as non-root) ---
su - "$RUNNER_USER" -c "cd $RUNNER_DIR && ./config.sh \
  --url https://github.com/${github_owner}/${github_repo} \
  --token $REG_TOKEN \
  --name ${runner_name} \
  --labels ${runner_labels} \
  --unattended \
  --replace"

# --- Install and start as a systemd service ---
cd "$RUNNER_DIR"
./svc.sh install "$RUNNER_USER"
./svc.sh start
