const assert=require('node:assert/strict'),fs=require('node:fs');
const {Game,LINES,NODES}=require('./src/engine.cjs');
const config=[0,1,2,3].map(i=>({name:'AI'+i,uid:'u'+i,team:i%2,character:i,ai:true}));
const fresh=()=>new Game(config,()=>0);
function own(g,id,owner,buildings=[]){Object.assign(g.s.land[id],{owner,buildings:[...buildings],level:Math.max(0,...buildings)});}
function rolls(g,values){g.s.phase='moves';g.s.rolls=values.map(value=>({name:String(value),value,used:false}));}
function test(name,fn){fn();console.log('PASS '+name);}
test('경로 모의실행은 빽도 방향·현금·복귀·세금을 실제 이동과 일치시키고 원본을 보존',()=>{
 const g=fresh();g.p.pos='O5';g.p.trace=['O0','O1','O2','O3','O4'];g.p.departed=true;g.p.lastMoveForward=true;rolls(g,[-1,5,3]);const before=JSON.stringify(g.s),copy=g.projectMovement(-1,undefined,0),actual=new Game(g.s);assert(actual.action('use',0));for(const key of ['pos','trace','lastMoveForward','cash','laps','taxAt','departed'])assert.deepEqual(copy.p[key],actual.p[key]);assert.equal(JSON.stringify(g.s),before);g.bestMovement();assert.equal(JSON.stringify(g.s),before);
});
test('마지막 이동으로 상대 고을에 도착하면 가렴주구를 지나침으로 잘못 소멸시키지 않음',()=>{
 const g=fresh();g.p.pos='O3';g.p.taxAt=g.p.turns;own(g,'O4',1);rolls(g,[1]);const copy=g.projectMovement(1,undefined,0);assert.equal(copy.p.taxAt,g.p.turns);rolls(g,[1,1]);assert.equal(g.projectMovement(1,undefined,0).p.taxAt,null);
});
test('매입비가 없는 마패를 방어 카드로 계산하지 않음',()=>{
 const g=fresh();own(g,'SE2',1,[1,2,3]);g.p.cash=10;g.p.cards=['badge'];const value=g.positionValue('SE2');g.p.cards=[];assert.equal(g.positionValue('SE2'),value);assert(value< -1000);
});
test('작은 통행료에는 카드를 아끼고 큰 통행료에는 사용',()=>{
 const g=fresh();own(g,'O1',1);own(g,'SE2',1,[1,2,3]);g.p.cards=['shield'];assert.equal(g.tollDecision('O1',20,['pay','shield']).action,'pay');assert.equal(g.tollDecision('SE2',600,['pay','shield']).action,'shield');
});
test('직선 완성 매입·마패 사용은 예비 현금보다 우선',()=>{
 for(const card of [false,true]){const g=fresh();for(const id of LINES[0].slice(0,-1))own(g,id,2);g.p.pos='O5';g.s.phase='manage';g.s.arrived=true;g.p.cash=270;if(card){own(g,'O5',1);g.p.cards=['badge'];g.arrive();assert.equal(g.ai()[1],'badge');}else assert.equal(g.ai()[0],'buy');assert(g.action(...g.ai()));assert.equal(g.s.winner.team,0);}
});
test('무료 투자는 이미 완성된 비싼 고을 대신 추가 건설 가치가 있는 고을 선택',()=>{
 const g=fresh();own(g,'SE2',0,[1,2,3]);own(g,'O1',2);g.s.phase='choice';g.s.choice={kind:'invest',options:['SE2','O1']};assert.deepEqual(g.ai(),['choose','O1']);
});
test('첫 건물의 실제 통행료 증가량으로 투자 효율 비교',()=>{
 const g=fresh();own(g,'O1',0);g.p.pos='O1';g.p.laps=2;g.s.phase='manage';g.s.arrived=true;assert.equal(g.buildingGain('O1',1),20);assert.equal(g.buildingGain('O1',3),80);assert.deepEqual(g.ai(),['build',3]);
});
test('마굿간 평가는 출발점 실제 지원금·해금을 반영하며 원본 보존',()=>{
 const g=fresh();g.p.pos='O8';g.p.departed=true;const before=JSON.stringify(g.s);const path=g.travelPath('O1');assert(path.path.includes('O0'));const copy=new Game(g.s);copy.registerReturns(path.path);copy.expirePassingTax(path.path);copy.p.pos='O1';assert.equal(g.travelValue('O1'),copy.positionValue('O1')+150);assert.equal(JSON.stringify(g.s),before);
});
test('놀음판은 기대 배당·여유 현금·상대 동작그만을 비교',()=>{
 const g=fresh();g.s.phase='choice';g.s.choice={kind:'gamble',min:20,max:100};assert.equal(g.gambleChoice()[1],100);g.s.players[1].cards=['freeze'];assert.equal(g.gambleChoice()[1],20);g.p.cash=20;assert.equal(g.gambleChoice()[1],20);
});
test('추가 던지기는 낙을 포함한 기대값과 세 파워를 비교하며 원본 보존',()=>{
 const g=fresh();g.p.pos='O5';rolls(g,[5,3]);g.s.phase='extra';const before=JSON.stringify(g.s),choice=g.extraChoice();assert.equal(choice[0],'extra');assert([0,50,100].includes(choice[2]));assert.equal(JSON.stringify(g.s),before);
});
test('브라우저·게임 서버의 AI 규칙 동일',()=>assert.equal(fs.readFileSync('./src/engine.cjs','utf8'),fs.readFileSync('../goeul-yut-web/public/engine.js','utf8')));

test('상대의 직선 완성을 막을 마지막 고을은 현금 예비액보다 우선',()=>{const g=fresh();for(const id of LINES[0].slice(0,-1))own(g,id,1,[3]);g.p.pos='O5';g.p.cash=270;g.s.phase='manage';g.s.arrived=true;assert.deepEqual(g.ai(),['buy']);});
test('직선 완성 직전 고을 매각 대신 남은 전당포 기회를 활용',()=>{const g=fresh();for(const id of ['O1','O2','O4'])own(g,id,0);g.p.cash=0;g.pay(40,null,'통행료');assert.deepEqual(g.ai(),['pawn']);assert(g.action(...g.ai()));assert(!g.p.out);assert.equal(g.s.land.O1.owner,0);});
// Independent oracle executes the legal actions; it does not use projectMovement.
function oracle(g){if(!g.remaining().length&&g.s.phase!=='route')return g.positionValue(g.p.pos);const options=g.s.phase==='route'?g.s.choice.options.map(v=>['route',v]):g.remaining().map(r=>['use',r.index]);let best=-Infinity;for(const action of options){const copy=new Game(g.s);copy.arrive=function(){this.s.phase='manage';};const cash=copy.p.cash;assert(copy.action(...action));best=Math.max(best,oracle(copy)+(copy.p.cash-cash)*1.5);}return best;}
test('이동 순서·양방향 갈림길의 최적 평가값을 실제 규칙 전수 탐색과 대조',()=>{for(const pos of ['O0','O5','O10','C','O15','SE2'])for(const values of [[-1,5,3],[1,2,4],[5,5,5]]){const g=fresh();g.p.pos=pos;g.p.trace=['O0','O1','O2','O3','O4'];g.p.lastMoveForward=true;g.p.departed=true;g.p.taxAt=g.p.turns;own(g,'O4',1,[3]);own(g,'SE2',1,[1,2]);own(g,'O2',2);rolls(g,values);const before=JSON.stringify(g.s),best=g.bestMovement(),chosen=new Game(g.s);chosen.arrive=function(){this.s.phase='manage';};const cash=chosen.p.cash;assert(chosen.action(...best));assert.equal(oracle(chosen)+(chosen.p.cash-cash)*1.5,oracle(g));assert.equal(JSON.stringify(g.s),before);}});

test('통행료가 없는 저당 고을에서는 발동 불가 마패의 인수 이득을 계산하지 않음',()=>{const g=fresh();own(g,'O1',1,[1]);g.s.land.O1.mortgageTurns=2;g.p.cards=['badge'];assert.equal(g.tollDecision('O1',0).action,'pay');});
test('산적 비용 예상은 실제 순자산 세금 규칙과 일치',()=>{const g=fresh();g.p.pawnDebt=900;assert.equal(g.positionValue('NE2'),-Math.floor(g.assets(g.p)*.05));});
let draws=0;const g=new Game(config,()=>{draws++;return .1;});rolls(g,[5,3]);const before=draws;g.bestMovement();g.extraChoice();assert.equal(draws,before);console.log('PASS AI 탐색은 실제 윷·카드 난수를 소비하거나 미리 뽑지 않음');
