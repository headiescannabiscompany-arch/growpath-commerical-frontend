import fs from "fs";
import path from "path";
const roots = ["src"];
const re = /\bcan\(\s*['"`]+(?<k>[^'"`]+)['"`]\s*\)/g;
const keys = new Map();
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p = path.join(dir, ent.name);
    if(ent.isDirectory()) walk(p);
    else if(/\.(js|jsx|ts|tsx)$/.test(ent.name)){
      const s = fs.readFileSync(p, "utf8");
      let m; while((m = re.exec(s))){
        const k = m.groups.k.trim();
        keys.set(k, (keys.get(k) || 0) + 1);
      }
    }
  }
}
for(const r of roots){ if(fs.existsSync(r)) walk(r); }
const out = [...keys.entries()].sort((a,b)=>b[1]-a[1]).map(([k,count])=>({key:k,count}));
fs.writeFileSync("tmp/spec/capability_keys.json", JSON.stringify(out,null,2));
console.log("Wrote tmp/spec/capability_keys.json with", out.length, "keys");
