import tensorflow as tf
import numpy as np

import os
import sys
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, 'models'))

import pointnet_cls as MODEL

MODEL_PATH = BASE_DIR+"/log/model.ckpt" #"./log-cls-120-split-train-eval/model.ckpt"  #car only
NUM_POINT = 512
GPU_INDEX = 0
NUM_CLASSES = 120
RESAMPLE_NUM = 5
BATCH_SIZE = RESAMPLE_NUM
def prepare_model():
    is_training = False
     
    with tf.device('/gpu:'+str(GPU_INDEX)):
        pointclouds_pl, labels_pl = MODEL.placeholder_inputs(BATCH_SIZE, NUM_POINT)
        is_training_pl = tf.placeholder(tf.bool, shape=())

        # simple model
        pred, end_points = MODEL.get_model(pointclouds_pl, is_training_pl, NUM_CLASSES)
        #loss = MODEL.get_loss(pred, labels_pl, end_points)
        
        # Add ops to save and restore all the variables.
        saver = tf.train.Saver()
        
    # Create a session
    config = tf.ConfigProto()
    config.gpu_options.allow_growth = True
    config.allow_soft_placement = True
    config.log_device_placement = True
    sess = tf.Session(config=config)

    # Restore variables from disk.
    saver.restore(sess, MODEL_PATH)
    print("Model restored.")

    ops = {'pointclouds_pl': pointclouds_pl,
           #'labels_pl': labels_pl,
           'is_training_pl': is_training_pl,
           'pred': pred,
           #'loss': loss
           }
    return sess, ops
    #eval_one_epoch(sess, ops, num_votes)

sess, ops = prepare_model()


def sample_one_input_data(obj):
    points = provider.sample_one_obj(obj["points"], 1024)
    points, angle = provider.rotate_one_obj(points)
    #points = provider.provider.jitter_point_cloud(points)
    label_angle = obj["angle"] - angle
    label_angle = label_angle % (2 * np.math.pi)
    label_angle_cls = int(label_angle / np.math.pi * 180 / (360 / NUM_CLASSES)) % NUM_CLASSES

    return {
        "points": points, 
        "angle_cls": label_angle_cls,
        "angle":label_angle
        }

def sample_one_obj(points, num):
    if points.shape[0] < NUM_POINT:
        return np.concatenate([points, np.zeros((NUM_POINT-points.shape[0], 3), dtype=np.float32)], axis=0)
    else:
        idx = np.arange(points.shape[0])
        np.random.shuffle(idx)
        return points[idx[0:num]]

def predict(points):
    points = np.array(points).reshape((-1,3))
    input_data = np.stack([x for x in map(lambda x: sample_one_obj(points, NUM_POINT), range(RESAMPLE_NUM))], axis=0)
    
    feed_dict = {ops['pointclouds_pl']: input_data,
                 ops['is_training_pl']: False}
    pred_val = sess.run(ops['pred'], feed_dict=feed_dict)
    pred_cls = np.argmax(pred_val, 1)
    print(pred_cls)
    return np.int32(pred_cls[0])


if __name__ == "__main__":
    pred = predict(np.random.random((2048,3)))
    
    print("pred", pred)
    pass