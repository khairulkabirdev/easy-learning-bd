#!/usr/bin/env python3
"""eLesson: import the supplied Class 6 English 2nd Paper, Q1–6 only.
Preview by default; --apply to insert a draft. Python 3 standard library only.
Run from the project root. Optional --db /absolute/path/to/database.db.
"""
import argparse, datetime, html, json, os, pathlib, re, sqlite3, uuid
ROOT = pathlib.Path(__file__).resolve().parent.parent
CLASS = 'cmsfttz2r0002tejwe6c25h5f'
SUBJECT = 'cmup60xz7000pteb0kw54d71j'
NAME = 'English 2nd Paper — Grammar Model Test (30 Marks)'
def p(s): return '<p>'+html.escape(s)+'</p>'
def js(v): return json.dumps(v, ensure_ascii=False, separators=(',', ':'))
def uid(): return uuid.uuid4().hex
def blanks(values): return js({'version':1,'blanks':[{'id':f'blank-{i+1}','sortOrder':i,'answer':a} for i,a in enumerate(values)]})
# Underlining and order transcribed from the supplied image.
pos = '<p>Once there was an ideal woman. She was very active and worked very hard for her <u>living</u>. She had a handsome son, <u>about</u> 18 years of <u>age</u>. He was strong and <u>healthy</u>, but very lazy. He used to <u>idle</u> away his time sitting and eating and did <u>nothing</u> to help his mother. He <u>also</u> ate a heavy meal. In summer, when it was hot he sat <u>outside</u> in the garden; and in winter, <u>when</u> it was cold, he sat inside <u>near</u> the fire.</p>'
pos_keys=['noun','adverb','noun','adjective','verb','pronoun','adverb','adverb','conjunction','preposition']
pos_answer=js({'version':1,'items':[{'id':f'word-{i+1}','sortOrder':i,'word':w,'answer':a} for i,(w,a) in enumerate(zip(re.findall(r'<u>(.*?)</u>',pos),pos_keys))]})
gap = p('people | buy | favourable | in | soon')+p('grow | too | motherland | a | an')+p('Our (a) _____ Bangladesh is (b) _____ agricultural country. Most of our (c) _____ are engaged (d) _____ cultivation. Many cultivators are (e) _____ poor to (f) _____ and use modern tools. Still they can (g) _____ bumper crops if the climate is (h) _____. We hope to become (i) _____ developed nation (j) _____.')
gap_keys=['motherland','an','people','in','too','buy','grow','favourable','a','soon']
cols=[{'id':f'col-{i}','label':f'Column {chr(65+i)}','sortOrder':i} for i in range(3)]
source_rows=[['An honest man','are','also loved by everybody.'],['A truthful man','should','loved or respected by anybody.'],['A dishonest man','is not','hated by all.'],['The untruthful','is','respected by all.'],['We','','develop the habit of speaking the truth from our childhood.']]
rows=[{'id':f'row-{i}','sortOrder':i,'cells':[{'id':f'cell-{i}-{j}','columnId':cols[j]['id'],'text':s} for j,s in enumerate(r)]} for i,r in enumerate(source_rows)]
# A valid set of five sentences. The existing exercise permits reuse of table parts.
connections=[(0,3,3),(1,3,0),(2,2,1),(3,0,2),(4,1,4)]
answers=[{'id':f'answer-{i}','sortOrder':i,'selections':[{'columnId':cols[j]['id'],'cellId':f'cell-{r}-{j}'} for j,r in enumerate(indices)],'sentence':' '.join(source_rows[r][j] for j,r in enumerate(indices))} for i,indices in enumerate(connections)]
substitution=js({'version':1,'columns':cols,'rows':rows,'answers':answers})
verb=p('enjoy | have | possess | spend | telecast')+p('Television (a) _____ become the most common source of entertainment. At present, millions of people (b) _____ television programmes. Various types of programmes are (c) _____ on numerous channels. Almost all the families (d) _____ a television set today. They (e) _____ their leisure period in watching television.')
# The printed word "become" and auxiliary "are" are already outside the blanks.
verb_keys=['has','enjoy','telecast','possess','spend']
change=[('The farmer was very careless. (Negative)','The farmer was not careful at all.'),('He will not repair the broken fence. (Past Indefinite/Simple Past)','He did not repair the broken fence.'),('One day he sat idle before the house. (Interrogative)','Did he not sit idle before the house one day?'),('Let us help the poor. (Assertive)','We should help the poor.'),('We hope our farmers will be very active. (Optative)','May our farmers be very active!')]
change_answer=js({'version':1,'rows':[{'id':f'change-{i+1}','sortOrder':i,'question':p(q),'answer':p(a)} for i,(q,a) in enumerate(change)]})
punct=p('Why dont you attend classes regularly the teacher said to the boy you cannot expect good result unless you attend classes as i tell you I am sorry sir said the student')
punct_answer=p('“Why don’t you attend classes regularly?” the teacher said to the boy. “You cannot expect good result unless you attend classes as I tell you.” “I am sorry, sir,” said the student.')
# Exact question instructions, no additional Writing questions.
BLOCKS=[
 ('parts-of-speech','PartsOfSpeech','Identify the parts of speech of the underlined words in the following passage.',pos,pos_answer),
 ('gap-fill-second-paper','GapFillSecondPaper','Fill in the blanks with the words from the box. You may need to change the forms.',gap,blanks(gap_keys)),
 ('substitution-table','SubstitutionTable','Make five sentences using parts of sentences from each column of the table below.','',substitution),
 ('right-form-of-verb','RightFormOfVerb','Complete the following text with right forms of the verbs given in the box.',verb,blanks(verb_keys)),
 ('changing-sentence','ChangingSentence','Change the sentence.','',change_answer),
 ('punctuation-and-capitalization','PunctuationAndCapitalization','Use capitals and punctuation marks where necessary in the following text.',punct,punct_answer),
]
def validate():
    assert len(BLOCKS)==6 and len(re.findall(r'<u>.*?</u>',pos))==len(pos_keys)==10
    assert len(re.findall(r'_{2,}',gap))==len(gap_keys)==10
    assert len(re.findall(r'_{2,}',verb))==len(verb_keys)==5
    assert len(answers)==len(change)==5
    assert all(all(source_rows[r][j] for j,r in enumerate(c)) for c in connections)

def database_path(override):
    if override: return pathlib.Path(override).expanduser().resolve()
    url=os.environ.get('DATABASE_URL')
    if not url and (ROOT/'.env').is_file():
        for line in (ROOT/'.env').read_text(encoding='utf-8').splitlines():
            m=re.match(r'^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*?)\s*$',line)
            if m: url=m[1].strip('"\''); break
    if not url or not url.startswith('file:'): raise SystemExit('Set DATABASE_URL to the existing SQLite file, or pass --db PATH.')
    from urllib.parse import unquote
    path=pathlib.Path(unquote(url[5:].split('?')[0])).expanduser()
    return (path if path.is_absolute() else ROOT/'prisma'/path).resolve()

def main():
    arg=argparse.ArgumentParser(description=__doc__); arg.add_argument('--apply',action='store_true'); arg.add_argument('--db'); arg.add_argument('--validate',action='store_true'); a=arg.parse_args(); validate()
    if a.validate: print('Source structure valid: 6 sections, 30 marks, 10 underlines, 10 + 5 blanks, 5 table answers, 5 sentence changes.'); return
    db=database_path(a.db)
    if not db.is_file(): raise SystemExit(f'Database not found: {db}')
    con=sqlite3.connect(db.as_uri()+('?mode=rw' if a.apply else '?mode=ro'),uri=True,timeout=30); con.row_factory=sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    def one(sql,params=()): return con.execute(sql,params).fetchone()
    def fields(table): return {r['name'] for r in con.execute(f'PRAGMA table_info("{table}")')}
    def insert(table,values):
        absent=set(values)-fields(table)
        if absent: raise RuntimeError(f'Missing columns in {table}: {absent}. No import committed.')
        con.execute('INSERT INTO "'+table+'" ('+','.join('"'+k+'"' for k in values)+') VALUES ('+','.join('?' for _ in values)+')',tuple(values.values()))
    try:
        target=one('SELECT c.name AS className,s.name AS subjectName,c.organizationId FROM Class c JOIN Subject s ON s.classId=c.id AND s.organizationId=c.organizationId WHERE c.id=? AND s.id=?',(CLASS,SUBJECT))
        if not target or not re.search(r'\b6\b|six|৬|ষষ্ঠ',target['className'],re.I) or not re.search(r'2nd|second|দ্বিত',target['subjectName'],re.I): raise RuntimeError('Expected Class 6 English 2nd Paper target not found. No changes.')
        org=target['organizationId']; admin=one('SELECT id FROM User WHERE organizationId=? AND role=? ORDER BY createdAt LIMIT 1',(org,'admin'))
        if not admin: raise RuntimeError('No administrator found for target organization.')
        existing=lambda:one('SELECT id FROM ModelQuestionSet WHERE organizationId=? AND classId=? AND subjectId=? AND name=?',(org,CLASS,SUBJECT,NAME))
        print(f'Target: {target["className"]} / {target["subjectName"]}\n{NAME}\n6 sections, 5 marks each; original duration 120 minutes; draft.')
        if existing(): print('Already imported. Existing records untouched.'); return
        if not a.apply: print('Preview only. Run again with --apply to import.'); return
        if one('PRAGMA quick_check')[0]!='ok' or one('PRAGMA foreign_key_check'): raise RuntimeError('Existing database integrity problem. Import aborted.')
        if not {'title','marks','shortDescription'} <= fields('ContentBlock'): raise RuntimeError('Required model question metadata columns missing; apply existing safe schema updates first.')
        backup_dir=db.parent/'model-question-backups'; backup_dir.mkdir(exist_ok=True)
        backup=backup_dir/f'pre-class6-english2-grammar-{datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f")}.db'
        with sqlite3.connect(backup) as dest: con.backup(dest)
        with sqlite3.connect(backup) as dest:
            if dest.execute('PRAGMA quick_check').fetchone()[0]!='ok': raise RuntimeError('Backup failed integrity check.')
        print('Backup:',backup)
        con.execute('BEGIN IMMEDIATE')
        if existing(): con.rollback(); print('Already imported by another process.'); return
        now=int(datetime.datetime.now(datetime.timezone.utc).timestamp()*1000)
        common={'organizationId':org,'createdBy':admin['id'],'updatedBy':admin['id'],'createdAt':now,'updatedAt':now}
        scope={'classId':CLASS,'subjectId':SUBJECT}; slug=f'elesson-model-questions-{SUBJECT}-unit'
        unit=one('SELECT id,classId,subjectId,organizationId FROM Unit WHERE slug=?',(slug,))
        if unit:
            if (unit['classId'],unit['subjectId'],unit['organizationId'])!=(CLASS,SUBJECT,org): raise RuntimeError('Workspace scope mismatch.')
            unit_id=unit['id']
        else:
            unit_id=uid(); insert('Unit',dict(common,**scope,id=unit_id,slug=slug,title='Model Questions — Internal Workspace',status='draft'))
        set_id,lesson_id,content_id=uid(),uid(),uid()
        insert('Lesson',dict(common,id=lesson_id,unitId=unit_id,title='Model Question — '+NAME,slug=f'elesson-model-question-set-{set_id}-lesson',status='draft'))
        hierarchy=dict(scope,unitId=unit_id,lessonId=lesson_id,topicId=None)
        insert('Content',dict(common,**hierarchy,id=content_id,title=NAME))
        # Source contains no academic year or board; leave unset rather than invent metadata.
        meta=dict(common,**scope,id=set_id,name=NAME,editorContentId=content_id,publishedAt=None,boardId=None,academicYearId=None)
        if 'durationMinutes' in fields('ModelQuestionSet'): meta['durationMinutes']=120
        else: print('Duration column not installed; set 120 minutes in admin after applying the dynamic header update.')
        insert('ModelQuestionSet',meta)
        for i,(kind,table,title,question,answer) in enumerate(BLOCKS):
            bid=uid(); insert('ContentBlock',dict(id=bid,contentId=content_id,kind=kind,sortOrder=i,title=title,shortDescription='',marks=5,createdAt=now,updatedAt=now,boardId=None,academicYearId=None))
            insert(table,dict(common,**hierarchy,id=uid(),contentBlockId=bid,contentId=content_id,question=question,answer=answer,details=''))
        check=one('SELECT COUNT(*),SUM(marks) FROM ContentBlock WHERE contentId=?',(content_id,))
        if tuple(check)!=(6,30) or one('PRAGMA foreign_key_check'): raise RuntimeError('Final import validation failed; rollback.')
        con.commit(); print('Imported draft:',set_id); print(f'Admin: /admin/model-question-import/{CLASS}/{SUBJECT}/{set_id}')
    except Exception:
        con.rollback(); raise
    finally: con.close()
if __name__=='__main__': main()
