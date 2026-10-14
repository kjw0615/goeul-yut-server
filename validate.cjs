const fs=require('node:fs'),{execFileSync}=require('node:child_process');process.chdir(__dirname);
for(const p of ['src/engine.cjs','src/lobby.cjs','src/store.cjs','src/service.cjs','src/http.cjs','api/game.js','dev.cjs','load-env.cjs'])execFileSync(process.execPath,['--check',p],{stdio:'inherit'});
for(const file of ['READMD.md','public/index.html','vercel.json'])if(!fs.existsSync(file))throw Error('필수 파일 없음: '+file);
console.log('Vercel 게임 API 구성·문법 검증 완료');
