"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const MODEL_DEFINITIONS = {
  "ModelQuestionImport": "model ModelQuestionImport {\n  id             String   @id @default(cuid())\n  classId        String\n  subjectId      String\n  boardId        String?\n  academicYearId String?\n  fileId         String   @unique\n  title          String\n  status         String   @default(\"file_uploaded\")\n  questionsJson  String   @default(\"[]\")\n  questionCount  Int      @default(0)\n  organizationId String\n  createdBy      String\n  updatedBy      String\n  createdAt      DateTime @default(now())\n  updatedAt      DateTime @updatedAt\n\n  class          Class        @relation(fields: [classId], references: [id], onDelete: Cascade)\n  subject        Subject      @relation(fields: [subjectId], references: [id], onDelete: Cascade)\n  board          Board?       @relation(fields: [boardId], references: [id], onDelete: SetNull)\n  academicYear   AcademicYear? @relation(fields: [academicYearId], references: [id], onDelete: SetNull)\n  file           UploadedFile @relation(fields: [fileId], references: [id], onDelete: Cascade)\n\n  @@index([organizationId, classId, subjectId, createdAt])\n  @@index([organizationId, classId, subjectId, boardId, academicYearId])\n}",
  "ModelQuestionSet": "model ModelQuestionSet {\n  id             String   @id @default(cuid())\n  classId        String\n  subjectId      String\n  boardId        String?\n  academicYearId String?\n  name           String\n  editorContentId String? @unique\n  organizationId String\n  createdBy      String\n  updatedBy      String\n  createdAt      DateTime @default(now())\n  updatedAt      DateTime @updatedAt\n\n  class          Class        @relation(fields: [classId], references: [id], onDelete: Cascade)\n  subject        Subject      @relation(fields: [subjectId], references: [id], onDelete: Cascade)\n  board          Board?       @relation(fields: [boardId], references: [id], onDelete: SetNull)\n  academicYear   AcademicYear? @relation(fields: [academicYearId], references: [id], onDelete: SetNull)\n  blocks         ModelQuestionSetBlock[]\n\n  @@index([organizationId, classId, subjectId, createdAt])\n  @@index([organizationId, classId, subjectId, boardId, academicYearId])\n}",
  "ModelQuestionSetBlock": "model ModelQuestionSetBlock {\n  id             String   @id @default(cuid())\n  setId          String\n  kind           String\n  title          String\n  instructions   String   @default(\"\")\n  passage        String   @default(\"\")\n  question       String\n  optionsJson    String   @default(\"[]\")\n  answer         String   @default(\"\")\n  marks          Int      @default(1)\n  sortOrder      Int      @default(0)\n  organizationId String\n  createdBy      String\n  updatedBy      String\n  createdAt      DateTime @default(now())\n  updatedAt      DateTime @updatedAt\n\n  set            ModelQuestionSet @relation(fields: [setId], references: [id], onDelete: Cascade)\n\n  @@index([organizationId, setId, sortOrder])\n}",
  "SubjectPartsOfSpeechBlock": "model SubjectPartsOfSpeechBlock {\n  id             String   @id @default(cuid())\n  classId        String\n  subjectId      String\n  kind           String   @default(\"parts-of-speech\")\n  boardId        String?\n  academicYearId String?\n  title          String   @default(\"\")\n  instruction    String   @default(\"\")\n  details        String   @default(\"\")\n  documentJson   String   @default(\"{}\")\n  sortOrder      Int      @default(0)\n  organizationId String\n  createdBy      String\n  updatedBy      String\n  createdAt      DateTime @default(now())\n  updatedAt      DateTime @updatedAt\n\n  @@index([organizationId, classId, subjectId, kind, sortOrder])\n  @@index([organizationId, boardId, academicYearId])\n}"
};
const relations = {
  Class: [["modelQuestionImports", "ModelQuestionImport[]"], ["modelQuestionSets", "ModelQuestionSet[]"]],
  Subject: [["modelQuestionImports", "ModelQuestionImport[]"], ["modelQuestionSets", "ModelQuestionSet[]"]],
  Board: [["modelQuestionImports", "ModelQuestionImport[]"], ["modelQuestionSets", "ModelQuestionSet[]"]],
  AcademicYear: [["modelQuestionImports", "ModelQuestionImport[]"], ["modelQuestionSets", "ModelQuestionSet[]"]],
  UploadedFile: [["modelQuestionImport", "ModelQuestionImport?"]],
};

function modelPattern(name) {
  return new RegExp(`^model[ \\t]+${name}[ \\t]*\\{[^\\r\\n]*\\r?\\n[\\s\\S]*?^\\}`, "m");
}

function changeModel(schema, name, change) {
  const pattern = modelPattern(name);
  if (!pattern.test(schema)) throw new Error(`Required Prisma model is missing: ${name}.`);
  return schema.replace(pattern, change);
}

function mergeSchema(original) {
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  let schema = original;
  const withNewlines = (value) => value.replace(/\r?\n/g, newline);
  for (const [name, definition] of Object.entries(MODEL_DEFINITIONS)) {
    if (!modelPattern(name).test(schema)) {
      schema += (schema.endsWith(newline) ? newline : newline + newline) + withNewlines(definition) + newline;
    }
  }

  for (const [name, fields] of Object.entries(relations)) {
    schema = changeModel(schema, name, (model) => {
      const additions = [];
      for (const [field, type] of fields) {
        const rows = model.split(/\r?\n/).map((line) => line.trim().split(/\s+/));
        if (rows.some(([existingField, existingType]) => existingField === field && existingType !== type)) {
          throw new Error(`${name}.${field} has an unexpected type. No schema changes were made.`);
        }
        // An existing inverse relation may have a project-specific field name.
        if (!rows.some(([, existingType]) => existingType === type)) additions.push(`  ${field} ${type}`);
      }
      return additions.length ? model.replace(/\}$/, () => additions.join(newline) + newline + "}") : model;
    });
  }

  return changeModel(schema, "ModelQuestionSet", (model) => {
    const field = model.match(/^[ \t]*editorContentId[ \t]+([^\r\n]+)$/m);
    if (!field) {
      return model.replace(/\}$/, () => `  editorContentId String? @unique${newline}}`);
    }
    if (!/^String\?(?:\s|$)/.test(field[1])) {
      throw new Error("ModelQuestionSet.editorContentId has an unexpected type. No schema changes were made.");
    }
    if (/@unique\b/.test(field[1]) || /@@unique\(\[editorContentId\]/.test(model)) return model;
    return model.replace(field[0], (line) => line.replace(/String\?/, "String? @unique"));
  });
}

function runPrisma(root, cli, ...args) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma ${args[0]} failed. No database operation was run.`);
}

function main() {
  const root = path.resolve(__dirname, "..");
  const schemaFile = path.join(root, "prisma", "schema.prisma");
  const original = fs.readFileSync(schemaFile, "utf8");
  const merged = mergeSchema(original);
  const prismaPackage = require.resolve("prisma/package.json", { paths: [root] });
  const bin = JSON.parse(fs.readFileSync(prismaPackage, "utf8")).bin;
  const prismaCli = path.resolve(path.dirname(prismaPackage), typeof bin === "string" ? bin : bin.prisma);
  const prismaDir = path.dirname(schemaFile);

  if (!process.env.DATABASE_URL) {
    try {
      const nextEnv = require(require.resolve("@next/env", { paths: [root] }));
      nextEnv.loadEnvConfig(root, true);
    } catch (error) {
      if (error?.code !== "MODULE_NOT_FOUND") throw error;
      // Prisma itself loads the project's .env.
    }
  }

  if (merged !== original) {
    const checkFile = path.join(prismaDir, `.elesson-schema-repair-${process.pid}.prisma`);
    fs.writeFileSync(checkFile, merged, { flag: "wx" });
    try {
      runPrisma(root, prismaCli, "validate", "--schema", checkFile);
    } finally {
      fs.unlinkSync(checkFile);
    }
    const backupDir = path.join(root, "backups", `prisma-models-${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`);
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(schemaFile, path.join(backupDir, "schema.prisma"));
    fs.writeFileSync(schemaFile, merged, "utf8");
    console.log(`Merged model definitions. Original schema backup: ${backupDir}`);
  } else {
    console.log("Required models already exist in schema.prisma. Regenerating the client.");
  }

  runPrisma(root, prismaCli, "generate", "--schema", schemaFile);
  const { PrismaClient } = require(path.join(root, "generated", "prisma", "client"));
  const client = new PrismaClient();
  for (const delegate of ["modelQuestionImport", "modelQuestionSet", "modelQuestionSetBlock", "subjectPartsOfSpeechBlock"]) {
    if (typeof client[delegate]?.findFirst !== "function") throw new Error(`Missing generated Prisma delegate: ${delegate}.`);
  }
  console.log("All four Prisma models are available. No database tables or records were changed. Restart eLesson.");
}

module.exports = { mergeSchema };
if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
