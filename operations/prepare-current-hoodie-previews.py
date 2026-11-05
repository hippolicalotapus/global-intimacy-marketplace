"""Render web placement diagrams from existing approved PNG exports, without regenerating art."""
from pathlib import Path
from PIL import Image
import zipfile,io,base64,hashlib,json,html,sys,subprocess,tempfile
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
out=root/'site/assets/apparel/current'
out.mkdir(parents=True,exist_ok=True)
names=['Three Sisters','Mount Rundle','Castle Mountain','Mount Assiniboine','Mount Temple','Ten Peaks','Mount Edith Cavell','Yamnuska','Crowsnest Mountain']
colours=['#193f35','#182831','#171b1e','#182831','#e9e2d6','#193f35','#171b1e','#a8a8a5','#e9e2d6']
path='M180 104 C164 95 146 102 126 118 L80 148 L26 294 L80 317 L112 242 L112 574 Q266 596 420 574 L420 242 L452 317 L506 294 L452 148 L406 118 C386 102 368 95 352 104 C344 60 314 34 266 34 C218 34 188 60 180 104 Z'
manifest=[]
with zipfile.ZipFile(source) as z:
 def web_image(n):
  raw=z.read(n);im=Image.open(io.BytesIO(raw)).convert('RGBA');buf=io.BytesIO();im.save(buf,format='WEBP',lossless=True,method=6,exact=True)
  data=buf.getvalue();check=Image.open(io.BytesIO(data)).convert('RGBA');assert check.tobytes()==im.tobytes()
  return 'data:image/webp;base64,'+base64.b64encode(data).decode(),hashlib.sha256(raw).hexdigest(),im.size
 chest={}
 for light in [False,True]:
  n='03_Shared_Chest_3in/ONE_HEART_chest_3x3in_'+('LIGHT_GARMENTS_NAVY_TYPE' if light else 'DARK_GARMENTS_IVORY_TYPE')+'.png'
  chest[light]=web_image(n)
 for i,(name,colour) in enumerate(zip(names,colours),1):
  code=f'OH-H{i:02d}'
  n=f'01_Compact_7p2in_NATIVE_300ppi/{code}_back_7p2x6p12in_NATIVE300.png'
  art,sha,size=web_image(n);front,chest_sha,chest_size=chest[i in (5,8,9)]
  meta={'designId':code,'approvedBackSource':n,'backPngSha256':sha,'backNativePixels':size,'chestPngSha256':chest_sha,'chestNativePixels':chest_size,'webConversion':'Lossless WebP, unchanged RGBA pixels','status':'Placement illustration. Physical print size, garment, fit and manufacturer acceptance remain pending.'}
  def garment(x,back=False):
   # Full silhouette remains inside each 560 x 680 frame. Art is a layout diagram, not a manufacturing template.
   features='<path d="M180 104 Q266 172 352 104 M218 127 L210 224 M314 127 L322 224" fill="none" stroke="#78908a" stroke-width="4"/>'
   if not back:
    features+='<path d="M163 449 L369 449 L390 522 L142 522 Z" fill="none" stroke="#78908a" stroke-width="3"/>'
    if i in (3,8):features+='<path d="M266 150 V582" stroke="#849791" stroke-width="4"/>'
   placement=(f'<image href="{art}" x="126" y="211" width="280" height="238" preserveAspectRatio="xMidYMid meet"/>' if back else f'<image href="{front}" x="304" y="204" width="80" height="80" preserveAspectRatio="xMidYMid meet"/>')
   return f'<g transform="translate({x} 72)"><path d="{path}" fill="{colour}" stroke="#758d88" stroke-width="3"/>{features}{placement}<text x="266" y="635" text-anchor="middle" fill="#143943" font-family="Arial,sans-serif" font-size="24" font-weight="700">'+('BACK' if back else 'FRONT')+'</text></g>'
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="820" viewBox="0 0 1200 820"><title>{code} {html.escape(name)} — complete front and back placement illustration</title><metadata>{html.escape(json.dumps(meta))}</metadata><rect width="1200" height="820" fill="#f3f1ea"/><text x="600" y="46" text-anchor="middle" fill="#143943" font-family="Arial,sans-serif" font-size="27" font-weight="700">{code} · {html.escape(name)}</text>{garment(30)}{garment(630,True)}<text x="600" y="764" text-anchor="middle" fill="#506962" font-family="Arial,sans-serif" font-size="20">Current approved artwork · Placement illustration, not manufactured stock</text><text x="600" y="795" text-anchor="middle" fill="#506962" font-family="Arial,sans-serif" font-size="18">Final garment, print dimensions and sample acceptance pending</text></svg>'
  p=out/f'{code.lower()}-placement.svg';p.write_text(svg)
  thumbnail=p.with_suffix('.webp')
  with tempfile.TemporaryDirectory() as tmp:
   png=Path(tmp)/'preview.png'
   subprocess.run(['inkscape',str(p),'--export-type=png','--export-width=960','--export-filename='+str(png)],check=True,capture_output=True)
   Image.open(png).convert('RGB').save(thumbnail,format='WEBP',quality=92,method=6)
  manifest.append({**meta,'webPath':str(p.relative_to(root)),'thumbnailPath':str(thumbnail.relative_to(root)),'thumbnailNote':'960-pixel rendered web preview. Open the full SVG board for native source detail.','svgSha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(root/'operations/CURRENT_HOODIE_ARTWORK_2026-11-05.json').write_text(json.dumps({'sourceLibraryId':'libfile_8f9b6612ad9c819196f7e9693efa98ad','designs':manifest},indent=2)+'\n')
print('Prepared nine full-garment diagrams; all artwork pixels preserved through lossless conversion.')
