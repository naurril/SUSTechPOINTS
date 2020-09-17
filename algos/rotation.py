

import numpy as np
import tensorflow as tf
import util
util.config_gpu()

RESAMPLE_NUM = 10

model_file = "./algos/models/deep_annotation_inference.h5"

model = tf.keras.models.load_model(model_file)
model.summary()

NUM_POINT=512

def sample_one_obj(points, num):
    if points.shape[0] < NUM_POINT:
        return np.concatenate([points, np.zeros((NUM_POINT-points.shape[0], 3), dtype=np.float32)], axis=0)
    else:
        idx = np.arange(points.shape[0])
        np.random.shuffle(idx)
        return points[idx[0:num]]

def predict_yaw(points):
    points = np.array(points).reshape((-1,3))
    input_data = np.stack([x for x in map(lambda x: sample_one_obj(points, NUM_POINT), range(RESAMPLE_NUM))], axis=0)
    pred_val = model.predict(input_data)
    pred_cls = np.argmax(pred_val, axis=-1)
    print(pred_cls)
    
    ret = (pred_cls[0]*3+1.5)*np.pi/180.
    ret =[0,0,ret]
    print(ret)

    return ret

# warmup the model
predict_yaw(np.random.random([1000,3]))


if __name__ == "__main__":
    predict_yaw(np.random.random([1000,3]))