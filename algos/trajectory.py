

from filterpy.kalman import KalmanFilter
import numpy as np

import sys
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, '../SUSTechPoints'))
import scene_reader



class KalmanBoxTracker:
  """
  This class represents the internel state of individual tracked objects observed as bbox.
  """
  count = 0
  def __init__(self, bbox3D, info):
    """
    Initialises a tracker using initial bounding box.
    """
    #define constant velocity model
    self.kf = KalmanFilter(dim_x=10, dim_z=7)       
    self.kf.F = np.array([[1,0,0,0,0,0,0,1,0,0],      # state transition matrix
                          [0,1,0,0,0,0,0,0,1,0],
                          [0,0,1,0,0,0,0,0,0,1],
                          [0,0,0,1,0,0,0,0,0,0],  
                          [0,0,0,0,1,0,0,0,0,0],
                          [0,0,0,0,0,1,0,0,0,0],
                          [0,0,0,0,0,0,1,0,0,0],
                          [0,0,0,0,0,0,0,1,0,0],
                          [0,0,0,0,0,0,0,0,1,0],
                          [0,0,0,0,0,0,0,0,0,1]])     
    
    self.kf.H = np.array([[1,0,0,0,0,0,0,0,0,0],      # measurement function,
                          [0,1,0,0,0,0,0,0,0,0],
                          [0,0,1,0,0,0,0,0,0,0],
                          [0,0,0,1,0,0,0,0,0,0],
                          [0,0,0,0,1,0,0,0,0,0],
                          [0,0,0,0,0,1,0,0,0,0],
                          [0,0,0,0,0,0,1,0,0,0]])

    # self.kf.R[0:,0:] *= 10. # measurement uncertainty
    self.kf.P[7:,7:] *= 1000. #state uncertainty, give high uncertainty to the unobservable initial velocities, covariance matrix
    self.kf.P *= 10.
    
    # self.kf.Q[-1,-1] *= 0.01    # process uncertainty
    self.kf.Q[7:,7:] *= 0.01
    self.kf.x[:7] = bbox3D.reshape((7, 1))

    self.time_since_update = 0
    self.id = KalmanBoxTracker.count
    KalmanBoxTracker.count += 1
    self.history = []
    self.hits = 1           # number of total hits including the first detection
    self.hit_streak = 1     # number of continuing hit considering the first detection
    self.first_continuing_hit = 1
    self.still_first = True
    self.age = 0
    self.info = info        # other info

  def update(self, bbox3D, info): 
    """ 
    Updates the state vector with observed bbox.
    """
    self.time_since_update = 0
    self.history = []
    self.hits += 1
    self.hit_streak += 1          # number of continuing hit
    if self.still_first:
      self.first_continuing_hit += 1      # number of continuing hit in the fist time
    
    ######################### orientation correction
    if self.kf.x[3] >= np.pi: self.kf.x[3] -= np.pi * 2    # make the theta still in the range
    if self.kf.x[3] < -np.pi: self.kf.x[3] += np.pi * 2

    new_theta = bbox3D[3]
    if new_theta >= np.pi: new_theta -= np.pi * 2    # make the theta still in the range
    if new_theta < -np.pi: new_theta += np.pi * 2
    bbox3D[3] = new_theta

    predicted_theta = self.kf.x[3]
    if abs(new_theta - predicted_theta) > np.pi / 2.0 and abs(new_theta - predicted_theta) < np.pi * 3 / 2.0:     # if the angle of two theta is not acute angle
      self.kf.x[3] += np.pi       
      if self.kf.x[3] > np.pi: self.kf.x[3] -= np.pi * 2    # make the theta still in the range
      if self.kf.x[3] < -np.pi: self.kf.x[3] += np.pi * 2
      
    # now the angle is acute: < 90 or > 270, convert the case of > 270 to < 90
    if abs(new_theta - self.kf.x[3]) >= np.pi * 3 / 2.0:
      if new_theta > 0: self.kf.x[3] += np.pi * 2
      else: self.kf.x[3] -= np.pi * 2
    
    ######################### 

    self.kf.update(bbox3D)

    if self.kf.x[3] >= np.pi: self.kf.x[3] -= np.pi * 2    # make the theta still in the range
    if self.kf.x[3] < -np.pi: self.kf.x[3] += np.pi * 2
    self.info = info

  def predict(self):       
    """
    Advances the state vector and returns the predicted bounding box estimate.
    """
    self.kf.predict()      
    if self.kf.x[3] >= np.pi: self.kf.x[3] -= np.pi * 2
    if self.kf.x[3] < -np.pi: self.kf.x[3] += np.pi * 2

    self.age += 1
    if(self.time_since_update>0):
      self.hit_streak = 0
      self.still_first = False
    self.time_since_update += 1
    self.history.append(self.kf.x)
    return self.history[-1]

  def get_state(self):
    """
    Returns the current bounding box estimate.
    """
    return self.kf.x[:7].reshape((7, ))


def get_obj_ann(scene, frame, id):
        ann = scene_reader.read_annotations(scene, frame)
        target_ann = list(filter(lambda a: a["obj_id"]==id, ann))
        if len(target_ann) == 1:
            return target_ann[0]
        elif len(target_ann)> 1:
            print("Warning: duplicate object id found!")
            return target_ann[0]
        else:
            return None

# bbox3D measurement state: x,y,z,theta,l,w,h


# x, y, z, theta
def ann_to_numpy_state(ann):
    return np.array([
        ann["psr"]["position"]["x"],
        ann["psr"]["position"]["y"],
        ann["psr"]["position"]["z"],
        ann["psr"]["rotation"]["x"],
        ann["psr"]["rotation"]["y"],
        ann["psr"]["rotation"]["z"],
    ])

def numpy_state_to_ann(proto, state):
    return {"psr":{"position":{"x":state[0],
                               "y":state[1],
                               "z":state[2]
                              },
                  "scale":    proto["psr"]["scale"],
                  "rotation":{"x":state[3],
                              "y":state[4],
                              "z":state[5]}
                  },
            "obj_type":proto["obj_type"],
            "obj_id":proto["obj_id"],
            "annotator":"__interpolated"
            }

def interpolate(start_ann, end_ann, insert_number):
    end = ann_to_numpy_state(end_ann)
    start = ann_to_numpy_state(start_ann)
    linear_delta = (end-start)/(insert_number+1)
    return list(map(lambda i: numpy_state_to_ann(start_ann, start+linear_delta*(i+1)), range(insert_number)))


def predict(scene_id, obj_id, current_frame, predict_frame):
    print("interpolate", scene_id, obj_id)
    scene = scene_reader.get_one_scene(scene_id)
    frames = scene["frames"]
    print(frames)
    annotations = list(map(lambda f: get_obj_ann(scene_id, f, obj_id), frames))
    print(annotations)
    N = len(frames)
    i = 0
    num_interpolate = 0
    while i+1<N:
        #find start
        start = None
        end = None
        while (i+1)<N and not(annotations[i] and (annotations[i+1] is None)):
            i = i+1
        
        start = i
        
        i = i+2
        while (i < N) and  (annotations[i] is None):
            i = i+1
        
        if i < len(frames):
            end = i

        # do interpolation
        if start is not None and end is not None:
            print("interpolate", start, end)
            predicted = interpolate(annotations[start], annotations[end], end-start-1)

            annotations[(start+1):end] = predicted
            num_interpolate += end-start-1

            for i,a in enumerate(predicted):
                write_annotation_back(scene_id, frames[start+1+i], a)
        else:
          print(start, end, "not interpolatable")
    return num_interpolate

def write_annotation_back(scene_id, frame, new_ann):
    ann = scene_reader.read_annotations(scene_id, frame)
    ann.append(new_ann)
    scene_reader.save_annotations(scene_id, frame, ann)


if __name__ == "__main__":
  predict("example", "2", None, None)

