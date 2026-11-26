// Synthetic Chromium harness ONLY: real disposable PostgreSQL + fake Supabase Auth gateway + in-memory email sink.
// Never linked to hosted resources; does not validate hosted Auth or real email deliverability.
import {execFileSync,spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,readdirSync} from 'node:fs';
const dockerEnv={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[k];
const name=`hm-native-browser-${process.pid}-${Date.now()}`;
const docker=(args,input)=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],{env:dockerEnv,input,encoding:'utf8',stdio:['pipe','pipe','pipe']});
const sql=(statement)=>docker(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-qAt'],statement);
const quote=value=>value==null?'null':`'${String(value).replaceAll("'","''")}'`;
const admin='ca700000-0000-4000-8000-000000000001';
const service='synthetic-native-service-role';
let child,server,stopping=false;
const messages=new Map();
function stop(code=0){if(stopping)return;stopping=true;child?.kill('SIGTERM');server?.close();try{docker(['stop',name]);}catch{}process.exit(typeof code==='number'?code:0);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);process.on('exit',()=>{try{docker(['stop',name]);}catch{}});
try{
 docker(['run','-d','--rm','--network','none','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine']);
 let ready=false;for(let i=0;i<300;i++){try{docker(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}
 if(!ready)throw Error('local_database_not_ready');
 sql(`create role anon;create role authenticated;create role service_role;create schema auth;grant usage on schema auth to public;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())sql(readFileSync(`supabase/migrations/${file}`,'utf8'));
 sql(`insert into auth.users values('${admin}');insert into public.admins values('${admin}');`);
 server=createServer(async(req,res)=>{
  const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
   if(req.url==='/auth/v1/user')return req.headers.authorization==='Bearer synthetic-admin-token'?send(200,{id:admin,aud:'authenticated',role:'authenticated'}):send(401,{message:'invalid test identity'});
   let text='';for await(const chunk of req){text+=chunk;if(text.length>65536)return send(413,{});}
   if(req.url==='/rest/v1/rpc/native_consultation_command'){
    if(req.headers.apikey!==service || req.headers.authorization!==`Bearer ${service}`)return send(403,{message:'forbidden'});
    const p=JSON.parse(text);const result=sql(`set role service_role;select public.native_consultation_command(${quote(p.p_action)},${quote(p.p_id)}::uuid,${quote(p.p_actor)}::uuid,${quote(JSON.stringify(p.p_data))}::jsonb)::text;`).trim();
    return send(200,result?JSON.parse(result):null);
   }
   if(req.url==='/send'){
    const key=req.headers['idempotency-key'];const message=JSON.parse(text);
    if(!key || !['synthetic@example.test','second@example.test'].includes(message.to))return send(403,{});
    const existing=messages.get(key);if(existing && JSON.stringify(existing.message)!==JSON.stringify(message))return send(409,{});
    if(!existing)messages.set(key,{id:`synthetic-mail-${messages.size+1}`,message});
    return send(200,{id:messages.get(key).id});
   }
   if(req.url?.startsWith('/test/state/')){
    const id=req.url.slice('/test/state/'.length);if(!/^[a-f0-9-]{36}$/.test(id))return send(400,{});
    const row=sql(`select json_build_object('status',workflow_status,'bookingStatus',booking_status,'paymentStatus',payment_status)::text from public.consultation_bookings where id=${quote(id)}::uuid;`).trim();
    return send(200,{booking:row?JSON.parse(row):null,messages:[...messages.values()].filter(m=>m.message.text.includes(id))});
   }
   send(404,{});
  }catch(error){const message=String(error.stderr||'').match(/ERROR:  (forbidden|conflict|rate_limited|not_found|busy)/)?.[1]||'unavailable';send(400,{message,code:'P0001'});}
 });
 await new Promise(resolve=>server.listen(3250,'127.0.0.1',resolve));
 child=spawn('node',['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3210'],{stdio:'inherit',env:{...process.env,
  BETA_FIXTURES:'synthetic',CONSULTATION_BOOKING_ENABLED:'true',CONSULTATION_POLICIES_APPROVED:'true',CONSULTATION_NONPRODUCTION_APPROVED:'true',CONSULTATION_APP_ORIGIN:'http://127.0.0.1:3210',
  CONSULTATION_SUPABASE_URL:'http://127.0.0.1:3250',CONSULTATION_SUPABASE_SERVICE_ROLE_KEY:service,CONSULTATION_TEST_RECIPIENTS:'synthetic@example.test,second@example.test',
  CONSULTATION_EMAIL_TEST_ENABLED:'true',CONSULTATION_EMAIL_TEST_ENDPOINT:'http://127.0.0.1:3250/send',CONSULTATION_SYNTHETIC_HARNESS:'true',CONSULTATION_EMAIL_FROM:'synthetic@example.test',
  CONSULTATION_MANUAL_TEST_VERIFICATION_ENABLED:'true',CONSULTATION_SCHEDULING_APPROVED:'true',CONSULTATION_TEST_SCHEDULING_URL:'https://schedule.example.test/synthetic-booking',CONSULTATION_PAYMENT_INSTRUCTIONS_APPROVED:'false',
 }});child.on('exit',stop);
}catch{console.error('Synthetic consultation harness failed; no remote fallback.');stop(1);}
