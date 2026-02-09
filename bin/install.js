#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const SKILL_NAME = "x-collect";
const SKILL_DIR = path.join(os.homedir(), ".claude", "skills", SKILL_NAME);
const SKILL_SRC = path.join(__dirname, "..", "SKILL.md");

// Ensure skill directory exists
fs.mkdirSync(SKILL_DIR, { recursive: true });

// Copy SKILL.md
fs.copyFileSync(SKILL_SRC, path.join(SKILL_DIR, "SKILL.md"));

console.log(`Installed ${SKILL_NAME} skill to ${SKILL_DIR}/SKILL.md`);
console.log("");
console.log("Usage: /x-collect [topic]");
console.log("");
console.log("Prerequisite: Playwright MCP must be configured in Claude Code.");
console.log("  claude mcp add --scope user playwright -- npx @playwright/mcp@latest");
