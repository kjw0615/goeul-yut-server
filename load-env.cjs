const fs=require('node:fs'),path=require('node:path'),file=path.join(__dirname,'.env.local');
if(fs.existsSync(file))for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);if(m&&process.env[m[1]]===undefined)process.env[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}
