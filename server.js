const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.json':'application/json; charset=utf-8' };
const initial = { papers: [], copies: [], incidents: [], audit: [], security: { lastAuditHash: 'GENESIS' } };
const SECRET_FILE = path.join(ROOT, '.papertrace-secret');
function getSecret() { try { return fs.readFileSync(SECRET_FILE, 'utf8').trim(); } catch { const secret=crypto.randomBytes(32).toString('hex'); fs.writeFileSync(SECRET_FILE,secret,{mode:0o600}); return secret; } }
const SIGNING_SECRET = process.env.PAPERTRACE_SECRET || getSecret();
function sign(value) { return crypto.createHmac('sha256', SIGNING_SECRET).update(value).digest('hex'); }
function shortSignature(value) { return sign(value).slice(0, 16).toUpperCase(); }
function readDb() { try { const db=JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); db.security ||= {lastAuditHash:'GENESIS'}; db.papers ||= []; db.copies ||= []; db.incidents ||= []; db.audit ||= []; return db; } catch { return structuredClone(initial); } }
function writeDb(db) { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }
function id(prefix) { return `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; }
function audit(db, action, detail) { const at=new Date().toISOString(), previousHash=db.security.lastAuditHash||'GENESIS'; const hash=sign(`${previousHash}|${at}|${action}|${detail}`); db.audit.unshift({ id:id('AUD'), at, action, detail, previousHash, hash }); db.audit = db.audit.slice(0,100); db.security.lastAuditHash=hash; }
function auditIntact(db) { let previous='GENESIS'; for(const item of [...db.audit].reverse()) { if(item.previousHash !== previous || item.hash !== sign(`${previous}|${item.at}|${item.action}|${item.detail}`)) return false; previous=item.hash; } return true; }
function body(req) { return new Promise((resolve,reject) => { let raw=''; req.on('data', c => { raw += c; if(raw.length > 2e6) req.destroy(); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch(e) { reject(e); } }); }); }
function send(res, status, value) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(value)); }


const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    try {
      const db = readDb(); let result;
      if (req.method === 'GET' && url.pathname === '/api/dashboard') { result={...db, security:{auditChainIntact:auditIntact(db), signing:'HMAC-SHA-256', evidenceHashing:'SHA-256', keySource:process.env.PAPERTRACE_SECRET?'environment secret':'local protected secret'}}; }
      else if (req.method === 'POST' && url.pathname === '/api/papers') {
        const p = await body(req); if(!p.title?.trim()) return send(res,400,{error:'Paper title is required'});
        const paper = { id:id('EXAM'), title:p.title.trim(), subject:p.subject?.trim()||'Unspecified', examDate:p.examDate||'', createdAt:new Date().toISOString(), fingerprint:p.fingerprint||null };
        db.papers.unshift(paper); audit(db,'Paper registered', `${paper.id}: ${paper.title}`); writeDb(db); result=paper;
      } else if (req.method === 'POST' && url.pathname === '/api/copies') {
        const p=await body(req); const paper=db.papers.find(x=>x.id===p.paperId); if(!paper||!p.recipient?.trim()) return send(res,400,{error:'Select a paper and recipient'});
        const issuedAt=new Date().toISOString(); const copy={id:id('CP'), paperId:paper.id, recipient:p.recipient.trim(), department:p.department?.trim()||'—', status:'Issued', issuedAt, token:crypto.randomBytes(8).toString('hex')};
        copy.signature=shortSignature(`${copy.id}|${copy.paperId}|${copy.token}|${issuedAt}`);
        db.copies.unshift(copy); audit(db,'Personalised copy issued', `${copy.id} issued to ${copy.recipient}`); writeDb(db); result={copy,paper};
      } else if (req.method === 'POST' && url.pathname === '/api/incidents') {
        const p=await body(req); const paper=db.papers.find(x=>x.id===p.paperId); const copy=db.copies.find(x=>x.id===p.copyId);
        const incident={id:id('CASE'), at:new Date().toISOString(), fileName:p.fileName||'uploaded evidence', evidenceHash:p.evidenceHash||null, mlAnalysis:p.mlAnalysis||null, paperId:paper?.id||null, copyId:copy?.id||null, watermarkScore:Number(p.watermarkScore)||0, documentScore:Number(p.documentScore)||0, evidence:p.evidence||[], status:copy?'Potential copy match':paper?'Potential paper match':'No reliable match'};
        db.incidents.unshift(incident); audit(db,'Leak analysis recorded', `${incident.id}: ${incident.status}`); writeDb(db); result=incident;
      } else if (req.method === 'POST' && url.pathname === '/api/reset-demo') { writeDb(structuredClone(initial)); result={ok:true}; }
      else return send(res,404,{error:'Not found'});
      send(res,200,result);
    } catch(e) { send(res,500,{error:e.message || 'Server error'}); }
    return;
  }
  const safe = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(ROOT,'public',safe));
  if (!file.startsWith(path.join(ROOT,'public'))) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file,(err,content)=>{ if(err){res.writeHead(404);res.end('Not found');return;} res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'});res.end(content); });
});
server.listen(process.env.PORT || 3000, () => console.log('PaperTrace AI running at http://localhost:3000'));

