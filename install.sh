#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="x-collect"
SKILL_DIR="$HOME/.claude/skills/$SKILL_NAME"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing $SKILL_NAME skill..."

# Create skill directory
mkdir -p "$SKILL_DIR"

# Copy SKILL.md
cp "$SCRIPT_DIR/SKILL.md" "$SKILL_DIR/SKILL.md"

echo "Installed to $SKILL_DIR/SKILL.md"
echo ""
echo "Usage: /x-collect [topic]"
echo ""
echo "Prerequisite: Playwright MCP must be configured in Claude Code."
echo "  claude mcp add --scope user playwright -- npx @playwright/mcp@latest"
