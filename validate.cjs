const fs=require('node:fs'),{execFileSync}=require('node:child_process');process.chdir(__dirname);
for(const p of ['src/admin.cjs','src/engine.cjs','src/lobby.cjs','src/store.cjs','src/service.cjs','src/http.cjs','api/game.js','dev.cjs','load-env.cjs'])execFileSync(process.execPath,['--check',p],{stdio:'inherit'});
for(const file of ['READMD.md','public/index.html','vercel.json'])if(!fs.existsSync(file))throw Error('필수 파일 없음: '+file);
const config=JSON.parse(fs.readFileSync('vercel.json','utf8')),rewrite=config.rewrites.find(r=>r.source.startsWith('/api/:route('));if(!rewrite)throw Error('Vercel API 경로 전달 설정 없음');const pattern=new RegExp('^(?:'+rewrite.source.slice('/api/:route('.length,-1)+')$');for(const route of ['login','state','admin-login',...Object.keys(require('./src/service.cjs').routes)])if(!pattern.test(route))throw Error('Vercel API 경로 등록 누락: '+route);
console.log('Vercel 게임 API 구성·문법 검증 완료');
