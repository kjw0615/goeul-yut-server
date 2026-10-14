const assert=require('node:assert/strict'),{Game}=require('./src/engine.cjs');
const config=()=>[0,1,2,3].map(i=>({name:'양반'+i,team:i%2,character:i,ai:true}));
const fresh=()=>new Game(config(),()=>.5);
for(const power of [0,5,50,95,100]){const g=fresh();g.random=()=>.049999;assert.equal(g.toss(power).name,'낙');g.random=()=>.05;assert.notEqual(g.toss(power).name,'낙');}
const nak=()=>({name:'낙',value:0,nak:true,used:true,bits:[]}),normal=(name,value)=>({name,value,used:false});
for(const outcomes of [[normal('개',2),normal('걸',3)],[nak(),normal('걸',3)],[nak(),normal('모',5),normal('개',2)],[nak(),normal('윷',4),nak()],[nak(),nak()]]){
const g=fresh(),list=[...outcomes];g.toss=()=>list.shift();const start=g.p.pos;assert(g.action('roll'));if(g.s.phase==='extra')assert(g.action('extra',true));const expected=outcomes.filter(r=>!r.nak).length;assert.equal(g.remaining().length,expected);for(let i=0;i<outcomes.length;i++)if(outcomes[i].nak)assert.equal(g.action('use',i),false);if(!expected){assert.equal(g.p.pos,start);assert.equal(g.s.phase,'manage');assert.equal(g.s.arrived,false);assert(g.s.noMove);assert(!g.canBuy());assert.equal(g.availableBuildings().length,0);assert(g.action('end'));}}
console.log('PASS 낙0·1·2개 이동 수·낙+윷/모 추가·추가 낙·제자리 효과/건설 재발동 없음');
let seed=123456789;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(const power of [0,50,100]){const g=new Game(config(),random);let n=0;for(let i=0;i<100000;i++)n+=g.toss(power).nak?1:0;assert(Math.abs(n/100000-.05)<.003);console.log('PASS 파워'+power+' 낙 비율 '+(n/1000).toFixed(2)+'%');}
for(let seed=1;seed<=20;seed++){let v=seed;const g=new Game(config(),()=>((v=(Math.imul(v,1664525)+1013904223)>>>0)/4294967296));let turns=0;while(g.s.phase!=='ended'&&turns++<8000){const a=g.ai();assert(a);assert(g.action(...a));}assert.equal(g.s.phase,'ended');}
console.log('PASS 새 균등 확률·낙 포함 AI20판 정상 종료');
