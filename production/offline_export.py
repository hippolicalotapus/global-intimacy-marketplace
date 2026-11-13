"""Offline SAMPLE artwork export. Never claims printer approval."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json, hashlib, re
PROFILES={'dtg':{'width_in':12,'height_in':16,'dpi':300,'transparent':True,'mirror':False},'dtf':{'width_in':12,'height_in':16,'dpi':300,'transparent':True,'mirror':False},'sublimation':{'width_in':12,'height_in':16,'dpi':300,'transparent':False,'mirror':True}}
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def export_sample(saying,method,folder,supplier_verified=False,rights_cleared=False):
 if method not in PROFILES: raise ValueError('Unsupported process')
 if not isinstance(saying,str) or not saying.strip() or len(saying)>80 or re.search(r'[\x00-\x1f\x7f]',saying): raise ValueError('Invalid wording')
 if not Path(FONT).is_file(): raise RuntimeError('Font missing')
 p=PROFILES[method];folder=Path(folder);folder.mkdir(parents=True,exist_ok=True)
 w,h=p['width_in']*p['dpi'],p['height_in']*p['dpi']
 img=Image.new('RGBA',(w,h),(255,255,255,255) if not p['transparent'] else (0,0,0,0))
 d=ImageDraw.Draw(img);size=200
 while size>20:
  font=ImageFont.truetype(FONT,size);box=d.textbbox((0,0),saying,font=font)
  if box[2]-box[0]<=w-200:break
  size-=4
 if box[2]-box[0]>w-200:raise ValueError('Wording cannot fit at legible size')
 x=(w-(box[2]-box[0]))//2-box[0];y=(h-(box[3]-box[1]))//2-box[1]
 d.text((x,y),saying,font=font,fill=(22,22,22,255))
 if p['mirror']:img=img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 filename=f'sample_{method}.png';target=folder/filename;img.save(target,dpi=(p['dpi'],p['dpi']))
 with Image.open(target) as check:assert check.size==(w,h) and check.mode=='RGBA'
 manifest={'schemaVersion':1,'sampleOnly':True,'productionApproved':False,'preflight':{'pixelDimensionsValid':True,'wordingVerifiedAgainstInput':True,'supplierVerified':supplier_verified,'rightsCleared':rights_cleared,'manualArtworkReviewRequired':True},'method':method,'exactWording':saying,'widthPx':w,'heightPx':h,'dpi':p['dpi'],'transparent':p['transparent'],'mirrored':p['mirror'],'artworkFile':filename,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'reason':'Illustrative sample; machine and artwork approval required'}
 (folder/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
 with ZipFile(folder/f'sample_{method}_package.zip','w',ZIP_DEFLATED) as z:z.write(target,filename);z.write(folder/'manifest.json','manifest.json')
 return manifest
