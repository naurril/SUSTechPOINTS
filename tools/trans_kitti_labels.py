
# kitti label format
# #Values    Name      Description
# ----------------------------------------------------------------------------
#    1    type         Describes the type of object: 'Car', 'Van', 'Truck',
#                      'Pedestrian', 'Person_sitting', 'Cyclist', 'Tram',
#                      'Misc' or 'DontCare'
#    1    truncated    Float from 0 (non-truncated) to 1 (truncated), where
#                      truncated refers to the object leaving image boundaries
#    1    occluded     Integer (0,1,2,3) indicating occlusion state:
#                      0 = fully visible, 1 = partly occluded
#                      2 = largely occluded, 3 = unknown
#    1    alpha        Observation angle of object, ranging [-pi..pi]
#    4    bbox         2D bounding box of object in the image (0-based index):
#                      contains left, top, right, bottom pixel coordinates
#    3    dimensions   3D object dimensions: height, width, length (in meters)
#    3    location     3D object location x,y,z in camera coordinates (in meters)
#    1    rotation_y   Rotation ry around Y-axis in camera coordinates [-pi..pi]
#    1    score        Only for results: Float, indicating confidence in
#                      detection, needed for p/r curves, higher is better.


# [{"psr":
#     {"position":{"x":3.6805430369190666,"y":-2.159625718693556,"z":-0.7195768708153368},
#     "scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},
#     "rotation":{"x":-0.04295944865645432,"y":-0.0029208176350906325,"z":-2.3716058244268994}
#     },
#     "obj_type":"Car",
#     "obj_id":"6",
#     "vertices":[3.914387093830535,-1.9856595843355647,-1.150068868183665,1,3.482409491825205,-2.404193065839314,-1.1333407281942462,1,3.4799367028557446,-2.36783452164481,-0.2875157504148429,1,3.9119143048610745,-1.9493010401410606,-0.30424389040426175,1,3.8811493709823885,-1.9514169157423022,-1.1516379912158308,1,3.4491717689770587,-2.369950397246051,-1.134909851226412,1,3.4466989800075982,-2.333591853051547,-0.2890848734470087,1,3.878676582012928,-1.9150583715477982,-0.3058130134364275,1]},{"psr":{"position":{"x":4.813465337782183,"y":-1.3081523167749545,"z":-0.8302174921773422},"scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},"rotation":{"x":0.20632526697376113,"y":0.6132817608432093,"z":-1.98354703715045}},"position":{"x":4.813465337782183,"y":-1.3081523167749545,"z":-0.8302174921773422},"scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},"rotation":{"x":0.20632526697376113,"y":0.6132817608432093,"z":-1.98354703715045},"obj_type":"Car","obj_id":"5","vertices":[4.686403201271501,-0.9600565236876057,-1.194847648575136,1,4.489024340021918,-1.5280044216434183,-1.171792827369564,1,4.9762941476013784,-1.6698375577911528,-0.49415026113812255,1,5.173673008850962,-1.1018896598353403,-0.5172050823436949,1,4.650636527962988,-0.9464670757587561,-1.1662847232165618,1,4.453257666713405,-1.5144149737145687,-1.1432299020109895,1,4.940527474292866,-1.6562481098623032,-0.46558733577954825,1,5.137906335542449,-1.0883002119064906,-0.4886421569851206,1]},{"psr":{"position":{"x":4.437489950490397,"y":-0.32395104578323913,"z":-0.9307569336580224},"scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},"rotation":{"x":-0.011679677275777655,"y":0.4261928191098284,"z":-1.6092166697528718}},"position":{"x":4.437489950490397,"y":-0.32395104578323913,"z":-0.9307569336580224},"scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},"rotation":{"x":-0.011679677275777655,"y":0.4261928191098284,"z":-1.6092166697528718},"obj_type":"Car","obj_id":"4","vertices":[4.294736903470207,-0.028928259891509767,-1.3343083455321274,1,4.273692165173391,-0.6300414704859121,-1.3177318115054488,1,4.623686696472593,-0.6210380773488475,-0.5469071113112798,1,4.64473143476941,-0.019924866754445325,-0.5634836453379585,1,4.251293204508201,-0.026864014217630683,-1.314606756004765,1,4.230248466211384,-0.627977224812033,-1.2980302219780864,1,4.580242997510586,-0.6189738316749684,-0.5272055217839172,1,4.601287735807403,-0.01786062108056624,-0.5437820558105959,1]},{"psr":{"position":{"x":6.181955702743882,"y":0.681905553929292,"z":-1.0143641815246813},"scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},"rotation":{"x":-0.14700064203659702,"y":0.2148460488836064,"z":-1.2614159871612518}},"position":{"x":6.181955702743882,"y":0.681905553929292,"z":-1.0143641815246813},"scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},"rotation":{"x":-0.14700064203659702,"y":0.2148460488836064,"z":-1.2614159871612518},"obj_type":"Car","obj_id":"3","vertices":[6.02443070839841,0.9141498325106463,-1.451993122383412,1,6.203420431359209,0.3414682241279821,-1.4066807737785316,1,6.383915091682204,0.46262169871909103,-0.5884561929658139,1,6.204925368721405,1.0353033071017552,-0.6337685415706942,1,5.97999631380556,0.901189409139493,-1.4402721700835488,1,6.158986036766359,0.32850780075682867,-1.3949598214786685,1,6.339480697089354,0.4496612753479376,-0.5767352406659507,1,6.160490974128555,1.022342883730602,-0.6220475892708311,1]},{"psr":{"position":{"x":3.0781233238699808,"y":1.5111751893103904,"z":-1.0827833243899219},"scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},"rotation":{"x":-0.17549604839344354,"y":0.17783745448658142,"z":-0.7749606645227733}},"position":{"x":3.0781233238699808,"y":1.5111751893103904,"z":-1.0827833243899219},"scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},"rotation":{"x":-0.17549604839344354,"y":0.17783745448658142,"z":-0.7749606645227733},"obj_type":"Car","obj_id":"1","vertices":[2.8081251993824443,1.668621814337088,-1.498213452925834,1,3.231235940345051,1.2408015613323748,-1.4995869311696772,1,3.3810025048482335,1.386285463893049,-0.679128302286179,1,2.9578917638856264,1.8141057168977621,-0.6777548240423359,1,2.775244142891728,1.6360649147277317,-1.4864383464936646,1,3.198354883854335,1.2082446617230187,-1.4878118247375078,1,3.3481214483575172,1.353728564283693,-0.6673531958540098,1,2.9250107073949105,1.781548817288406,-0.6659797176101666,1]},{"psr":{"position":{"x":5.520221735438435,"y":1.9747376081433308,"z":-1.0651607623667456},"scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},"rotation":{"x":-0.25923868148716817,"y":0.433930608429664,"z":-1.20343484067838}},"position":{"x":5.520221735438435,"y":1.9747376081433308,"z":-1.0651607623667456},"scale":{"x":0.6017098590196353,"y":0.047746923666433926,"z":0.846609680701065},"rotation":{"x":-0.25923868148716817,"y":0.433930608429664,"z":-1.20343484067838},"obj_type":"Car","obj_id":"2","vertices":[5.264423962642673,2.1652138054879284,-1.475717623632416,1,5.460501871506196,1.5991240073056545,-1.419587876696503,1,5.816450751634012,1.7960342107348957,-0.6771091106849974,1,5.620372842770489,2.36212400891717,-0.7332388576209103,1,5.223992719242858,2.1534410055517657,-1.4532124140484939,1,5.420070628106381,1.587351207369492,-1.397082667112581,1,5.776019508234197,1.7842614107987331,-0.6546039011010751,1,5.579941599370674,2.350351208981007,-0.7107336480369881,1]
#     }
# ]


#
# rotation_y_kitti = - ( psr.rotation.z + pi/2)
#
#  http://www.cvlibs.net/datasets/kitti/setup.php
#
# camera coordinates:  x  goes right, y goes down, z goes forward.
# note x-y place has the same direction as a image.
#

import os
import json
import math
import numpy as np
import sys



def get_inv_matrix(file, v2c, rect):
    with open(file) as f:
        lines = f.readlines()
        trans = [x for x in filter(lambda s: s.startswith(v2c), lines)][0]
        
        matrix = [m for m in map(lambda x: float(x), trans.strip().split(" ")[1:])]
        matrix = matrix + [0,0,0,1]
        m = np.array(matrix)
        velo_to_cam  = m.reshape([4,4])


        trans = [x for x in filter(lambda s: s.startswith(rect), lines)][0]
        matrix = [m for m in map(lambda x: float(x), trans.strip().split(" ")[1:])]        
        m = np.array(matrix).reshape(3,3)
        
        m = np.concatenate((m, np.expand_dims(np.zeros(3), 1)), axis=1)
        
        rect = np.concatenate((m, np.expand_dims(np.array([0,0,0,1]), 0)), axis=0)        
        
        print(velo_to_cam, rect)    
        m = np.matmul(rect, velo_to_cam)


        m = np.linalg.inv(m)
        
        return m
def get_detection_inv_matrix(calib_path, frame):
    file = os.path.join(calib_path, frame+".txt")
    return get_inv_matrix(file, "Tr_velo_to_cam", "R0_rect")



def get_tracking_inv_matrix(calib_path):
    return get_inv_matrix(calib_path, "Tr_velo_cam", "R_rect")


def parse_one_detection_obj(inv_matrix, l):
    words = l.strip().split(" ")
    obj = {}

    pos = np.array([float(words[11]), float(words[12]), float(words[13]), 1]).T
    trans_pos = np.matmul(inv_matrix, pos)
    #print(trans_pos)

    obj["obj_type"] = words[0]
    obj["psr"] = {"scale": 
                {"z":float(words[8]),    #height
                    "x":float(words[10]),  #length
                    "y":float(words[9])},  #width
                    "position": {"x":trans_pos[0], "y":trans_pos[1], "z":trans_pos[2]+float(words[8])/2},
                    "rotation": {"x":0, 
                                "y":0,
                                #"z": +math.pi/2 +float(words[14])}}
                                "z": -math.pi/2 -float(words[14])}}
    obj["obj_id"] = ""
    return obj



def trans_detection_label(src_label_path, src_calib_path, tgt_label_path):
    files = os.listdir(src_label_path)
    files.sort()

    #files = [files[2], files[10]]
    for fname in files:
        frame, _ = os.path.splitext(fname)
        print(frame)
  
        inv_m = get_detection_inv_matrix(src_calib_path, frame)

        with open(os.path.join(src_label_path, fname)) as f:
            lines = f.readlines()
            objs = map(lambda l: parse_one_detection_obj(inv_m, l), lines)
            filtered_objs = [x for x in objs]#[x for x in filter(lambda obj: obj["obj_type"]!='DontCare', objs)]
            #print(filtered_objs)
            with open(os.path.join(tgt_label_path, frame + ".json"), 'w') as outfile:
                json.dump(filtered_objs, outfile)




def parse_one_tracking_obj(inv_matrix, l):
    words = l.strip().split(" ")
    obj = {}
    obj["obj_id"] = words[1]
    frame = words[0]

    #shift words
    words = words[2:]

    pos = np.array([float(words[11]), float(words[12]), float(words[13]), 1]).T
    trans_pos = np.matmul(inv_matrix, pos)
    #print(trans_pos)

    obj["obj_type"] = words[0]
    
    obj["psr"] = {"scale": 
                {"z":float(words[8]),    #height
                    "x":float(words[10]),  #length
                    "y":float(words[9])},  #width
                    "position": {"x":trans_pos[0], "y":trans_pos[1], "z":trans_pos[2]+float(words[8])/2},
                    "rotation": {"x":0, 
                                "y":0,
                                #"z": +math.pi/2 +float(words[14])}}
                                "z": -math.pi/2 -float(words[14])}}
    
    return frame,obj


def trans_tracking_label(src_label_path, src_calib_path, tgt_label_path):

    inv_m = get_tracking_inv_matrix(src_calib_path)

    frame_obj_map = {}

    with open(src_label_path) as f:
        lines = f.readlines()

        for l in lines:
            frame, obj = parse_one_tracking_obj(inv_m, l)

            if obj["obj_type"] != 'DontCare':
                if frame_obj_map.get(frame):
                    frame_obj_map[frame].append(obj)
                else:
                    frame_obj_map[frame] = [obj]


        for f in frame_obj_map:
            frame = "{:06d}".format(int(f))
            with open(os.path.join(tgt_label_path, frame + ".json"), 'w') as outfile:
                json.dump(frame_obj_map[f], outfile)


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("args: <detection|tracking> src_label_path src_calib_path tgt_label_path")
    else:
        label_type = sys.argv[1]
        src_label = sys.argv[2]
        src_calib = sys.argv[3]
        tgt_label = sys.argv[4]


        if label_type == "detection":
            trans_detection_label(src_label, src_calib, tgt_label)
        elif label_type == "tracking":
            trans_tracking_label(src_label, src_calib, tgt_label)
        else:
            print("args: <detection|tracking> src_label_path src_calib_path tgt_label_path")

