


import logging

logging.basicConfig(filename='./logs/sustechpoints.log',
  format='%(asctime)s %(message)s', 
  datefmt='%m:%d:%Y:%I:%M:%S %p',
  level=logging.DEBUG)


import argparse
import configparser
import jwt
import re
import os
import json


import cherrypy
from cherrypy.lib import auth_digest

from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('./'))

import scene_reader
from tools  import check_labels as check
from cherrypy.process.plugins import Monitor

parser = argparse.ArgumentParser(description='start web server for SUSTech POINTS')        
parser.add_argument('--save', type=str, choices=['yes','no'],default='yes', help="")
args = parser.parse_args()

usercfg_file = 'conf/user.conf'
usercfg = configparser.ConfigParser()
usercfg.read(usercfg_file)

authcfg = configparser.ConfigParser()
authcfg.read('conf/auth.conf')




class CfgUpdator():
  def __init__(self, cfg, file):
    self.usercfg = cfg
    self.usercfg_file = file

    
    self.old_time = os.stat(usercfg_file).st_mtime

  def __call__(self):
    mtime = os.stat(usercfg_file).st_mtime
    if mtime > self.old_time:
        self.old_time = mtime
        print('user cfg file changed')
        self.usercfg.read(self.usercfg_file)
    
cfg_updator = CfgUpdator(usercfg, usercfg_file)
Monitor(cherrypy.engine, cfg_updator, frequency=3).subscribe()



def get_user_id():
  if authcfg['global']['auth'] == 'yes':
    if authcfg['global']['method'] == 'password':
      return  cherrypy.request.login
    
    user_token = 'null'
    if 'X-User-Token' in cherrypy.request.headers:
      user_token = cherrypy.request.headers['X-User-Token']
      
    if 'token' in cherrypy.request.params:
      user_token = cherrypy.request.params['token']


    if user_token and user_token != 'null':
      if 'tokens' in authcfg:
        if user_token in authcfg['tokens']:
          return authcfg['tokens'][user_token]

      try:
        secret = authcfg['token']['secret']
        data = jwt.decode(user_token, secret, algorithms='HS256')
        return data['i']
      except:
        return 'guest'

    return 'guest'

  return 'guest'

# Add a Tool to our new Toolbox.
@cherrypy.tools.register('before_handler')
def check_user_access(default=False):
  if authcfg['global']['auth'] == 'yes' and 'scene' in cherrypy.request.params:
    scene = cherrypy.request.params['scene']
    userid = get_user_id()
    print("user id", userid)
    if not re.fullmatch(usercfg[userid]['scenes'], scene):
      raise cherrypy.HTTPError(403)


# Add a Tool to our new Toolbox.
@cherrypy.tools.register('before_handler')
def check_file_access(default=False):
  if authcfg['global']['auth'] == 'yes':
    url = cherrypy.request.path_info
    scene = url.split("/")[2]
    userid = get_user_id()

    print("file auth",  scene, userid)
    if not re.fullmatch(usercfg[userid]['scenes'], scene):
        raise cherrypy.HTTPError(403)
    


# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# sys.path.append(BASE_DIR)

# sys.path.append(os.path.join(BASE_DIR, './algos'))
#import algos.rotation as rotation
from algos import pre_annotate as pre_annotate


#sys.path.append(os.path.join(BASE_DIR, '../tracking'))
#from algos import trajectory as trajectory

# extract_object_exe = "~/code/pcltest/build/extract_object"
# registration_exe = "~/code/go_icp_pcl/build/test_go_icp"

# sys.path.append(os.path.join(BASE_DIR, './tools'))
# import tools.dataset_preprocess.crop_scene as crop_scene

class Root(object):
    @cherrypy.expose
    def index(self, scene="", frame="", token=""):
      tmpl = env.get_template('./build/index.html')
      return tmpl.render()
  
    def user(self, token=""):
      tmpl = env.get_template('./build/index.html')
      return tmpl.render()
    # @cherrypy.expose
    # def icon(self):
    #   tmpl = env.get_template('test_icon.html')
    #   return tmpl.render()

    # @cherrypy.expose
    # def ml(self):
    #   tmpl = env.get_template('test_ml.html')
    #   return tmpl.render()
  
    # @cherrypy.expose
    # def reg(self):
    #   tmpl = env.get_template('registration_demo.html')
    #   return tmpl.render()

    # @cherrypy.expose
    # def view(self, file):
    #   tmpl = env.get_template('view.html')
    #   return tmpl.render()

    # @cherrypy.expose
    # def saveworld(self, scene, frame):

    #   # cl = cherrypy.request.headers['Content-Length']
    #   rawbody = cherrypy.request.body.readline().decode('UTF-8')

    #   with open("./data/"+scene +"/label/"+frame+".json",'w') as f:
    #     f.write(rawbody)
      
    #   return "ok"
class Api(object):
    @cherrypy.expose
    @cherrypy.tools.json_out()
    def saveworldlist(self):

      if args.save=='yes':

        userid = get_user_id()
          
        # cl = cherrypy.request.headers['Content-Length']
        rawbody = cherrypy.request.body.readline().decode('UTF-8')
        data = json.loads(rawbody)
        print('save', userid, data[0]['scene'])
        
        for d in data:
          scene = d["scene"]
          frame = d["frame"]
          ann = d["annotation"]

          if not re.fullmatch(usercfg[userid]['scenes'], scene):
            raise cherrypy.HTTPError(403)
          
          if usercfg[userid]['readonly'] == 'yes':
            logging.info("saving disabled for", userid)
            return {'result':"fail", 'cause':"saving disabled for current user"}

          logging.info(userid +','+ scene +','+ frame +','+ 'saved') 
          with open("./data/"+scene +"/label/"+frame+".json",'w') as f:
            json.dump(ann, f, indent=2, sort_keys=True)
          
        return {'result':"success"}
      else:
        logging.info("saving disabled.")
        return {'result':"fail", 'cause':"saving disabled"}
        
      


    @cherrypy.expose
    @cherrypy.tools.json_out()
    def cropscene(self):
      rawbody = cherrypy.request.body.readline().decode('UTF-8')
      data = json.loads(rawbody)
      
      rawdata = data["rawSceneId"]

      timestamp = rawdata.split("_")[0]

      print("generate scene")
      log_file = "temp/crop-scene-"+timestamp+".log"

      cmd = "python ./tools/dataset_preprocess/crop_scene.py generate "+ \
        rawdata[0:10]+"/"+timestamp + "_preprocessed/dataset_2hz " + \
        "- " +\
        data["startTime"] + " " +\
        data["seconds"] + " " +\
        "\""+ data["desc"] + "\"" +\
        "> " + log_file + " 2>&1"
      print(cmd)

      code = os.system(cmd)

      with open(log_file) as f:
        log = list(map(lambda s: s.strip(), f.readlines()))

      os.system("rm "+log_file)
      
      return {"code": code,
              "log": log
              }


    @cherrypy.expose
    @cherrypy.tools.json_out()
    def checkscene(self, scene):
      ck = check.LabelChecker(os.path.join("./data", scene))
      ck.check()
      #print(ck.messages)
      return ck.messages


    # @cherrypy.expose
    # @cherrypy.tools.json_out()
    # def interpolate(self, scene, frame, obj_id):
    #   # interpolate_num = trajectory.predict(scene, obj_id, frame, None)
    #   # return interpolate_num
    #   return 0

    # data  N*3 numpy array
    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def predict_rotation(self):
      cl = cherrypy.request.headers['Content-Length']
      rawbody = cherrypy.request.body.readline().decode('UTF-8')
      
      data = json.loads(rawbody)
      
      return {"angle": pre_annotate.predict_yaw(data["points"])}
      #return {}

    
    # @cherrypy.expose    
    # @cherrypy.tools.json_out()
    # def auto_annotate(self, scene, frame):
    #   print("auto annotate ", scene, frame)
    #   return pre_annotate.annotate_file('./data/{}/lidar/{}.pcd'.format(scene,frame))
      


    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def load_annotation(self, scene, frame):
      return scene_reader.read_annotations(scene, frame)


    # @cherrypy.expose    
    # @cherrypy.tools.json_out()
    # def load_ego_pose(self, scene, frame):
    #   return scene_reader.read_ego_pose(scene, frame)


    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def load_calib(self, scene, frame):
      return scene_reader.read_calib(scene, frame)

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def loadworldlist(self):
      rawbody = cherrypy.request.body.readline().decode('UTF-8')
      worldlist = json.loads(rawbody)

      # auth
      userid = get_user_id()
      for w in worldlist:
          scene = w["scene"]          
          if not re.fullmatch(usercfg[userid]['scenes'], scene):
            raise cherrypy.HTTPError(403)          
          

      anns = list(map(lambda w:{
                      "scene": w["scene"],
                      "frame": w["frame"],
                      "annotation":scene_reader.read_annotations(w["scene"], w["frame"])},
                      worldlist))

      return anns
        

    # @cherrypy.expose    
    # @cherrypy.tools.json_out()
    # def auto_adjust(self, scene, ref_frame, object_id, adj_frame):
      
    #   #os.chdir("./temp")
    #   os.system("rm ./temp/src.pcd ./temp/tgt.pcd ./temp/out.pcd ./temp/trans.json")


    #   tgt_pcd_file = "./data/"+scene +"/lidar/"+ref_frame+".pcd"
    #   tgt_json_file = "./data/"+scene +"/label/"+ref_frame+".json"

    #   src_pcd_file = "./data/"+scene +"/lidar/"+adj_frame+".pcd"      
    #   src_json_file = "./data/"+scene +"/label/"+adj_frame+".json"

    #   cmd = extract_object_exe +" "+ src_pcd_file + " " + src_json_file + " " + object_id + " " +"./temp/src.pcd"
    #   print(cmd)
    #   os.system(cmd)

    #   cmd = extract_object_exe + " "+ tgt_pcd_file + " " + tgt_json_file + " " + object_id + " " +"./temp/tgt.pcd"
    #   print(cmd)
    #   os.system(cmd)

    #   cmd = registration_exe + " ./temp/tgt.pcd ./temp/src.pcd ./temp/out.pcd ./temp/trans.json"
    #   print(cmd)
    #   os.system(cmd)

    #   with open("./temp/trans.json", "r") as f:
    #     trans = json.load(f)
    #     print(trans)
    #     return trans

    #   return {}

    # @cherrypy.expose    
    # @cherrypy.tools.json_out()
    # def datameta(self):
    #   return scene_reader.get_all_scenes()
    

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def get_user_info(self):
      
      userid = get_user_id()       
      readonly = False

      if usercfg[userid]['readonly'] == 'yes':
        readonly = True

      return {
        'annotator': userid,
        'readonly': readonly
      }

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def scenemeta(self, scene):
      meta = scene_reader.get_one_scene(scene)
      return meta

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def get_all_scene_desc(self):
      
      
      if authcfg['global']['auth'] == 'yes':
        userid = get_user_id()
          
        print("user id", userid)
        scenes = usercfg[userid]['scenes']
      else:
        scenes = ".*"
      return scene_reader.get_all_scene_desc(scenes)

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def objs_of_scene(self, scene):
      return self.get_all_objs(os.path.join("./data",scene))

    def get_all_objs(self, path):
      label_folder = os.path.join(path, "label")
      if not os.path.isdir(label_folder):
        return []
        
      files = os.listdir(label_folder)

      files = filter(lambda x: x.split(".")[-1]=="json", files)


      def file_2_objs(f):
          with open(f) as fd:
              boxes = json.load(fd)
              objs = [x for x in map(lambda b: {"category":b["obj_type"], "id": b["obj_id"]}, boxes)]
              return objs

      boxes = map(lambda f: file_2_objs(os.path.join(path, "label", f)), files)

      # the following map makes the category-id pairs unique in scene
      all_objs={}
      for x in boxes:
          for o in x:
              
              k = str(o["category"])+"-"+str(o["id"])

              if all_objs.get(k):
                all_objs[k]['count']= all_objs[k]['count']+1
              else:
                all_objs[k]= {
                  "category": o["category"],
                  "id": o["id"],
                  "count": 1
                }

      return [x for x in  all_objs.values()]




cherrypy.config.update("./conf/server.conf")


if authcfg['global']['auth'] == 'yes':
  cherrypy.config.update({
    'server.ssl_module': 'builtin',
    'server.ssl_certificate': './conf/cert/cert.crt',
    'server.ssl_private_key': './conf/cert/cert.key',
  })


root_config = {
  '/':{
  'tools.sessions.on': True,
  'tools.staticdir.root': os.path.abspath(os.getcwd()),
  },

  '/static':{
    'tools.staticdir.on': True,
    'tools.staticdir.dir': './build/static',
  },

  '/editor':{
    'tools.staticdir.on': True,
    'tools.staticdir.dir':"./build/editor",
  },

  '/help':{
    'tools.staticdir.on': True,
    'tools.staticdir.dir':"./help",
  }
}


root_config['/data'] = {
      'tools.staticdir.on': True,
      'tools.staticdir.dir': "./data"
    }
api_config = {}

if authcfg['global']['auth'] == 'yes':
  if authcfg['global']['method'] == 'password':
    root_config['/data'] = {
        'tools.staticdir.on': True,
        'tools.staticdir.dir': "./data",
        'tools.caching.on': True,

        'tools.auth_digest.on': True,
        'tools.auth_digest.realm': 'localhost',
        'tools.auth_digest.get_ha1': auth_digest.get_ha1_dict_plain(usercfg["users"]),
        'tools.auth_digest.key': authcfg['password']['key'],
        'tools.auth_digest.accept_charset': 'UTF-8',
        
        'tools.check_file_access.on': True,
        'tools.check_file_access.default': True,
        
      }
  
    api_config = {
      '/':{
        'tools.auth_digest.on': True,
        'tools.auth_digest.realm': 'localhost',
        'tools.auth_digest.get_ha1': auth_digest.get_ha1_dict_plain(usercfg["users"]),
        'tools.auth_digest.key': authcfg['password']['key'],
        'tools.auth_digest.accept_charset': 'UTF-8',
        'tools.check_user_access.on': True,
        'tools.check_user_access.default': True,
        },
    }
  else: #token
    root_config['/data'] = {
        'tools.staticdir.on': True,
        'tools.staticdir.dir': "./data",
        'tools.caching.on': True,
        'tools.gzip.on': True,
        'tools.etags.on': True,
        'tools.etags.autotags': True,
        'tools.response_headers.on': True,
        'tools.response_headers.headers': [
                 ('cache-control', 'public, max-age=604800')
             ],
        'tools.check_file_access.on': True,
        'tools.check_file_access.default': True,
      }
  
    api_config = {
      '/':{
        'tools.check_user_access.on': True,
        'tools.check_user_access.default': True,
        },
    }

cherrypy.tree.mount(Root(), "/", root_config)
cherrypy.tree.mount(Api(), "/api", api_config)

if hasattr(cherrypy.engine, 'block'):
    # 3.1 syntax
    cherrypy.engine.start()
    cherrypy.engine.block()
else:
    # 3.0 syntax
    cherrypy.server.quickstart()
    cherrypy.engine.start()

