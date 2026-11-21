#!/usr/bin/env node
/**
 * eLesson — Non-destructive import of four original Class 6 English 1st Paper model tests.
 * Preview: node scripts/import-class6-english1-models.cjs
 * Apply:   node scripts/import-class6-english1-models.cjs --apply
 *
 * Prerequisite: run `npm run prepare:sqlite` once in the existing app.
 * No migration, reseed, updateMany, deletion or replacement is performed.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "model-question-samples", "2026-class6-english1");
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const CLASS_ID = "cmsfttz2r0002tejwe6c25h5f";
const SUBJECT_ID = "cmsfttz6z001mtejwvrd34v0y";

function loadEnv() {
  const filename = path.join(root, ".env");
  if (!fs.existsSync(filename)) return;
  for (const line of fs.readFileSync(filename, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([\w]+)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    process.env[m[1]] = value;
  }
}
function readPapers() {
  const papers = [1, 2, 3, 4].map((n) => JSON.parse(fs.readFileSync(path.join(dataDir, `model-test-${String(n).padStart(2,"0")}.json`), "utf8")));
  const unique = new Set();
  for (const p of papers) {
    if (unique.has(p.name)) throw Error(`Duplicate name: ${p.name}`);
    unique.add(p.name);
    if (p.marks?.total !== 100 || p.marks?.reading !== 70 || p.marks?.writing !== 30) throw Error("Paper marks not 100=70+30");
    const counts = {mcq:7, qa:5, gaps:5, gapAnswers:5, vocab:5, info:5, tf:5, table:5, rearrange:8, poemqa:8, writing:3};
    for (const [key, expected] of Object.entries(counts)) if (p[key]?.length !== expected) throw Error(`${p.name}: expected ${expected} ${key}`);
    if ([...p.rearrange_order].sort((a,b)=>a-b).join(",") !== "0,1,2,3,4,5,6,7") throw Error(`${p.name}: invalid rearrange solution`);
    if (p.mcq.some(([_,options,correct]) => options.length !== 4 || correct < 0 || correct > 3)) throw Error(`${p.name}: invalid MCQ`);
    if (p.vocab.some((row) => !["synonym", "antonym"].includes(row[3]))) throw Error(`${p.name}: invalid vocabulary choice`);
  }
  return papers;
}
const escapeHtml = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const para = (s) => `<p>${escapeHtml(s)}</p>`;
const makeRows = (values) => values.map(([question,answer],i) => ({id:`entry-${i+1}`,sortOrder:i,question,answer}));
function makeMcq(p) {
  return JSON.stringify({questions:p.mcq.map(([prompt,options,answer],i)=>({
    id:`mcq-${i+1}`,prompt,answerMode:"single",sortOrder:i,
    options:options.map((text,j)=>({id:`option-${i+1}-${j+1}`,label:String.fromCharCode(65+j),text,isCorrect:j===answer,sortOrder:j}))
  }))});
}
function makeTable(p) {
  const col1="model-col-topic", col2="model-col-detail";
  return JSON.stringify({version:2,
    columns:[{id:col1,label:"Item",sortOrder:0},{id:col2,label:"Information",sortOrder:1}],
    rows:p.table.map(([topic,answer],i)=>({id:`table-row-${i+1}`,sortOrder:i,cells:[
      {id:`table-topic-${i+1}`,columnId:col1,mode:"text",text:topic,answer:""},
      {id:`table-answer-${i+1}`,columnId:col2,mode:"answer",text:"",answer}
    ]})),answers:[]});
}
function makeRearrange(p) {
  const rows=p.rearrange.map((question,i)=>({id:`sentence-${i+1}`,sortOrder:i,question,answer:""}));
  const ids=p.rearrange_order.map((i)=>rows[i].id);
  return JSON.stringify({version:2,rows,correctOrder:ids,
    answerSequence:p.rearrange_order.map(i=>String.fromCharCode(97+i)).join(", ")});
}
function sqliteFilePath() {
  if (!process.env.DATABASE_URL?.startsWith("file:")) {
    throw Error("DATABASE_URL must point to the existing SQLite database (file:...). Import aborted.");
  }
  const encoded = process.env.DATABASE_URL.substring(5).split("?")[0];
  const target = decodeURIComponent(encoded);
  const resolved = path.isAbsolute(target) ? target : path.resolve(root,"prisma",target);
  if (!fs.existsSync(resolved)) throw Error(`SQLite database not found at ${resolved}. Nothing was changed. Check DATABASE_URL.`);
  return resolved;
}
async function backupDb(prisma, original) {
  const dirname=path.join(path.dirname(original),"model-question-backups");
  fs.mkdirSync(dirname,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  const dest=path.join(dirname,`pre-class6-model-import-${stamp}.db`);
  // SQLite VACUUM INTO makes a consistent live snapshot even if WAL mode is enabled.
  // Abort before writing any questions if the backup fails.
  await prisma.$executeRawUnsafe(`VACUUM INTO '${dest.replace(/'/g,"''")}'`);
  if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) throw Error("Backup verification failed; import aborted.");
  return dest;
}
function base(ctx,blockId) {
  return {contentBlockId:blockId, contentId:ctx.contentId, classId:ctx.classId,
    subjectId:ctx.subjectId,unitId:ctx.unitId,lessonId:ctx.lessonId,topicId:null,
    organizationId:ctx.organizationId, createdBy:ctx.adminId, updatedBy:ctx.adminId};
}
async function addBlock(tx,ctx,kind,order,create) {
  const block=await tx.contentBlock.create({data:{contentId:ctx.contentId,kind,sortOrder:order,
    boardId:ctx.boardId??null,academicYearId:ctx.yearId??null},select:{id:true}});
  const b=base(ctx,block.id);
  await create(block.id,b);
  return block.id;
}
async function createPaper(tx, p, ctx, supportsAnswerType) {
  const set=await tx.modelQuestionSet.create({data:{
    classId:ctx.classId,subjectId:ctx.subjectId,boardId:null,academicYearId:ctx.yearId,
    name:p.name,organizationId:ctx.organizationId,createdBy:ctx.adminId,updatedBy:ctx.adminId
  },select:{id:true}});
  const unitSlug=`elesson-model-questions-${ctx.subjectId}-unit`;
  const unit=await tx.unit.upsert({where:{slug:unitSlug},create:{
    classId:ctx.classId,subjectId:ctx.subjectId,title:"Model Questions — Internal Workspace",slug:unitSlug,
    status:"draft",organizationId:ctx.organizationId,createdBy:ctx.adminId,updatedBy:ctx.adminId
  },update:{},select:{id:true,classId:true,subjectId:true,organizationId:true}});
  if (unit.organizationId!==ctx.organizationId || unit.classId!==ctx.classId || unit.subjectId!==ctx.subjectId) throw Error("Existing model-question workspace is owned by another context; aborted.");
  const lesson=await tx.lesson.create({data:{
    unitId:unit.id,title:`Model Question — ${p.name}`,slug:`elesson-model-question-set-${set.id}-lesson`,
    status:"draft",organizationId:ctx.organizationId,createdBy:ctx.adminId,updatedBy:ctx.adminId
  },select:{id:true}});
  const content=await tx.content.create({data:{title:p.name,classId:ctx.classId,subjectId:ctx.subjectId,unitId:unit.id,lessonId:lesson.id,
    organizationId:ctx.organizationId,createdBy:ctx.adminId,updatedBy:ctx.adminId},select:{id:true}});
  const link=await tx.modelQuestionSet.updateMany({where:{id:set.id,editorContentId:null},
    data:{editorContentId:content.id,updatedBy:ctx.adminId}});
  if (link.count!==1) throw Error("Could not link editor content. Import rolled back.");
  const section={...ctx,contentId:content.id,unitId:unit.id,lessonId:lesson.id};
  const passage1=await addBlock(tx,section,"seen-passage-one",0,async(_,b)=>tx.seenPassageOne.create({data:{...b,body:para(p.p1)}}));
  await addBlock(tx,section,"mcq",1,async(_,b)=>tx.mcqSection.create({data:{...b,title:"Multiple Choice Questions — 7 marks",description:"Choose the correct answer. Each question carries 1 mark.",passageSource:"paragraph",paragraphBlockId:passage1,documentJson:makeMcq(p)}}));
  await addBlock(tx,section,"question-answer",2,async(_,b)=>tx.questionAnswerExercise.create({data:{...b,title:"Answering Questions — 10 marks",instruction:"Answer all five questions. 2 marks each.",documentJson:JSON.stringify({version:2,passageSource:"paragraph",paragraphBlockId:passage1,rows:makeRows(p.qa)}),question:"",answer:"",details:""}}));
  const passage2=await addBlock(tx,section,"seen-passage-two",3,async(_,b)=>tx.seenPassageTwo.create({data:{...b,body:para(p.p2)}}));
  const blanks=p.gapAnswers.map((answer,i)=>({id:`blank-${i+1}`,sortOrder:i,answer}));
  await addBlock(tx,section,"gap-fill-first-paper",4,async(_,b)=>tx.gapFillFirstPaper.create({data:{...b,passageSource:"paragraph",paragraphBlockId:passage2,
    question:p.gaps.map((s,i)=>`<p>${i+1}. ${escapeHtml(s.replace(/_{4,}/g,"_____"))}</p>`).join(""),
    answer:JSON.stringify({version:1,blanks}),details:"1 mark for each correct answer."}}));
  await addBlock(tx,section,"synonyms-antonyms",5,async(_,b)=>{
    const vocab=await tx.synonymsAntonyms.create({data:{...b,passageSource:"paragraph",paragraphBlockId:passage2},select:{id:true}});
    for (const [i,[word,synonyms,antonyms,answerType]] of p.vocab.entries()) {
      const entry=await tx.synonymsAntonymsEntry.create({data:{synonymsAntonymsId:vocab.id,word,meanings:"",synonyms,antonyms,
        details:"1 mark — give the indicated synonym or antonym.",sortOrder:i,organizationId:ctx.organizationId,
        createdBy:ctx.adminId,updatedBy:ctx.adminId},select:{id:true}});
      if (supportsAnswerType) await tx.$executeRawUnsafe('UPDATE "SynonymsAntonymsEntry" SET "answerType" = ? WHERE "id" = ?',answerType,entry.id);
    }
  });
  const unseen=await addBlock(tx,section,"paragraph",6,async(_,b)=>tx.paragraph.create({data:{...b,body:para(p.unseen)}}));
  await addBlock(tx,section,"information-transfer",7,async(_,b)=>tx.informationTransfer.create({data:{...b,
    passageSource:"paragraph",paragraphBlockId:unseen,question:"Complete the table with information from the unseen passage (5 marks).",answer:"",details:"",
    documentJson:JSON.stringify({version:2,passageSource:"paragraph",paragraphBlockId:unseen,
      rows:p.info.map(([term,answer],i)=>({id:`info-${i+1}`,sortOrder:i,term,answer}))})}}));
  await addBlock(tx,section,"true-false",8,async(_,b)=>tx.trueFalseExercise.create({data:{...b,
    title:"True or False — 5 marks",instruction:"Write True or False. Correct the false statements.",passage:para(p.unseen),
    documentJson:JSON.stringify({rows:p.tf.map(([statement,expectedAnswer,correction],i)=>({id:`tf-${i+1}`,sortOrder:i,statement,expectedAnswer,correction}))})}}));
  await addBlock(tx,section,"writing-summary",9,async(_,b)=>tx.questionAnswerExercise.create({data:{...b,
    title:"Summary — 10 marks",instruction:"Write a short summary of the unseen passage in your own words.",
    question:"Summarize the unseen passage.",answer:p.summary,details:"Sample summary (other accurate summaries are acceptable).",
    documentJson:JSON.stringify({version:2,passageSource:"paragraph",paragraphBlockId:unseen,
      rows:[{id:"summary",sortOrder:0,question:"Write a summary of the unseen passage.",answer:p.summary}]})}}));
  await addBlock(tx,section,"table-completion",10,async(_,b)=>tx.tableCompletionExercise.create({data:{...b,title:"Matching / Table Completion — 5 marks",
    instruction:"Complete five pieces of information using the passages above.",question:"Complete the table.",answer:"",details:"",
    documentJson:makeTable(p)}}));
  await addBlock(tx,section,"rearrange-sentence",11,async(_,b)=>tx.rearrangeSentenceExercise.create({data:{...b,
    title:"Rearrange Sentences — 8 marks",instruction:"Write the correct letter sequence to make a story.",
    question:"Rearrange these eight sentences into a logical story.",
    answer:p.rearrange_order.map(i=>String.fromCharCode(97+i)).join(", "),details:"",
    documentJson:makeRearrange(p)}}));
  await addBlock(tx,section,"question-from-poems",12,async(_,b)=>tx.questionFromPoems.create({data:{...b,
    title:"Questions from an Original Practice Poem — 10 marks",
    instruction:"Answer any five out of eight questions. Each question carries 2 marks.",
    question:p.poem.map(escapeHtml).join("<br />"),answer:"",details:"Original practice poem, not an EFT textbook excerpt.",
    documentJson:JSON.stringify({version:2,rows:makeRows(p.poemqa)})}}));
  for (const [i,kind,title] of [[0,"completing-story","Completing Story"],[1,"paragraph","Paragraph Writing"],[2,"dialogue","Dialogue Writing"]]) {
    await tx.modelQuestionSetBlock.create({data:{setId:set.id,kind,title,question:p.writing[i],
      instructions:"Part B: Writing Test. This item carries 10 marks. Teacher-assessed.",
      passage:"",optionsJson:"[]",answer:"",marks:10,sortOrder:i,
      organizationId:ctx.organizationId,createdBy:ctx.adminId,updatedBy:ctx.adminId}});
  }
  return {setId:set.id,editorContentId:content.id};
}
async function main() {
  loadEnv();
  const papers=readPapers();
  const {PrismaClient}=require(path.join(root,"generated","prisma","client"));
  const prisma=new PrismaClient();
  try {
    const cls=await prisma.class.findUnique({where:{id:CLASS_ID},select:{name:true,organizationId:true}});
    const sub=await prisma.subject.findFirst({where:{id:SUBJECT_ID,classId:CLASS_ID},
      select:{name:true,slug:true,code:true,organizationId:true}});
    if (!cls || !sub || cls.organizationId!==sub.organizationId) throw Error("Given Class 6 / English 1st Paper IDs were not found in the current database; no data changed.");
    const classText=cls.name.toLowerCase();
    if (!/(?:\b6\b|six|sixth|৬|ষষ্ঠ)/i.test(classText)) throw Error(`Class name ${cls.name} does not look like Class 6. Stop to prevent importing to another class.`);
    if (!/english|ইংরেজি/i.test([sub.name,sub.slug,sub.code].join(" "))) throw Error(`Subject ${sub.name} does not look like English. Stop.`);
    if (/2nd|second|দ্বিতীয়|দ্বিতীয়|\b108\b/i.test([sub.name,sub.slug,sub.code].join(" "))) throw Error(`Subject ${sub.name} appears to be English 2nd Paper. Stop.`);
    const admin=await prisma.user.findFirst({where:{organizationId:cls.organizationId,role:"admin"},orderBy:{createdAt:"asc"},select:{id:true}});
    if (!admin) throw Error("No admin account in this organization; no data changed.");
    const year=await prisma.academicYear.findFirst({where:{organizationId:cls.organizationId,year:2026},select:{id:true}});
    const existing=await prisma.modelQuestionSet.findMany({where:{organizationId:cls.organizationId,classId:CLASS_ID,subjectId:SUBJECT_ID,
      name:{in:papers.map(p=>p.name)}},select:{name:true,id:true}});
    const seen=new Set(existing.map(p=>p.name));
    const pending=papers.filter(p=>!seen.has(p.name));
    console.log(`eLesson target: ${cls.name} / ${sub.name}`);
    console.log(`Existing matching model sets (will NOT change): ${existing.length}`);
    for (const p of papers) console.log(`${seen.has(p.name)?"SKIP":APPLY?"ADD ":"PLAN"}: ${p.name}`);
    if (!APPLY) {
      console.log("\nPreview only. No database writes. To import, stop the dev server, then run:\n  node scripts/import-class6-english1-models.cjs --apply");
      return;
    }
    if (!pending.length) {console.log("Nothing new to import; existing sets untouched.");return;}
    const db=sqliteFilePath();
    console.log(`Database: ${db}`);
    const backup=await backupDb(prisma,db);
    console.log(`Verified full database backup: ${backup}`);
    const tableInfo=await prisma.$queryRawUnsafe('PRAGMA table_info("SynonymsAntonymsEntry")');
    const supportsAnswerType=tableInfo.some(r=>r.name==="answerType");
    const ctx={classId:CLASS_ID,subjectId:SUBJECT_ID,yearId:year?.id??null,organizationId:cls.organizationId,adminId:admin.id};
    for (const p of pending) {
      try {
        const result=await prisma.$transaction(async(tx)=>{
          const duplicate=await tx.modelQuestionSet.findFirst({where:{name:p.name,organizationId:ctx.organizationId,classId:ctx.classId,subjectId:ctx.subjectId},select:{id:true}});
          if (duplicate) return {skipped:true};
          return createPaper(tx,p,ctx,supportsAnswerType);
        },{maxWait:10000,timeout:120000});
        console.log(result.skipped ? `SKIPPED existing: ${p.name}` : `IMPORTED: ${p.name} (set ${result.setId})`);
      } catch(e) { console.error(`IMPORT ERROR for ${p.name}. The current paper was rolled back: ${e.message}`); process.exitCode=1; break; }
    }
    console.log("\nAdmin list: http://localhost:3000/admin/model-question-import/"+CLASS_ID+"/"+SUBJECT_ID);
    console.log("The four sets are drafts; publication is a separate admin action.");
  } finally {await prisma.$disconnect();}
}
main().catch((error)=>{console.error("Stopped safely:",error.message);process.exitCode=1;});
