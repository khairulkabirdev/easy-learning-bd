#!/usr/bin/env node
"use strict";

// Rename package metadata without replacing the user's existing dependencies,
// generated package-lock graph, environment variables, or database files.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const name = "elesson"; // npm package names must be lowercase.

function renamePackageFile(fileName, updateLockRoot = false) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) {
    if (updateLockRoot) {
      console.log(`${fileName}: not found, skipping`);
      return;
    }
    throw new Error(`${fileName} was not found. Run this script inside your project.`);
  }
  const content = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(content);
  if (!data || typeof data !== "object" || typeof data.name !== "string") {
    throw new Error(`${fileName} has invalid package metadata.`);
  }
  data.name = name;
  if (updateLockRoot) {
    if (!data.packages || !data.packages[""]) {
      throw new Error(`${fileName} is missing its root package entry.`);
    }
    data.packages[""].name = name;
  }
  const updated = JSON.stringify(data, null, 2) + "\n";
  if (content !== updated) {
    fs.writeFileSync(filePath, updated, "utf8");
  }
  console.log(`${fileName}: renamed to ${name}`);
}

renamePackageFile("package.json");
renamePackageFile("package-lock.json", true);

const readme = path.join(root, "README.md");
if (fs.existsSync(readme)) {
  const original = fs.readFileSync(readme, "utf8");
  const updated = original.replace(/^# (?:Easy Learning BD|EasyLearningBD|easy-learning-bd)\s*$/m, "# eLesson");
  if (updated !== original) {
    fs.writeFileSync(readme, updated, "utf8");
    console.log("README.md: updated project heading");
  }
}
console.log("Finished. No dependencies, routes, database, or secrets were changed.");
