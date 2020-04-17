import random
import string

import cherrypy
import os
import json
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('./'))

import os
import sys
import scene_reader

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

sys.path.append(os.path.join(BASE_DIR, './algos'))
import algos.rotation as rotation

#sys.path.append(os.path.join(BASE_DIR, '../tracking'))
import algos.trajectory as trajectory

extract_object_exe = "~/code/pcltest/build/extract_object"
registration_exe = "~/code/go_icp_pcl/build/test_go_icp"


class Root(object):
    @cherrypy.expose
    def index(self, batch=False):
      tmpl = env.get_template('index.html')
      return tmpl.render()
  
    @cherrypy.expose
    def icon(self):
      tmpl = env.get_template('test_icon.html')
      return tmpl.render()

    @cherrypy.expose
    def ml(self):
      tmpl = env.get_template('test_ml.html')
      return tmpl.render()
  
    @cherrypy.expose
    def reg(self):
      tmpl = env.get_template('registration_demo.html')
      return tmpl.render()

    @cherrypy.expose
    def view(self, file):
      tmpl = env.get_template('view.html')
      return tmpl.render()

    @cherrypy.expose
    def saveworld(self, scene, frame):

      # cl = cherrypy.request.headers['Content-Length']
      rawbody = cherrypy.request.body.readline().decode('UTF-8')

      with open("./data/"+scene +"/label/"+frame+".json",'w') as f:
        f.write(rawbody)
      
      return "ok"

    @cherrypy.expose
    def saveworldlist(self):

      # cl = cherrypy.request.headers['Content-Length']
      rawbody = cherrypy.request.body.readline().decode('UTF-8')
      data = json.loads(rawbody)

      for d in data:
        scene = d["scene"]
        frame = d["frame"]
        ann = d["annotation"]
        with open("./data/"+scene +"/label/"+frame+".json",'w') as f:
          json.dump(ann, f)

      return "ok"



    @cherrypy.expose
    @cherrypy.tools.json_out()
    def interpolate(self, scene, frame, obj_id):
      # interpolate_num = trajectory.predict(scene, obj_id, frame, None)
      # return interpolate_num
      return 0

    # data  N*3 numpy array
    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def predict_rotation(self):
      cl = cherrypy.request.headers['Content-Length']
      rawbody = cherrypy.request.body.readline().decode('UTF-8')
      
      data = json.loads(rawbody)
      
      return {"angle": rotation.predict(data["points"])}
      #return {}

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def load_annotation(self, scene, frame):
      return scene_reader.read_annotations(scene, frame)

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
        

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def auto_adjust(self, scene, ref_frame, object_id, adj_frame):
      
      #os.chdir("./temp")
      os.system("rm ./temp/src.pcd ./temp/tgt.pcd ./temp/out.pcd ./temp/trans.json")


      tgt_pcd_file = "./data/"+scene +"/pcd/"+ref_frame+".pcd"
      tgt_json_file = "./data/"+scene +"/label/"+ref_frame+".json"

      src_pcd_file = "./data/"+scene +"/pcd/"+adj_frame+".pcd"      
      src_json_file = "./data/"+scene +"/label/"+adj_frame+".json"

      cmd = extract_object_exe +" "+ src_pcd_file + " " + src_json_file + " " + object_id + " " +"./temp/src.pcd"
      print(cmd)
      os.system(cmd)

      cmd = extract_object_exe + " "+ tgt_pcd_file + " " + tgt_json_file + " " + object_id + " " +"./temp/tgt.pcd"
      print(cmd)
      os.system(cmd)

      cmd = registration_exe + " ./temp/tgt.pcd ./temp/src.pcd ./temp/out.pcd ./temp/trans.json"
      print(cmd)
      os.system(cmd)

      with open("./temp/trans.json", "r") as f:
        trans = json.load(f)
        print(trans)
        return trans

      return {}

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def datameta(self):
      return scene_reader.get_all_scenes()
    
    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def objs_of_scene(self, scene):
      return self.get_all_unique_objs(os.path.join("./data",scene))

    def get_all_unique_objs(self, path):
      files = os.listdir(os.path.join(path, "label"))

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
              all_objs[o["category"]+"-"+str(o["id"])]=o

      objs = [x for x in all_objs.values()]
      #print(objs)
      #objs.sort()
      return objs

if __name__ == '__main__':
    cherrypy.quickstart(Root(), '/', config="server.conf")
else:
    application = cherrypy.Application(Root(), '/', config="server.conf")
