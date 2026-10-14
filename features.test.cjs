const assert=require('node:assert/strict');
const {Game,result}=require('./src/engine.cjs');
const {Lobby}=require('./src/lobby.cjs');
const fresh=()=>new Game([0,1,2,3].map(id=>({name:'양반'+id,team:id%2,character:id,ai:false})),()=>.01);
function group(weights,masks){return masks.reduce((sum,i)=>sum+weights[i],0);}
const g=fresh();
for(const power of [0,8,20,21,50,79,80,100,NaN,Infinity]){
 const weights=g.throwWeights(power);assert(weights.every(w=>w>0));assert(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-12);
 if(power<=20)assert(Math.abs(group(weights,[1,2,4,8])-.33)<1e-12);
 else if(power>=80&&Number.isFinite(power))assert(Math.abs(group(weights,[0,15])-.205)<1e-12);
 else assert(weights.every(w=>w===1/16));
 if(power===20||power===80){let sum=0;for(let mask=0;mask<16;mask++){g.random=()=>sum+weights[mask]/2;assert.deepEqual(g.toss(power),result(Array.from({length:4},(_,i)=>Boolean(mask&(1<<i)))));sum+=weights[mask];}}
}
console.log('PASS 파워 구간 경계·정확한 합산 +8%p·모든 윷 결과와 표시 일치');
let seed=987654321;g.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const [power,target,expected] of [[100,[4,5],.205],[8,[1,-1],.33],[50,[4,5],.125]]){let hit=0;const n=100000;for(let i=0;i<n;i++)if(target.includes(g.toss(power).value))hit++;assert(Math.abs(hit/n-expected)<.004);console.log('PASS 파워 '+power+'% 10만 회 실제 던지기 '+(hit/n*100).toFixed(2)+'%');}
const ranks=fresh();ranks.s.land.O1.owner=0;ranks.s.land.O1.buildings=[1,3];ranks.s.land.O1.level=3;ranks.s.players[0].pawnDebt=1000;assert.equal(ranks.grossAssets(ranks.s.players[0]),1680);assert.equal(ranks.assets(ranks.s.players[0]),680);assert.equal(ranks.rank(ranks.s.players[0]),1);assert.equal(ranks.rank(ranks.s.players[1]),2);assert.equal(ranks.rank(ranks.s.players[2]),2);ranks.s.players[1].cash=1700;assert.equal(ranks.rank(ranks.s.players[0]),2);console.log('PASS 총자산 순위·공동 순위·개인 현금과 순자산 평가 구분');
const festival=fresh();festival.s.land.O1.owner=0;festival.s.land.O2.owner=2;festival.s.land.O4.owner=1;
for(const [turn,target] of [[0,'O1'],[1,'O4'],[2,'O2']]){festival.s.turn=turn;festival.p.pos='O10';festival.s.rolls=[];festival.arrive();assert(festival.action('choose',target));assert.deepEqual(Object.keys(festival.s.land).filter(id=>festival.s.land[id].boost),[target]);}console.log('PASS 같은 팀·상대 팀 재지정 모두 이전 장원급제 효과 해제');
const lobby=new Lobby({random:()=>.01}),users=[0,1,2,3].map(i=>lobby.user(lobby.login('검증'+i).token));lobby.create(users[0]);const room=lobby.room(users[0]);for(const u of users.slice(1))lobby.join(u,{id:room.id});for(const u of users)lobby.ready(u,{ready:true});lobby.start(users[0]);const powers=[];room.game.toss=power=>{powers.push(power);return {name:'윷',value:4,bits:[true,true,true,true]};};lobby.action(users[0],{type:'roll',power:1000});lobby.action(users[0],{type:'extra',value:true,power:-1});assert.deepEqual(powers,[100,100,8]);assert.equal(room.game.s.lastPower,8);console.log('PASS 서버 파워 범위 검증과 첫 두 번·추가 던지기에 전달');

const {LINES}=require('./src/engine.cjs');
for(const line of LINES){const game=fresh(),friend=game.s.players.find(p=>p.team===game.p.team&&p.id!==game.p.id);for(let i=0;i<line.length-1;i++){game.s.land[line[i]].owner=i%2?friend.id:game.p.id;}assert.equal(game.check(),false);const last=line.at(-1);game.p.pos=last;game.p.cash=5000;game.s.arrived=true;game.s.phase='manage';game.s.rolls=[];assert(game.action('buy'));assert.equal(game.s.phase,'ended');assert.equal(game.s.winner.team,game.p.team);assert.equal(game.s.land[last].buildings.length,0);assert(game.s.winner.reason.includes('고을 독점'));}console.log('PASS 여섯 직선 마지막 빈땅 매입 즉시 승리·팀원 분산소유·건물 불필요');
const blocked=fresh();for(const id of LINES[0])blocked.s.land[id].owner=0;blocked.s.land[LINES[0][1]].owner=1;assert.equal(blocked.check(),false);console.log('PASS 한 고을이라도 상대 팀 소유면 독점 승리 차단');
