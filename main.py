import random
import string

import cherrypy
import os
import json
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('./'))

import os
import sys
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, 'pointnet'))
import predict


extract_object_exe = "~/code/pcltest/build/extract_object"
registration_exe = "~/code/go_icp_pcl/build/test_go_icp"


class Root(object):
    @cherrypy.expose
    def index(self):
      tmpl = env.get_template('index.html')
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
    def save(self, scene, frame):
      cl = cherrypy.request.headers['Content-Length']
      rawbody = cherrypy.request.body.read(int(cl)).decode('UTF-8')
      print(rawbody)
      with open("./data/"+scene +"/label/"+frame+".json",'w') as f:
        f.write(rawbody)
      
      return "ok"


    # data  N*3 numpy array
    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def predict_rotation(self):
      cl = cherrypy.request.headers['Content-Length']
      rawbody = cherrypy.request.body.read(int(cl))
      
      data = json.loads(rawbody)
      
      return {"angle": int(predict.predict(data["points"]))}

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def load_annotation(self, scene, frame):
      filename = "./data/"+scene +"/label/"+ frame + ".json"
      if (os.path.isfile(filename)):
        with open(filename,"r") as f:
          ann=json.load(f)
          print(ann)          
          return ann
      else:
        return []

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
      data = []

      scenes = os.listdir("./data")
      print(scenes)
      scenes.sort()

      for s in scenes:
        scene = {
          "scene": s,
          "frames": []
        }

        if os.path.exists(os.path.join("./data", s, "disable")):
          print(s, "disabled")
          continue
        
        data.append(scene)

        frames = os.listdir("./data/"+s+"/pcd")
        #print(s, frames)
        frames.sort()

        scene["pcd_ext"]="pcd"
        for f in frames:
          #if os.path.isfile("./data/"+s+"/pcd/"+f):
            filename, fileext = os.path.splitext(f)
            scene["frames"].append(filename)
            scene["pcd_ext"] = fileext
        
        point_transform_matrix=[]

        if os.path.isfile("./data/"+s+"/point_transform.txt"):
          with open("./data/"+s+"/point_transform.txt")  as f:
            point_transform_matrix=f.read()
            point_transform_matrix = point_transform_matrix.split(",")

        def strip_str(x):
          return x.strip()


        
        # calib_file = "./data/"+s+"/calib.txt"
        # if os.path.isfile(calib_file):
        #   calib["image"] = {}
        #   with open(calib_file)  as f:
        #     lines = f.readlines()
        #     calib["image"]["extrinsic"] = map(strip_str, lines[0].strip().split(","))
        #     calib["image"]["intrinsic"] = lines[1].strip().split(",") 

        # calibleft={}
        # calib_file = "./data/"+s+"/calib_left.txt"
        # if os.path.isfile(calib_file):
        #   calib["left"] = {}
        #   with open(calib_file)  as f:
        #     lines = f.readlines()
        #     calib["left"]["extrinsic"] = map(strip_str, lines[0].strip().split(","))
        #     calib["left"]["intrinsic"] = lines[1].strip().split(",") 

        # calibright={}
        # calib_file = "./data/"+s+"/calib_right.txt"
        # if os.path.isfile(calib_file):
        #   calib["right"] = {}
        #   with open(calib_file)  as f:
        #     lines = f.readlines()
        #     calib["right"]["extrinsic"] = map(strip_str, lines[0].strip().split(","))
        #     calib["right"]["intrinsic"] = lines[1].strip().split(",") 
        calib={}
        if os.path.exists("./data/"+s+"/calib"):
          calibs = os.listdir("./data/"+s+"/calib")
          for c in calibs:
            calib_file = "./data/"+s+"/calib/" + c
            calib_name, _ = os.path.splitext(c)
            if os.path.isfile(calib_file):
              print(calib_file)
              with open(calib_file)  as f:
                cal = json.load(f)
                calib[calib_name] = cal

        # camera names
        image = []
        image_ext = ""
        cam_path = "./data/"+s+"/image"
        if os.path.exists(cam_path):
          if os.path.exists(cam_path):
            cams = os.listdir(cam_path)
            for c in cams:
              cam_file = "./data/"+s+"/image/" + c
              if os.path.isdir(cam_file):

                if image:
                  image.append(c)
                else:
                  image = [c]

                if image_ext == "":
                  #detect image file ext
                  files = os.listdir(cam_file)
                  if len(files)>=2:
                    _,image_ext = os.path.splitext(files[0])

        if image_ext == "":
          image_ext = ".jpg"
        scene["image_ext"] = image_ext


        if not os.path.isdir("./data/"+s+"/bbox.xyz"):
          scene["boxtype"] = "psr"
          if point_transform_matrix:
            scene["point_transform_matrix"] = point_transform_matrix
          if calib:
            scene["calib"] = calib
          if image:
            scene["image"] = image
        else:
          scene["boxtype"] = "xyz"
          if point_transform_matrix:
            scene["point_transform_matrix"] = point_transform_matrix
          if calib:
            scene["calib"] = calib
          if image:
            scene["image"] = image


      print(data)
      return data
      # return [
      #         {
      #           "scene":"liuxian1",
      #           "frames": [
      #             "000242","000441"
      #           ],
      #           "boxtype":"xyz",
      #           "point_transform_matrix": [
      #             1, 0, 0, 
      #             0, 0, 1, 
      #             0, -1, 0,
      #           ]
      #         },
      #         {
      #           "scene":"liuxian2",
      #           "frames": [
      #             "test"
      #           ],
      #           "boxtype":"psr",
      #         },
      #        ]
    
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

      all_objs={}
      for x in boxes:
          for o in x:
              all_objs[o["category"]+"-"+o["id"]]=o
      objs = [x for x in all_objs.values()]
      objs.sort()
      return objs

if __name__ == '__main__':
  cherrypy.quickstart(Root(), '/', config="server.conf")

