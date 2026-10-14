require('./load-env.cjs');
const http=require('node:http'),{createHandler}=require('./src/http.cjs'),{fromEnvironment}=require('./src/store.cjs');
const store=fromEnvironment(),port=Number(process.env.PORT||5174);
http.createServer(createHandler({getStore:()=>store})).listen(port,'0.0.0.0',()=>console.log('게임 API: http://127.0.0.1:'+port+' · 로컬 메모리 모드 또는 설정된 Redis 사용'));
