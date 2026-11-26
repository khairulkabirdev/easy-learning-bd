#!/usr/bin/env node
"use strict";
// eLesson Class 6 English 2nd Paper: source Q1–6 only. Preview unless --apply.
// Node.js 22.13+ (built-in node:sqlite). No extra packages required.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { DatabaseSync, backup } = require('node:sqlite');
const ROOT = path.resolve(__dirname, '..');
const CLASS = 'cmsfttz2r0002tejwe6c25h5f';
const SUBJECT = 'cmup60xz7000pteb0kw54d71j';
const NAME = 'English 2nd Paper — Grammar Model Test (30 Marks)';
// Source questions are transcribed; answer keys are suggested, not official.
const BLOCKS = [
  [
    "parts-of-speech",
    "PartsOfSpeech",
    "Identify the parts of speech of the underlined words in the following passage.",
    "<p>Once there was an ideal woman. She was very active and worked very hard for her <u>living</u>. She had a handsome son, <u>about</u> 18 years of <u>age</u>. He was strong and <u>healthy</u>, but very lazy. He used to <u>idle</u> away his time sitting and eating and did <u>nothing</u> to help his mother. He <u>also</u> ate a heavy meal. In summer, when it was hot he sat <u>outside</u> in the garden; and in winter, <u>when</u> it was cold, he sat inside <u>near</u> the fire.</p>",
    "{\"version\":1,\"items\":[{\"id\":\"word-1\",\"sortOrder\":0,\"word\":\"living\",\"answer\":\"noun\"},{\"id\":\"word-2\",\"sortOrder\":1,\"word\":\"about\",\"answer\":\"adverb\"},{\"id\":\"word-3\",\"sortOrder\":2,\"word\":\"age\",\"answer\":\"noun\"},{\"id\":\"word-4\",\"sortOrder\":3,\"word\":\"healthy\",\"answer\":\"adjective\"},{\"id\":\"word-5\",\"sortOrder\":4,\"word\":\"idle\",\"answer\":\"verb\"},{\"id\":\"word-6\",\"sortOrder\":5,\"word\":\"nothing\",\"answer\":\"pronoun\"},{\"id\":\"word-7\",\"sortOrder\":6,\"word\":\"also\",\"answer\":\"adverb\"},{\"id\":\"word-8\",\"sortOrder\":7,\"word\":\"outside\",\"answer\":\"adverb\"},{\"id\":\"word-9\",\"sortOrder\":8,\"word\":\"when\",\"answer\":\"conjunction\"},{\"id\":\"word-10\",\"sortOrder\":9,\"word\":\"near\",\"answer\":\"preposition\"}]}"
  ],
  [
    "gap-fill-second-paper",
    "GapFillSecondPaper",
    "Fill in the blanks with the words from the box. You may need to change the forms.",
    "<p>people | buy | favourable | in | soon</p><p>grow | too | motherland | a | an</p><p>Our (a) _____ Bangladesh is (b) _____ agricultural country. Most of our (c) _____ are engaged (d) _____ cultivation. Many cultivators are (e) _____ poor to (f) _____ and use modern tools. Still they can (g) _____ bumper crops if the climate is (h) _____. We hope to become (i) _____ developed nation (j) _____.</p>",
    "{\"version\":1,\"blanks\":[{\"id\":\"blank-1\",\"sortOrder\":0,\"answer\":\"motherland\"},{\"id\":\"blank-2\",\"sortOrder\":1,\"answer\":\"an\"},{\"id\":\"blank-3\",\"sortOrder\":2,\"answer\":\"people\"},{\"id\":\"blank-4\",\"sortOrder\":3,\"answer\":\"in\"},{\"id\":\"blank-5\",\"sortOrder\":4,\"answer\":\"too\"},{\"id\":\"blank-6\",\"sortOrder\":5,\"answer\":\"buy\"},{\"id\":\"blank-7\",\"sortOrder\":6,\"answer\":\"grow\"},{\"id\":\"blank-8\",\"sortOrder\":7,\"answer\":\"favourable\"},{\"id\":\"blank-9\",\"sortOrder\":8,\"answer\":\"a\"},{\"id\":\"blank-10\",\"sortOrder\":9,\"answer\":\"soon\"}]}"
  ],
  [
    "substitution-table",
    "SubstitutionTable",
    "Make five sentences using parts of sentences from each column of the table below.",
    "",
    "{\"version\":1,\"columns\":[{\"id\":\"col-0\",\"label\":\"Column A\",\"sortOrder\":0},{\"id\":\"col-1\",\"label\":\"Column B\",\"sortOrder\":1},{\"id\":\"col-2\",\"label\":\"Column C\",\"sortOrder\":2}],\"rows\":[{\"id\":\"row-0\",\"sortOrder\":0,\"cells\":[{\"id\":\"cell-0-0\",\"columnId\":\"col-0\",\"text\":\"An honest man\"},{\"id\":\"cell-0-1\",\"columnId\":\"col-1\",\"text\":\"are\"},{\"id\":\"cell-0-2\",\"columnId\":\"col-2\",\"text\":\"also loved by everybody.\"}]},{\"id\":\"row-1\",\"sortOrder\":1,\"cells\":[{\"id\":\"cell-1-0\",\"columnId\":\"col-0\",\"text\":\"A truthful man\"},{\"id\":\"cell-1-1\",\"columnId\":\"col-1\",\"text\":\"should\"},{\"id\":\"cell-1-2\",\"columnId\":\"col-2\",\"text\":\"loved or respected by anybody.\"}]},{\"id\":\"row-2\",\"sortOrder\":2,\"cells\":[{\"id\":\"cell-2-0\",\"columnId\":\"col-0\",\"text\":\"A dishonest man\"},{\"id\":\"cell-2-1\",\"columnId\":\"col-1\",\"text\":\"is not\"},{\"id\":\"cell-2-2\",\"columnId\":\"col-2\",\"text\":\"hated by all.\"}]},{\"id\":\"row-3\",\"sortOrder\":3,\"cells\":[{\"id\":\"cell-3-0\",\"columnId\":\"col-0\",\"text\":\"The untruthful\"},{\"id\":\"cell-3-1\",\"columnId\":\"col-1\",\"text\":\"is\"},{\"id\":\"cell-3-2\",\"columnId\":\"col-2\",\"text\":\"respected by all.\"}]},{\"id\":\"row-4\",\"sortOrder\":4,\"cells\":[{\"id\":\"cell-4-0\",\"columnId\":\"col-0\",\"text\":\"We\"},{\"id\":\"cell-4-1\",\"columnId\":\"col-1\",\"text\":\"\"},{\"id\":\"cell-4-2\",\"columnId\":\"col-2\",\"text\":\"develop the habit of speaking the truth from our childhood.\"}]}],\"answers\":[{\"id\":\"answer-0\",\"sortOrder\":0,\"selections\":[{\"columnId\":\"col-0\",\"cellId\":\"cell-0-0\"},{\"columnId\":\"col-1\",\"cellId\":\"cell-3-1\"},{\"columnId\":\"col-2\",\"cellId\":\"cell-3-2\"}],\"sentence\":\"An honest man is respected by all.\"},{\"id\":\"answer-1\",\"sortOrder\":1,\"selections\":[{\"columnId\":\"col-0\",\"cellId\":\"cell-1-0\"},{\"columnId\":\"col-1\",\"cellId\":\"cell-3-1\"},{\"columnId\":\"col-2\",\"cellId\":\"cell-0-2\"}],\"sentence\":\"A truthful man is also loved by everybody.\"},{\"id\":\"answer-2\",\"sortOrder\":2,\"selections\":[{\"columnId\":\"col-0\",\"cellId\":\"cell-2-0\"},{\"columnId\":\"col-1\",\"cellId\":\"cell-2-1\"},{\"columnId\":\"col-2\",\"cellId\":\"cell-1-2\"}],\"sentence\":\"A dishonest man is not loved or respected by anybody.\"},{\"id\":\"answer-3\",\"sortOrder\":3,\"selections\":[{\"columnId\":\"col-0\",\"cellId\":\"cell-3-0\"},{\"columnId\":\"col-1\",\"cellId\":\"cell-0-1\"},{\"columnId\":\"col-2\",\"cellId\":\"cell-2-2\"}],\"sentence\":\"The untruthful are hated by all.\"},{\"id\":\"answer-4\",\"sortOrder\":4,\"selections\":[{\"columnId\":\"col-0\",\"cellId\":\"cell-4-0\"},{\"columnId\":\"col-1\",\"cellId\":\"cell-1-1\"},{\"columnId\":\"col-2\",\"cellId\":\"cell-4-2\"}],\"sentence\":\"We should develop the habit of speaking the truth from our childhood.\"}]}"
  ],
  [
    "right-form-of-verb",
    "RightFormOfVerb",
    "Complete the following text with right forms of the verbs given in the box.",
    "<p>enjoy | have | possess | spend | telecast</p><p>Television (a) _____ become the most common source of entertainment. At present, millions of people (b) _____ television programmes. Various types of programmes are (c) _____ on numerous channels. Almost all the families (d) _____ a television set today. They (e) _____ their leisure period in watching television.</p>",
    "{\"version\":1,\"blanks\":[{\"id\":\"blank-1\",\"sortOrder\":0,\"answer\":\"has\"},{\"id\":\"blank-2\",\"sortOrder\":1,\"answer\":\"enjoy\"},{\"id\":\"blank-3\",\"sortOrder\":2,\"answer\":\"telecast\"},{\"id\":\"blank-4\",\"sortOrder\":3,\"answer\":\"possess\"},{\"id\":\"blank-5\",\"sortOrder\":4,\"answer\":\"spend\"}]}"
  ],
  [
    "changing-sentence",
    "ChangingSentence",
    "Change the sentence.",
    "",
    "{\"version\":1,\"rows\":[{\"id\":\"change-1\",\"sortOrder\":0,\"question\":\"<p>The farmer was very careless. (Negative)</p>\",\"answer\":\"<p>The farmer was not careful at all.</p>\"},{\"id\":\"change-2\",\"sortOrder\":1,\"question\":\"<p>He will not repair the broken fence. (Past Indefinite/Simple Past)</p>\",\"answer\":\"<p>He did not repair the broken fence.</p>\"},{\"id\":\"change-3\",\"sortOrder\":2,\"question\":\"<p>One day he sat idle before the house. (Interrogative)</p>\",\"answer\":\"<p>Did he not sit idle before the house one day?</p>\"},{\"id\":\"change-4\",\"sortOrder\":3,\"question\":\"<p>Let us help the poor. (Assertive)</p>\",\"answer\":\"<p>We should help the poor.</p>\"},{\"id\":\"change-5\",\"sortOrder\":4,\"question\":\"<p>We hope our farmers will be very active. (Optative)</p>\",\"answer\":\"<p>May our farmers be very active!</p>\"}]}"
  ],
  [
    "punctuation-and-capitalization",
    "PunctuationAndCapitalization",
    "Use capitals and punctuation marks where necessary in the following text.",
    "<p>Why dont you attend classes regularly the teacher said to the boy you cannot expect good result unless you attend classes as i tell you I am sorry sir said the student</p>",
    "<p>“Why don’t you attend classes regularly?” the teacher said to the boy. “You cannot expect good result unless you attend classes as I tell you.” “I am sorry, sir,” said the student.</p>"
  ]
];
const uid = () => randomUUID();
function validate() {
  const expected = ['parts-of-speech','gap-fill-second-paper','substitution-table','right-form-of-verb','changing-sentence','punctuation-and-capitalization'];
  if (BLOCKS.map(b=>b[0]).join('|')!==expected.join('|')) throw Error('Incorrect question structure.');
  const pos=JSON.parse(BLOCKS[0][4]).items;
  if (pos.length!==10 || [...BLOCKS[0][3].matchAll(/<u>(.*?)<\/u>/g)].some((m,i)=>m[1]!==pos[i]?.word)) throw Error('Parts of speech key mismatch.');
  for(const i of [1,3]) if ((BLOCKS[i][3].match(/_{2,}/g)||[]).length!==JSON.parse(BLOCKS[i][4]).blanks.length) throw Error('Blank key mismatch.');
  const sub=JSON.parse(BLOCKS[2][4]);
  if(sub.rows.length!==5||sub.columns.length!==3||sub.answers.length!==5||JSON.parse(BLOCKS[4][4]).rows.length!==5) throw Error('Table or sentence counts incorrect.');
  for(const a of sub.answers) for(const s of a.selections) if(!sub.rows.some(r=>r.cells.some(c=>c.id===s.cellId&&c.columnId===s.columnId&&c.text.trim()))) throw Error('Invalid table selection.');
}
function resolveDb(override) {
  if(override) return path.resolve(override);
  let url=process.env.DATABASE_URL;
  if(!url && fs.existsSync(path.join(ROOT,'.env'))) {
    const m=fs.readFileSync(path.join(ROOT,'.env'),'utf8').match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*?)\s*$/m);
    if(m) url=m[1].replace(/^(['"])(.*)\1$/,'$2');
  }
  if(!url?.startsWith('file:')) throw Error('Set DATABASE_URL=file:... or pass --db PATH.');
  const file=decodeURIComponent(url.slice(5).split('?')[0]);
  return path.isAbsolute(file)?file:path.resolve(ROOT,'prisma',file);
}
async function main(){
  validate();
  const args=process.argv.slice(2);
  if(args.includes('--validate')) {console.log('Validated: 6 sections, 30 marks, 10 underlines, 10 + 5 blanks, 5 substitution answers, 5 sentence changes.');return;}
  const apply=args.includes('--apply');
  const idx=args.indexOf('--db');
  if(idx>=0 && (!args[idx+1] || args[idx+1].startsWith('--'))) throw Error('--db requires a path.');
  const filename=resolveDb(idx>=0?args[idx+1]:null);
  if(!fs.existsSync(filename)||!fs.statSync(filename).isFile()) throw Error('Existing SQLite database not found: '+filename);
  const db=new DatabaseSync(filename,{readOnly:!apply});
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=30000;');
  const one=(sql,...args)=>db.prepare(sql).get(...args);
  const fields=t=>new Set(db.prepare(`PRAGMA table_info("${t}")`).all().map(r=>r.name));
  const insert=(t,v)=>{
    const keys=Object.keys(v); if(keys.some(k=>!fields(t).has(k))) throw Error('Missing database fields: '+t);
    db.prepare(`INSERT INTO "${t}" (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...Object.values(v));
  };
  let transaction=false;
  try {
    const target=one('SELECT c.name AS className,s.name AS subjectName,c.organizationId FROM Class c JOIN Subject s ON s.classId=c.id AND s.organizationId=c.organizationId WHERE c.id=? AND s.id=?',CLASS,SUBJECT);
    if(!target||!/\b6\b|six|৬|ষষ্ঠ/i.test(target.className)||!/2nd|second|দ্বিত/i.test(target.subjectName)) throw Error('Class 6 English 2nd Paper not found. Nothing changed.');
    const org=target.organizationId;
    const admin=one('SELECT id FROM User WHERE organizationId=? AND role=? ORDER BY createdAt LIMIT 1',org,'admin');
    if(!admin) throw Error('No administrator found in target organization.');
    const existing=()=>one('SELECT id FROM ModelQuestionSet WHERE organizationId=? AND classId=? AND subjectId=? AND name=?',org,CLASS,SUBJECT,NAME);
    console.log(`${target.className} / ${target.subjectName}\n${NAME}\n6 sections; 5 marks each; original duration 120 minutes; draft.`);
    if(existing()){ console.log('Already imported; existing records unchanged.');return; }
    if(!apply){console.log('Preview only. Add --apply to insert.');return;}
    if(Object.values(one('PRAGMA quick_check'))[0]!=='ok'||one('PRAGMA foreign_key_check')) throw Error('Existing database integrity problem.');
    if(!['title','marks','shortDescription'].every(k=>fields('ContentBlock').has(k))) throw Error('Apply existing schema updates first.');
    const dir=path.join(path.dirname(filename),'model-question-backups'); fs.mkdirSync(dir,{recursive:true});
    const dest=path.join(dir,`pre-class6-english2-grammar-${new Date().toISOString().replace(/[:.]/g,'-')}-${uid()}.db`);
    await backup(db,dest);
    const copy=new DatabaseSync(dest,{readOnly:true});
    try{if(Object.values(copy.prepare('PRAGMA quick_check').get())[0]!=='ok') throw Error('Backup failed integrity check.');}finally{copy.close();}
    console.log('Backup:',dest);
    db.exec('BEGIN IMMEDIATE');transaction=true;
    if(existing()){db.exec('ROLLBACK');transaction=false;console.log('Already imported by another process.');return;}
    const now=Date.now();
    const common={organizationId:org,createdBy:admin.id,updatedBy:admin.id,createdAt:now,updatedAt:now};
    const scope={classId:CLASS,subjectId:SUBJECT};
    const slug=`elesson-model-questions-${SUBJECT}-unit`;
    const unit=one('SELECT id,classId,subjectId,organizationId FROM Unit WHERE slug=?',slug);
    let unitId=unit?.id;
    if(unit){if(unit.classId!==CLASS||unit.subjectId!==SUBJECT||unit.organizationId!==org)throw Error('Workspace scope mismatch.');}
    else{unitId=uid();insert('Unit',{...common,...scope,id:unitId,slug,title:'Model Questions — Internal Workspace',status:'draft'});}
    const setId=uid(),lessonId=uid(),contentId=uid();
    insert('Lesson',{...common,id:lessonId,unitId,title:'Model Question — '+NAME,slug:`elesson-model-question-set-${setId}-lesson`,status:'draft'});
    const hierarchy={...scope,unitId,lessonId,topicId:null};
    insert('Content',{...common,...hierarchy,id:contentId,title:NAME});
    const meta={...common,...scope,id:setId,name:NAME,editorContentId:contentId,publishedAt:null,boardId:null,academicYearId:null};
    if(fields('ModelQuestionSet').has('durationMinutes'))meta.durationMinutes=120;
    else console.log('Duration column absent; set 120 minutes in admin after dynamic header update.');
    insert('ModelQuestionSet',meta);
    for(const [sortOrder,[kind,table,title,question,answer]] of BLOCKS.entries()){
      const blockId=uid();
      insert('ContentBlock',{id:blockId,contentId,kind,sortOrder,title,shortDescription:'',marks:5,createdAt:now,updatedAt:now,boardId:null,academicYearId:null});
      insert(table,{...common,...hierarchy,id:uid(),contentBlockId:blockId,contentId,question,answer,details:''});
    }
    const check=one('SELECT COUNT(*) AS n,SUM(marks) AS marks FROM ContentBlock WHERE contentId=?',contentId);
    if(check.n!==6||check.marks!==30||one('PRAGMA foreign_key_check'))throw Error('Final import validation failed.');
    db.exec('COMMIT');transaction=false;
    console.log('Imported draft:',setId);console.log(`Admin: /admin/model-question-import/${CLASS}/${SUBJECT}/${setId}`);
  }catch(e){if(transaction)db.exec('ROLLBACK');throw e;}finally{db.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
