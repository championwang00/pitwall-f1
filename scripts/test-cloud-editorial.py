import importlib.util,pathlib,tempfile,unittest,io
from PIL import Image
s=importlib.util.spec_from_file_location('news','scripts/cloud-editorial.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class NewsTests(unittest.TestCase):
 def test_official_redirects_and_boundaries(self):
  request=m.urllib.request.Request('https://www.formula1.com/en/latest/all')
  handler=m.ApprovedRedirect(m.ARTICLE_HOSTS)
  allowed=handler.redirect_request(request,None,302,'',{},'https://www.formula1.com/en/latest')
  self.assertEqual(allowed.full_url,'https://www.formula1.com/en/latest')
  for target in ['http://www.formula1.com/en/latest','https://evil.com/','https://user:pass@www.formula1.com/','https://www.formula1.com:8443/']:
   with self.assertRaises(ValueError):handler.redirect_request(request,None,302,'',{},target)

 def setUp(self):
  self.source={'url':'https://www.formula1.com/en/latest/article/test.id','title':'Team special livery','text':'The team revealed a special livery for Singapore.','publishedAt':'2026-10-05T12:00:00Z','images':[],'socialUrls':[]}
  self.catalog={'year':2026,'drivers':[{'id':'driver'}],'teams':[{'id':'audi','chassis':'audi-r26'}],'races':[{'year':2026,'round':17,'gp':'singapore'}]}
  self.item={'title':'特别涂装','text':'新加坡特别涂装发布。','kind':'livery','eventYear':2026,'gp':'singapore','teamId':'audi','driverIds':['driver','invented'],'liveryName':'特别涂装','evidence':'revealed a special livery for Singapore'}
 def test_correct_race_and_no_invented_entity(self):
  with tempfile.TemporaryDirectory() as d:
   notes,liveries=m.build(self.source,[self.item],self.catalog,pathlib.Path(d));self.assertEqual(notes[0]['related']['drivers'],['driver']);self.assertEqual(liveries[0]['rounds'],[17])
 def test_official_race_url_overrides_model(self):
  source={**self.source,'url':'https://www.mclaren.com/racing/formula-1/2026/singapore-grand-prix/spotted-in-the-paddock/'}
  catalog={**self.catalog,'races':self.catalog['races']+[{'year':2026,'round':18,'gp':'united-states'}]}
  with tempfile.TemporaryDirectory() as d:
   notes,liveries=m.build(source,[dict(self.item,gp='united-states')],catalog,pathlib.Path(d))
   self.assertEqual(notes[0]['related']['races'],[]);self.assertEqual(liveries,[])
 def test_historical_livery_never_becomes_current(self):
  with tempfile.TemporaryDirectory() as d:
   notes,liveries=m.build(self.source,[dict(self.item,eventYear=2025)],self.catalog,pathlib.Path(d));self.assertEqual(liveries,[]);self.assertEqual(notes[0]['related']['races'],[])
 def test_evidence_required_and_social_links_not_invented(self):
  with tempfile.TemporaryDirectory() as d:
   self.assertEqual(m.build(self.source,[dict(self.item,evidence='invented claim')],self.catalog,pathlib.Path(d))[0],[])
   notes,_=m.build(self.source,[dict(self.item,socialUrl='https://evil.com')],self.catalog,pathlib.Path(d));self.assertEqual(len(notes[0]['sources']),1)
 def test_extra_driver_is_rejected(self):
  catalog={**self.catalog,'drivers':[{'id':'fernando-alonso','name':'Fernando Alonso','nameZh':'费尔南多·阿隆索'}]}
  with tempfile.TemporaryDirectory() as d:
   self.assertEqual(m.build(self.source,[dict(self.item,text='阿隆索发布特别涂装。')],catalog,pathlib.Path(d))[0],[])
 def test_compressed_dimensions_and_bytes(self):
  image=Image.new('RGB',(3000,2000),'red');buf=io.BytesIO();image.save(buf,'PNG');old=m.fetch;m.fetch=lambda *a:buf.getvalue()
  try:
   with tempfile.TemporaryDirectory() as d:
    pic=m.compress('https://media.formula1.com/test',pathlib.Path(d));self.assertLessEqual(pic['bytes'],180000);self.assertLessEqual(pic['width'],1200);self.assertEqual(len(list((pathlib.Path(d)/'images').glob('*.webp'))),1)
  finally:m.fetch=old
if __name__=='__main__':unittest.main()
