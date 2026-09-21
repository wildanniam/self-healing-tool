/** Supported textual rewrites only. Every result still needs browser validation. */
export function normalizeSelectors(selector:string|null):string[]{
  if(selector===null||!selector.trim()||selector.trim()==='null')return [];
  const syntax=selector.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,'""');
  if(/:(?:nth|nth-last)-(?:child|of-type)\s*\(|:(?:first|last|only)-(?:child|of-type)\b|\bnth\s*=|\[\s*\d+\s*\]|\b(?:position|last)\s*\(/i.test(syntax))return [];
  const alternatives=[selector.trim()];
  const pseudo=selector.match(/^(.*?):(?:text|contains)\(\s*(['"])(.*?)\2\s*\)\s*$/);
  if(pseudo){const base=pseudo[1]!.trim()||'*',literal=JSON.stringify(pseudo[3]!.replace(/\s+/g,' ').trim());alternatives.push(`${base}:text-is(${literal})`,`${base} >> text=${literal}`);}
  const xpath=selector.replace(/^xpath=/,'').match(/^\/\/([a-z][\w-]*|\*)\[normalize-space\(\.\)\s*=\s*(['"])(.*?)\2\]$/i);
  if(xpath){const tag=xpath[1]!,literal=JSON.stringify(xpath[3]!);alternatives.push(`${tag}:text-is(${literal})`);}
  const text=selector.match(/^text\s*=\s*(['"])(.*?)\1$/);
  if(text)for(const tag of ['button','a','label','summary','option'])alternatives.push(`${tag}:text-is(${JSON.stringify(text[2]!)})`);
  return [...new Set(alternatives)];
}
