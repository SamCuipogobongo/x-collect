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
console.log("Prerequisite: Actionbook CLI and Chrome Extension must be installed.");
console.log("  1. Install Actionbook CLI: https://actionbook.dev");
console.log("  2. Run: actionbook extension install");
console.log("  3. Load unpacked extension in Chrome (chrome://extensions)");
console.log("  4. Start bridge: actionbook extension serve");
