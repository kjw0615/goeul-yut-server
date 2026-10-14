// These existing fixtures isolate non-nak rules; nak probabilities are tested separately.
require('./src/engine.cjs').Game.nakChance=0;
const assert=require('node:assert/strict');
const {Game,NODES}=require('./src/engine.cjs');
const {createService,restore,serialize}=require('./src/service.cjs');
const {MemoryStore}=require('./src/store.cjs');
const fresh=()=>new Game([0,1,2,3].map(i=>({uid:'u'+i,name:'양반'+i,team:i%2,character:i,ai:false})),()=>.01);
let g=fresh();assert.equal(NODES.find(n=>n.id==='NW1').name,'공주');
for(const [buildings,mult] of [[[],1],[[1],2],[[2],3],[[3],5],[[1,2],5],[[1,3],7],[[2,3],8],[[1,2,3],10]]){g.s.land.O1.buildings=buildings;assert.equal(g.toll('O1'),20*mult);g.s.land.O1.boost=true;assert.equal(g.toll('O1'),40*mult);g.s.land.O1.boost=false;}
for(const n of NODES.filter(n=>n.type==='property')){assert.equal(n.base,Math.floor(n.price*.2));for(const tier of [1,2,3])assert.equal(g.buildCost(n.id,tier),Math.floor(n.price*tier*.2));g.s.land[n.id].buildings=[1,2,3];assert.equal(g.toll(n.id),n.base*10);}console.log('PASS 공주 명칭·모든 건물 조합 합산 통행료·축제 배수');
for(const cash of [19,20,25,95,100,500]){g=fresh();g.p.pos='SW1';g.p.cash=cash;g.arrive();if(cash<20){assert.equal(g.s.phase,'notice');continue;}assert.equal(g.s.choice.min,20);assert.equal(g.s.choice.max,Math.min(100,Math.floor(cash/10)*10));assert.equal(g.action('choose',25),false);assert.equal(g.action('choose',110),false);assert(g.action('choose',20));}
console.log('PASS 판돈20~100·10단위·현금부족·변조 요청 거절');
g=fresh();g.s.land.O1.owner=0;g.s.land.O2.owner=2;g.s.land.O4.owner=0;g.p.pos='O5';g.p.cash=270;g.s.arrived=true;g.s.phase='manage';assert.deepEqual(g.ai(),['buy']);g.action(...g.ai());assert.equal(g.s.winner.team,0);
g=fresh();g.p.pos='O5';g.s.rolls=[{name:'걸',value:3,used:false},{name:'개',value:2,used:false}];g.s.phase='moves';const action=g.ai();assert(action);assert(g.action(...action));if(g.s.phase==='route')assert(g.action(...g.ai()));assert(g.action(...g.ai()));
console.log('PASS 자금 여유보다 즉시 독점 승리 우선·남은 윷과 갈림길 탐색');
g=fresh();g.s.land.O1.owner=0;g.p.pos='O10';g.s.rolls=[];g.arrive();assert.equal(g.s.effects.at(-1).kind,'festival');g.action('choose','O1');assert.equal(g.s.effects.at(-1).at,'O1');g.s.land.O2.owner=1;g.s.land.O2.buildings=[1,3];g.s.land.O2.level=3;g.p.pos='C';g.arrive();g.action('choose','O2');assert.equal(g.s.effects.at(-1).kind,'inspector');assert.equal(g.s.effects.at(-1).at,'O2');assert.equal(new Game(g.s).s.effectSeq,g.s.effectSeq);
console.log('PASS 장원급제·암행어사 발동 및 대상 효과 순번·복원');
(async()=>{let now=1000;const store=new MemoryStore(),service=createService({startDelayMs:0,presentationMs:0,store,now:()=>now,random:()=>.01}),call=(route,token='',body)=>service.execute({route,token,method:body===undefined?'GET':'POST',body:body||{}}),secret='1'.repeat(64);
const a=(await call('login','',{nickname:'예약양반',deviceSecret:secret})).token,b=(await call('login','',{nickname:'팀원',deviceSecret:'3'.repeat(64)})).token;const state=await call('create',a,{}),room=state.room;await call('join',b,{id:room.id});await call('ai',a,{seat:2});await call('ai',a,{seat:3});await call('ready',a,{ready:true});await call('ready',b,{ready:true});await call('start',a,{});
const before=await call('state',a),uid=before.user.id;await assert.rejects(call('login','',{nickname:'예약양반',deviceSecret:'2'.repeat(64)}));await call('session',a,{closing:true});now+=15001;const away=await call('state',b);assert(away.room.state.players.find(p=>p.uid===uid).autoPlay);assert(!away.onlineUsers.some(u=>u.id===uid));await assert.rejects(call('state',a),e=>e.status===401);await assert.rejects(call('login','',{nickname:'예약양반'}));await assert.rejects(call('login','',{nickname:'예약양반',deviceSecret:'2'.repeat(64)}));
const saved=restore(await store.read(),()=>now,()=>.01);assert(saved.users.get(a).deviceHash!==secret);const resumed=await call('login','',{nickname:'예약양반',deviceSecret:secret});assert(resumed.resumed);assert.equal(resumed.user.id,uid);assert.notEqual(resumed.token,a);const returned=await call('state',resumed.token);assert.equal(returned.room.id,room.id);assert(!returned.room.state.players.find(p=>p.uid===uid).autoPlay);await assert.rejects(call('state',a),e=>e.status===401);
await call('session',resumed.token,{closing:true});now+=15001;await call('state',b);now+=600001;const next=await call('login','',{nickname:'예약양반',deviceSecret:secret});assert.notEqual(next.user.id,uid);
console.log('PASS10분 예약·다른 장치/닉네임만 복귀 차단·같은 장치 복귀·토큰 교체·만료 후 자리 해제');
})().catch(e=>{console.error(e);process.exitCode=1;});
