// Validate untrusted CSV structure before the existing catalogue parser handles it.
export function validateCSVStructure(input) {
  const data=String(input ?? '').replace(/^\uFEFF/,'');
  if (!data.trim()) return;
  const firstLine=data.split(/\r?\n/,1)[0];
  const candidates=[',',';','\t','|'];
  const delimiter=candidates.map(d=>({d,n:firstLine.split(d).length-1})).sort((a,b)=>b.n-a.n)[0].d;
  let quoted=false,afterQuote=false,cell='',row=[],rowNumber=1,expected=null,headers=null;
  function finishCell() {row.push(cell);cell='';afterQuote=false;}
  function finishRow() {
    if (!row.some(v=>v.trim())) {row=[];return;}
    if (expected===null) {
      expected=row.length;
      headers=row.map(h=>h.trim().toLowerCase().replace(/[\s.\-/\\]+/g,'_').replace(/[^a-z0-9_]/g,'').replace(/_+/g,'_').replace(/^_+|_+$/g,''));
      if (headers.some(h=>!h) || new Set(headers).size!==headers.length) throw new Error('Invalid or duplicate CSV headers');
    } else if (row.length!==expected) throw new Error('CSV row '+rowNumber+' has '+row.length+' fields; expected '+expected);
    row=[];
  }
  for(let i=0;i<data.length;i++) {
    const c=data[i];
    if(quoted) {
      if(c==='"') {if(data[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}
      else cell+=c;
    } else if(c==='"' && !cell.trim() && !afterQuote) {quoted=true;cell='';}
    else if(c===delimiter){finishCell();}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&data[i+1]==='\n')i++;finishCell();finishRow();rowNumber++;}
    else if(afterQuote && c!==' ' && c!=='\t')throw new Error('Unexpected characters after CSV closing quote at row '+rowNumber);
    else if(c==='"')throw new Error('Unexpected CSV quote at row '+rowNumber);
    else cell+=c;
  }
  if(quoted)throw new Error('Malformed CSV: unclosed quoted value');
  if(cell.length||row.length){finishCell();finishRow();}
}
