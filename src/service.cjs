const {Lobby}=require('./lobby.cjs'),{Game}=require('./engine.cjs');
const routes={create:'create',join:'join',quick:'quick',leave:'leave',edit:'edit',ready:'ready',ai:'ai','ai-edit':'aiEdit',kick:'kick',rematch:'rematch',logout:'logout',start:'start',action:'action',session:'session',chat:'chat',emote:'emote'};
function restore(raw,now,random){const lobby=new Lobby({now,random});if(!raw)return lobby;const data=JSON.parse(raw);if(data.version!==1)throw Error('저장 형식 불일치');lobby.chatMessages=data.chatMessages||[];lobby.chatSeq=data.chatSeq||0;lobby.revision=data.revision;lobby.users=new Map(data.users);lobby.rooms=new Map(data.rooms.map(([id,r])=>[id,{...r,game:r.state?new Game(r.state,random):null}]));for(const r of lobby.rooms.values())delete r.state;return lobby;}
function serialize(lobby){return JSON.stringify({version:1,revision:lobby.revision,chatMessages:lobby.chatMessages,chatSeq:lobby.chatSeq,users:[...lobby.users],rooms:[...lobby.rooms].map(([id,r])=>{const {game,...fields}=r;return [id,{...fields,state:game?.s||null}];})});}
function createService({store,now=Date.now,random=Math.random}={}){
 return {async execute({route,method,token='',body={},revision=-1}){
  const stopAt=Date.now()+15000;
  for(let attempt=0;attempt<16&&Date.now()<stopAt;attempt++){
   const raw=await store.read();let lobby=restore(raw,now,random);
   lobby.pruneSessions();
   lobby.tick();const afterTick=serialize(lobby);let result,failure;
   try{
   if(route==='login'&&method==='POST'){if(lobby.users.size>=2000)throw Object.assign(Error('접속자가 많습니다. 잠시 후 다시 시도해주세요.'),{status:503});result=lobby.login(body.nickname,body.deviceSecret);}
   else{
    const previous=lobby.users.get(token)?.seen,u=lobby.user(token);
    if(route==='state'&&method==='GET'){
     if(previous!==undefined&&now()-previous<5000)u.seen=previous;u.closingAt=null;
     result=Number(revision)===lobby.revision?{unchanged:true,serverNow:now()}:lobby.state(u);
    }else{
     if(method!=='POST'||!routes[route])throw Object.assign(Error('없는 기능입니다.'),{status:404});
     const requestId=typeof body.requestId==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)?body.requestId:null;
     const receipt=requestId&&u.receipts?.find(x=>x.id===requestId);
     if(receipt&&receipt.route!==route)throw Object.assign(Error('요청 번호가 중복되었습니다.'),{status:409});
     const output=receipt?receipt.output:lobby[routes[route]](u,body);if(route!=='session'&&route!=='logout'){u.activeAt=now();u.closingAt=null;}
     if(requestId&&!receipt&&route!=='logout'){u.receipts??=[];u.receipts.push({id:requestId,route,output});u.receipts=u.receipts.slice(-20);}
     result={...output,...lobby.state(u)};
    }
   }
   }catch(error){failure=error;lobby=restore(afterTick,now,random);}
   const next=serialize(lobby);
   if(next===raw||await store.compareAndSet(raw,next)){if(failure)throw failure;return result;}
   await new Promise(resolve=>setTimeout(resolve,10+Math.floor(Math.random()*35)));
  }
  throw Object.assign(Error('다른 행동을 처리 중입니다. 잠시 후 다시 선택해주세요.'),{status:409});
 }};
}
module.exports={createService,serialize,restore};
