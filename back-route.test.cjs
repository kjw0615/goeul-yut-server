// These existing fixtures isolate non-nak rules; nak probabilities are tested separately.
require('./src/engine.cjs').Game.nakChance=0;
const assert=require('node:assert/strict'),{Game}=require('./src/engine.cjs');
const fresh=()=>new Game([0,1,2,3].map(i=>({name:'양반'+i,team:i%2,character:i,ai:false})),()=>.01);
for(const [at,trace,choices] of [['C',['O5','NE1','NE2'],['NE2','NW2']],['O15',['O12','O13','O14'],['O14','SW2']],['O0',['O17','O18','O19'],['O19','SE2']]]){
 for(const target of choices){const g=fresh();g.p.pos=at;g.p.trace=trace;g.p.lastMoveForward=true;g.s.phase='moves';g.s.rolls=[{name:'빽도',value:-1,used:false},{name:'빽도',value:-1,used:false}];assert.deepEqual(g.preview(0).map(v=>v.at),choices);assert(g.action('use',0));assert.equal(g.s.phase,'route');assert.deepEqual(g.s.choice.options,choices);assert.equal(g.action('route','O6'),false);assert(g.action('route',target));assert.equal(g.p.pos,target);assert(g.action('use',1));assert.equal(g.p.pos,g.previous(target));}
}
console.log('PASS 중앙·왼쪽 아래·출발점 역방향 선택·예측·앞길 변조 차단·다음 후진 이력');
const g=fresh();g.s.rolls=[{name:'모',value:5,used:false},{name:'걸',value:3,used:false},{name:'빽도',value:-1,used:false}];g.s.phase='moves';g.action('use',0);g.action('use',1);g.action('route','NE1');assert.equal(g.p.pos,'C');g.action('use',2);assert.equal(g.s.phase,'route');g.action('route','NW2');assert.equal(g.p.pos,'NW2');assert.equal(g.s.lastPath[0],'NW2');assert.equal(g.s.phase,'manage');
console.log('PASS 실제 전진 두 결과로 중앙 도착 후 다른 갈래 빽도·최종 칸만 처리');
const initial=fresh();initial.s.phase='moves';initial.s.rolls=[{value:-1,name:'빽도',used:false}];assert(initial.action('use',0));assert.equal(initial.p.pos,'O19');assert.notEqual(initial.s.phase,'route');
console.log('PASS 최초 출발점 빽도는 기존 단일 후진');
