const {createService}=require('./service.cjs');
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function readBody(req){if(req.body&&typeof req.body==='object'){if(Array.isArray(req.body))throw Object.assign(Error('요청 형식이 잘못되었습니다.'),{status:400});if(JSON.stringify(req.body).length>16384)throw Object.assign(Error('요청이 너무 큽니다.'),{status:413});return req.body;}let text=typeof req.body==='string'?req.body:'';if(!text)for await(const chunk of req){text+=chunk;if(text.length>16384)throw Object.assign(Error('요청이 너무 큽니다.'),{status:413});}if(text.length>16384)throw Object.assign(Error('요청이 너무 큽니다.'),{status:413});try{const body=text?JSON.parse(text):{};if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body;}catch{throw Object.assign(Error('요청 형식이 잘못되었습니다.'),{status:400});}}
function createHandler({getStore,now=Date.now,random=Math.random,env=process.env}={}){
 return async(req,res)=>{
  try{
   const url=new URL(req.url,'https://'+(req.headers.host||'localhost')),route=req.query?.route||url.searchParams.get('route')||(url.pathname==='/health'?'health':url.pathname.replace(/^\/api\//,''));
   const origin=req.headers.origin,allowedOrigins=(env.ALLOWED_ORIGINS||(!env.VERCEL?'http://127.0.0.1:5173,http://localhost:5173':'')).split(',').map(x=>x.trim()).filter(Boolean);
   if(origin&&!allowedOrigins.includes(origin)&&origin!=='https://'+req.headers.host&&origin!=='http://'+req.headers.host)return send(res,403,{error:'허용되지 않은 화면 주소입니다.'});
   if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
   res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
   if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
   if(route==='health'){if(req.method!=='GET')return send(res,405,{error:'GET 요청을 사용해주세요.'});return send(res,200,{game:'goeul-yut',version:14,multiplayer:true,storageConfigured:!!((env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL)&&(env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN)),runtime:env.VERCEL?'vercel-functions':'local'});}
   if(!url.pathname.startsWith('/api/'))return send(res,404,{error:'게임 API 주소를 사용해주세요.'});
   const service=createService({store:getStore(),now,random});
   const body=req.method==='POST'?await readBody(req):{};
   return send(res,200,await service.execute({route,method:req.method,body,token:String(req.headers.authorization||'').replace(/^Bearer /,''),revision:req.query?.revision??url.searchParams.get('revision')??-1}));
  }catch(error){return send(res,error.status||500,{error:error.status?error.message:'게임 서버에서 문제가 발생했습니다.'});}
 };
}
module.exports={createHandler};
