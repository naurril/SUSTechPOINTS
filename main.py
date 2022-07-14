
import cherrypy
from cherrypy.lib import auth_digest

import os
import json
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('./'))

import os
#import sys
import scene_reader
from tools  import check_labels as check
import argparse
import configparser


parser = argparse.ArgumentParser(description='start web server for SUSTech POINTS')        
parser.add_argument('--save', type=str, choices=['yes','no'],default='yes', help="")
parser.add_argument('--auth', type=str, choices=['yes','no'],default='no', help="")
args = parser.parse_args()


usercfg = configparser.ConfigParser()
usercfg.read('conf/user.conf')






# Add a Tool to our new Toolbox.
@cherrypy.tools.register('before_handler')
def check_user_access(default=False):
  if args.auth == 'yes' and 'scene' in cherrypy.request.params:
    scene = cherrypy.request.params['scene']
    userid = cherrypy.request.login
    print("user auth", scene, userid)
    if not scene in usercfg[userid]['scenes']:
      raise cherrypy.HTTPError(401)

# Add a Tool to our new Toolbox.
@cherrypy.tools.register('before_handler')
def check_file_access(default=False):
  if args.auth == 'yes':
    url = cherrypy.request.path_info
    scene = url.split("/")[2]
    userid = cherrypy.request.login

    #print("file auth", cherrypy.request.base, cherrypy.request.path_info, scene, userid)
    if not scene in usercfg[userid]['scenes']:
        raise cherrypy.HTTPError(401)
    


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
    def index(self, scene="", frame=""):
      tmpl = env.get_template('./build/index.html')
      return tmpl.render()
# class Help(object):    
#     @cherrypy.expose
#     def index(self):
#       tmpl = env.get_template('./help/help.html')
#       return tmpl.render()
  
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

        userid = cherrypy.request.login
        
          
        # cl = cherrypy.request.headers['Content-Length']
        rawbody = cherrypy.request.body.readline().decode('UTF-8')
        data = json.loads(rawbody)

        for d in data:
          scene = d["scene"]
          frame = d["frame"]
          ann = d["annotation"]

          if not scene in usercfg[userid]['scenes']:
            raise cherrypy.HTTPError(401)
          
          if usercfg[userid]['readonly'] == 'yes':
            print("saving disabled for", userid)
            return {'result':"fail", 'cause':"saving disabled for current user"}

          with open("./data/"+scene +"/label/"+frame+".json",'w') as f:
            json.dump(ann, f, indent=2, sort_keys=True)
          
          return {'result':"success"}
      else:
        print("saving disabled.")
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


    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def load_ego_pose(self, scene, frame):
      return scene_reader.read_ego_pose(scene, frame)


    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def load_calib(self, scene, frame):
      return scene_reader.read_calib(scene, frame)

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def loadworldlist(self):
      rawbody = cherrypy.request.body.readline().decode('UTF-8')
      worldlist = json.loads(rawbody)

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
    def scenemeta(self, scene):
      return scene_reader.get_one_scene(scene)

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def get_all_scene_desc(self):
      
      if args.auth == 'yes':
        scenes = usercfg[cherrypy.request.login]['scenes'].split(',')
      else:
        scenes = []
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

if args.auth=='yes':
  root_config['/data'] = {
      'tools.staticdir.on': True,
      'tools.staticdir.dir': "./data",
      'tools.auth_digest.on': True,
      'tools.auth_digest.realm': 'localhost',
      'tools.auth_digest.get_ha1': auth_digest.get_ha1_dict_plain(usercfg["users"]),
      'tools.auth_digest.key': 'a565c27146791cfb',
      'tools.auth_digest.accept_charset': 'UTF-8',
      'tools.check_file_access.on': True,
      'tools.check_file_access.default': True,
    }
  
    


  api_config = {
    '/':{
      'tools.auth_digest.on': True,
      'tools.auth_digest.realm': 'localhost',
      'tools.auth_digest.get_ha1': auth_digest.get_ha1_dict_plain(usercfg["users"]),
      'tools.auth_digest.key': 'a565c27146791cfb',
      'tools.auth_digest.accept_charset': 'UTF-8',
      'tools.check_user_access.on': True,
      'tools.check_user_access.default': True,
    },
  }

else:
  root_config['/data'] = {
      'tools.staticdir.on': True,
      'tools.staticdir.dir': "./data"
    }
  api_config = {}

cherrypy.tree.mount(Root(), "/", root_config)
cherrypy.tree.mount(Api(), "/api", api_config)
# cherrypy.tree.mount(Help(), "/help")

if hasattr(cherrypy.engine, 'block'):
    # 3.1 syntax
    cherrypy.engine.start()
    cherrypy.engine.block()
else:
    # 3.0 syntax
    cherrypy.server.quickstart()
    cherrypy.engine.start()

