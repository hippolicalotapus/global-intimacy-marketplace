import unittest,tempfile,sys
from pathlib import Path
from zipfile import ZipFile
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent.parent/'production'))
from offline_export import export_sample,PROFILES
class ExportTests(unittest.TestCase):
 def test_all_processes(self):
  for method in PROFILES:
   with self.subTest(method=method),tempfile.TemporaryDirectory() as d:
    m=export_sample('Coffee First',method,d)
    self.assertEqual((m['widthPx'],m['heightPx']),(3600,4800))
    self.assertFalse(m['productionApproved'])
    self.assertEqual(m['exactWording'],'Coffee First')
    im=Image.open(Path(d)/m['artworkFile'])
    self.assertEqual(im.size,(3600,4800))
    self.assertEqual(im.getpixel((0,0))[3],255 if method=='sublimation' else 0)
    with ZipFile(Path(d)/f'sample_{method}_package.zip') as z:self.assertEqual(set(z.namelist()),{'manifest.json',m['artworkFile']})
 def test_unsafe_text(self):
  with tempfile.TemporaryDirectory() as d:
   for text in ('','hi\nbye','x'*81):
    with self.assertRaises(ValueError):export_sample(text,'dtg',d)
 def test_no_unearned_approval(self):
  with tempfile.TemporaryDirectory() as d:
   m=export_sample('Hello','dtf',d,True,True)
   self.assertFalse(m['productionApproved'])
 def test_unsupported(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(ValueError):export_sample('Hello','embroidery',d)
if __name__=='__main__':unittest.main()
