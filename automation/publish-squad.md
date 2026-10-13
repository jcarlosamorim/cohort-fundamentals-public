# Task: Publish Squad to Cohort Downloads

**Task ID:** publish-squad
**Version:** 1.0
**Execution Type:** Hybrid (Claude + gh CLI)
**Purpose:** Publish a squad to the Cohort Fundamentals downloads site as a FIFA-style card
**Prerequisites:** `gh` CLI authenticated, squad folder exists in `squads/`

---

## Overview

One command to publish your squad to the cohort site. Claude reads your squad,
generates a FIFA card score, zips it, and creates a PR via GitHub CLI.

```
*publish-squad {squad-name}

Example: *publish-squad dopamine-learning
```

---

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `squad_name` | string | Yes | Name of the squad folder in `squads/` |

---

## Execution Steps

### Step 1: Validate Squad Exists

```yaml
validation:
  check_folder: "squads/{squad_name}/"
  required_files:
    - config.yaml
    - README.md
  required_dirs:
    - agents/
  optional_dirs:
    - tasks/
    - workflows/
    - templates/
    - checklists/
    - data/
```

**Actions:**
1. Verify `squads/{squad_name}/` exists
2. Verify `config.yaml` and `README.md` exist
3. Verify at least 1 agent in `agents/`
4. Count: agents, tasks, workflows, templates, checklists
5. Read `config.yaml` for metadata
6. Read `README.md` for description

**If validation fails:** Stop and report what's missing.

---

### Step 2: Generate FIFA Card Scoring

**CRITICAL:** This is the AI-powered step. Claude analyzes the squad and generates
structured card data for the FIFA-style download card.

**Read the squad's key files, then generate the card JSON using this scoring criteria:**

```yaml
scoring_criteria:
  rating_formula:
    base: 50
    agents_count:
      "1-3": +10
      "4-7": +20
      "8-12": +30
      "13+": +35
    tasks_count:
      "1-5": +5
      "6-15": +10
      "16+": +15
    has_workflows: +5
    has_templates: +5
    has_checklists: +3
    has_knowledge_base: +3
    has_data_files: +2
    readme_quality:
      "basic (< 50 lines)": +2
      "good (50-150 lines)": +5
      "excellent (> 150 lines)": +8
    config_complete: +2
    voice_dna_present: +3
    commands_defined: +2

  rarity_thresholds:
    "LEGENDARY": "90-99 (gold)"
    "EPIC": "80-89 (purple)"
    "RARE": "70-79 (green)"
    "UNCOMMON": "60-69 (blue)"
    "COMMON": "50-59 (gray)"

  stats_selection:
    # Pick the 4 most relevant stats from this pool:
    available_stats:
      - label: "AGT"
        meaning: "Number of agents"
      - label: "TSK"
        meaning: "Number of tasks"
      - label: "WKF"
        meaning: "Number of workflows"
      - label: "CMD"
        meaning: "Number of commands across agents"
      - label: "TPL"
        meaning: "Number of templates"
      - label: "CHK"
        meaning: "Number of checklists"
      - label: "TIR"
        meaning: "Number of tiers in agent hierarchy"
      - label: "FID"
        meaning: "Estimated fidelity percentage"
      - label: "VOC"
        meaning: "Voice DNA coverage"
      - label: "KB"
        meaning: "Knowledge base size (files)"

  icon_selection:
    # Choose based on squad domain:
    tool: "Development tools, utilities, automation"
    package: "Content creation, transformation pipelines"
    book: "Knowledge, research, analysis"
    code: "Code generation, programming"
    folder: "Organization, management"
    template: "Templates, design systems"

  color_mapping:
    gold: "LEGENDARY (90-99)"
    purple: "EPIC (80-89)"
    green: "RARE (70-79)"
    blue: "UNCOMMON (60-69)"
    gray: "COMMON (50-59)"
```

**Output format - Generate this exact JSON structure:**

```json
{
  "id": "{squad-name}",
  "title": "{Squad Title from config.yaml}",
  "description": "{One-line description, max 120 chars}",
  "type": "ZIP",
  "size": "{calculated after zip}",
  "filename": "{squad-name}.zip",
  "icon": "{selected icon}",
  "color": "{color based on rarity}",
  "rating": "{calculated score}",
  "rarity": "{LEGENDARY|EPIC|RARE|UNCOMMON|COMMON}",
  "stats": [
    { "label": "{STAT1}", "value": "{value}" },
    { "label": "{STAT2}", "value": "{value}" },
    { "label": "{STAT3}", "value": "{value}" },
    { "label": "{STAT4}", "value": "{value}" }
  ],
  "howToUse": [
    "{Step 1 - how to activate/use the squad}",
    "{Step 2}",
    "{Step 3}"
  ],
  "howToInstall": [
    "Diga ao Claude para instalar o {squad-name} que esta na pasta Downloads"
  ]
}
```

**Present the generated card data to the user for approval before proceeding.**

---

### Step 3: Zip the Squad

```bash
# Create zip excluding unnecessary files
cd squads/
zip -r /tmp/{squad-name}.zip {squad-name}/ \
  -x "*.DS_Store" \
  -x "*__pycache__*" \
  -x "*.pyc" \
  -x "*node_modules*" \
  -x "*.git*"

# Calculate size
ZIP_SIZE=$(du -h /tmp/{squad-name}.zip | cut -f1 | xargs)
```

**Update the card JSON `size` field with the actual zip size.**

---

### Step 4: Create PR via GitHub CLI

```bash
# ============================================================
# SETUP: Fork + sparse clone (one-time overhead, fast)
# ============================================================

SQUAD_NAME="{squad-name}"
UPSTREAM_REPO="jcarlosamorim/mmos"
TEMP_DIR=$(mktemp -d)
BRANCH_NAME="submit/${SQUAD_NAME}-$(date +%Y%m%d%H%M)"

# Fork if not already forked (idempotent)
gh repo fork "$UPSTREAM_REPO" --clone=false 2>/dev/null || true

# Get fork user
FORK_USER=$(gh api user -q .login)

# Sync fork with upstream (ensure latest)
gh repo sync "${FORK_USER}/mmos" --source "$UPSTREAM_REPO" 2>/dev/null || true

# Clone sparse (only downloads data - fast!)
git clone --depth 1 --filter=blob:none --sparse \
  "https://github.com/${FORK_USER}/mmos.git" "$TEMP_DIR"

cd "$TEMP_DIR"
git sparse-checkout set \
  outputs/cohort/fundamentals/data \
  outputs/cohort/fundamentals/downloads

# ============================================================
# BRANCH + FILES
# ============================================================

git checkout -b "$BRANCH_NAME"

# Copy zip
cp /tmp/${SQUAD_NAME}.zip outputs/cohort/fundamentals/downloads/

# Update downloads.json - append new entry
# Claude handles this by reading current JSON and appending the new card entry

# ============================================================
# COMMIT + PR
# ============================================================

git add outputs/cohort/fundamentals/downloads/${SQUAD_NAME}.zip
git add outputs/cohort/fundamentals/data/downloads.json
git commit -m "feat: add ${SQUAD_NAME} to cohort downloads"
git push -u origin "$BRANCH_NAME"

# Create PR against upstream
gh pr create \
  --repo "$UPSTREAM_REPO" \
  --title "Add ${SQUAD_NAME} to Cohort Downloads" \
  --body "$(cat <<'PREOF'
## New Squad Submission

**Squad:** ${SQUAD_NAME}
**Rating:** ${RATING} (${RARITY})
**Agents:** ${AGENT_COUNT}

### Card Preview
${CARD_JSON}

### Checklist
- [x] Squad zipped and included
- [x] downloads.json updated with card data
- [x] FIFA card scoring generated by Claude

---
Submitted via `*publish-squad` automation
PREOF
)"

# ============================================================
# CLEANUP
# ============================================================

cd -
rm -rf "$TEMP_DIR"
rm -f /tmp/${SQUAD_NAME}.zip
```

---

### Step 5: Report Success

**Output to user:**

```
Squad published successfully!

Card: {title} ({rating} {rarity})
PR:   {pr_url}
Site: https://fundamentals-theta.vercel.app/#/downloads

Your squad will appear on the downloads page after the PR is reviewed and merged.
```

---

## downloads.json Update Logic

When updating `downloads.json`, Claude must:

1. Read the current `downloads.json` from the cloned repo
2. Parse it as JSON array
3. Check if an entry with the same `id` already exists
   - If yes: Update the existing entry (keep position)
   - If no: Append the new entry to the array
4. Write back formatted JSON (2-space indent)
5. Validate the result is valid JSON before committing

---

## Error Handling

```yaml
errors:
  squad_not_found:
    message: "Squad '{squad_name}' not found in squads/"
    action: "List available squads: ls squads/"

  gh_not_authenticated:
    message: "GitHub CLI not authenticated"
    action: "Run: gh auth login"

  gh_not_installed:
    message: "GitHub CLI not installed"
    action: "Install: brew install gh (Mac) or see https://cli.github.com"

  zip_too_large:
    message: "Squad zip exceeds 10MB limit"
    action: "Review squad for unnecessary files. Max size: 10MB"

  pr_creation_failed:
    message: "Failed to create PR"
    action: "Check gh auth status and try manually"

  fork_failed:
    message: "Failed to fork repository"
    action: "Check GitHub permissions and try: gh repo fork jcarlosamorim/mmos"
```

---

## Validation Criteria

- [ ] Squad folder exists with required files
- [ ] Card JSON has all required fields
- [ ] Rating is between 50-99
- [ ] Stats has exactly 4 entries
- [ ] Zip file created successfully and under 10MB
- [ ] downloads.json is valid JSON after update
- [ ] PR created successfully
- [ ] User was shown card preview before submission

---

_Task Version: 1.0_
_Created: 2026-02-12_
