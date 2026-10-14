const CAS_SCRIPT=`local current = redis.call('GET', KEYS[1])
if ARGV[1] == '__missing__' then
  if current then return 0 end
elseif current ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1`;
class MemoryStore {
 constructor(){this.value=null;}
 async read(){return this.value;}
 async compareAndSet(expected,next){if(this.value!==expected)return false;this.value=next;return true;}
}
class RedisStore {
 constructor({url,token,key='goeul-yut:v14:lobby',fetcher=fetch}){const origin=new URL(url);if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/')throw Error('Redis REST URL을 확인해주세요.');this.url=origin.origin;this.token=token;this.key=key;this.fetcher=fetcher;}
 async command(command){let response;try{response=await this.fetcher(this.url,{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(5000)});const result=await response.json();if(!response.ok||result.error)throw Error('Redis failure');return result.result;}catch{throw Object.assign(new Error('게임 저장소에 연결하지 못했습니다. Vercel의 Redis 연결 설정을 확인해주세요.'),{status:503});}}
 read(){return this.command(['GET',this.key]);}
 async compareAndSet(expected,next){return (await this.command(['EVAL',CAS_SCRIPT,1,this.key,expected===null?'__missing__':expected,next]))===1;}
}
function fromEnvironment(env=process.env){const url=env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL,token=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;if(url&&token)return new RedisStore({url,token,key:env.GAME_STATE_KEY||'goeul-yut:v14:lobby'});if(env.VERCEL)throw Object.assign(new Error('게임 서버 프로젝트에 Upstash Redis를 연결하고 다시 배포해주세요.'),{status:503});return new MemoryStore();}
module.exports={MemoryStore,RedisStore,fromEnvironment,CAS_SCRIPT};
