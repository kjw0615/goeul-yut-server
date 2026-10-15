const assert=require('node:assert/strict');
const {Lobby}=require('./src/lobby.cjs'),{Game,LINES}=require('./src/engine.cjs'),{serialize,restore}=require('./src/service.cjs');
const seats=()=>[0,1,2,3].map(id=>({name:'규칙'+id,team:id%2,character:id,ai:true}));
const game=v=>new Game(seats(),()=>.01,{rounds:10,startingCash:2000,victories:v});
for(const rounds of [10,15,20])for(const startingCash of [1500,2000]){const g=new Game(seats(),()=>.01,{rounds,startingCash,victories:['assets']});assert.equal(g.rules().rounds,rounds);assert(g.s.players.every(p=>p.cash===startingCash));g.s.round=rounds;g.s.turn=3;g.end();assert.equal(g.s.phase,'ended');}
let l=new Lobby({random:()=>.01,startDelayMs:0}),u=l.user(l.login('방장').token);
l.create(u);let r=l.room(u);assert.deepEqual(r.rules,{rounds:15,startingCash:1500,victories:['allBankrupt','line','assets']});
assert.deepEqual(l.state(u).room.rules,r.rules);assert.equal(l.state(u).rooms[0].rules.rounds,15);
for(const bad of [{rounds:0},{rounds:'15'},{rounds:100},{startingCash:999999},{victories:[]},{victories:['hack']},{victories:['line','line']}]){const x=new Lobby(),p=x.user(x.login('검증').token);assert.throws(()=>x.create(p,bad));assert.equal(x.rooms.size,0);}
l=new Lobby({random:()=>.01,startDelayMs:0});u=l.user(l.login('설정방장').token);l.create(u,{rounds:10,startingCash:2000,victories:['anyBankrupt','assets']});r=l.room(u);for(let i=1;i<4;i++)l.ai(u,{seat:i});l.ready(u,{ready:true});l.start(u);assert(r.game.s.players.every(p=>p.cash===2000));assert.equal(r.game.rules().rounds,10);assert.deepEqual(restore(serialize(l),Date.now,()=>.01).rooms.get(r.id).game.rules(),r.rules);
let g=game(['anyBankrupt']);g.s.players[1].out=true;g.check();assert.equal(g.s.winner.team,0);assert(g.s.winner.reason.includes('한 명'));
g=game(['anyBankrupt']);g.s.turn=1;g.p.cash=0;g.p.pawnUsed=true;g.s.debt={amount:100,to:null,label:'검증'};g.bankrupt();assert.equal(g.s.phase,'ended');assert.equal(g.s.winner.team,0);
g=game(['allBankrupt']);g.s.players[1].out=true;assert.equal(g.check(),false);g.s.players[3].out=true;g.check();assert.equal(g.s.winner.team,0);
for(const enabled of [false,true]){g=game(enabled?['line']:['assets']);for(const id of LINES[0])g.s.land[id].owner=0;assert.equal(g.check(),enabled);}
g=game(['assets']);g.s.round=10;g.s.turn=3;g.s.phase='manage';g.s.players[0].pawnDebt=5000;g.s.land.O1.owner=0;g.s.land.O1.buildings=[1,3];g.s.land.O1.level=3;g.end();assert.equal(g.s.winner.team,0);assert(g.s.winner.reason.includes('10라운드'));
g=game(['assets']);g.s.round=10;g.s.turn=3;g.end();assert.equal(g.s.winner.team,null);
g=game(['line']);g.s.round=10;g.s.turn=3;g.end();assert.equal(g.s.winner.team,null);assert(g.s.winner.reason.includes('미달'));
g=game(['line']);for(const p of g.s.players)p.out=true;assert(g.check());assert.equal(g.s.winner.team,null);
g=game(['assets']);g.s.round=9;g.s.turn=3;g.end();assert.equal(g.s.round,10);assert.notEqual(g.s.phase,'ended');delete g.s.rules;assert.equal(new Game(g.s).rules().rounds,20);
console.log('PASS 방별 설정 검증·기본값·공유·복원·시작 엽전·선택 승리조건·건물 포함 총자산·라운드 무승부·기존 경기 호환');
