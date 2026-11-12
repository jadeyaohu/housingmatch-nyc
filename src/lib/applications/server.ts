import"server-only";
import{currentUser,serverClient}from"@/lib/supabase/server";
export async function ownedClient(req?:Request){
 if(req){
  const origin=req.headers.get("origin"),host=req.headers.get("host")||new URL(req.url).host;
  try{const u=new URL(origin??"");if(u.origin!==origin||u.host!==host||(!["localhost","127.0.0.1"].includes(u.hostname)&&u.protocol!=="https:"))throw Error();}catch{throw Error("forbidden");}
 }
 const user=await currentUser(),db=await serverClient();if(!user||!db)throw Error("unauthenticated");return{user,db};
}
