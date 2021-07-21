
import os

from numpy.core.numeric import outer

from progress.bar import Bar

def align_time(timestr, timestamp_offset_ms, delay=0):  # for ir camera, the timestamp is when it's received (not camera shutter time). the delay is 20~40ms.
    sec,nsec,ext = timestr.split(".")
    msec = (int(nsec)//1000000 - delay + timestamp_offset_ms)//100
    sec = int(sec) + msec//10
    msec = msec % 10
    return sec,msec,ext

def link_one_folder(src_folder, dst_folder, timestamp_offset_ms, delay=0):
    if not os.path.exists(dst_folder):
        os.makedirs(dst_folder)

    os.chdir(dst_folder)

    src_folder = os.path.relpath(src_folder)  # use relative path
    files = os.listdir(src_folder)
    files.sort()

    with Bar('Processing', max=len(files)) as bar:
        for file in files:
            sec,msec,ext = align_time(file, timestamp_offset_ms, delay)
            #print(file, sec, msec)   # 20ms jitter
            os.system("ln -s -f "+src_folder + "/" + file + " " + dst_folder +"/" + str(sec) +"." + str(msec) + "."+ext)
            bar.next()


if __name__ == "__main__":
    # link_one_folder("/home/lie/nas/2021-06-18-07-23-43/pandar_points", "/home/lie/nas/sustech-2021-06-18-07-23-43/lidar", 0)
    # link_one_folder("/home/lie/nas/2021-06-18-07-23-43/rsbp_front/rslidar_points", "/home/lie/nas/sustech-2021-06-18-07-23-43/aux_lidar/front", -100)
    link_one_folder("/home/lie/nas/2021-06-18-07-23-43/cameras/front/image_color/rectified", "/home/lie/nas/sustech-2021-06-18-07-23-43/camera/front", -50)
    link_one_folder("/home/lie/nas/2021-06-18-07-23-43/cameras/front_left/image_color/rectified", "/home/lie/nas/sustech-2021-06-18-07-23-43/camera/front_left", -33)
    link_one_folder("/home/lie/nas/2021-06-18-07-23-43/cameras/front_right/image_color/rectified", "/home/lie/nas/sustech-2021-06-18-07-23-43/camera/front_right", -67)
    link_one_folder("/home/lie/nas/2021-06-18-07-23-43/cameras/rear_right/image_color/rectified", "/home/lie/nas/sustech-2021-06-18-07-23-43/camera/rear_right", -83)
    link_one_folder("/home/lie/nas/2021-06-18-07-23-43/cameras/rear/image_color/rectified", "/home/lie/nas/sustech-2021-06-18-07-23-43/camera/rear", 0)
    link_one_folder("/home/lie/nas/2021-06-18-07-23-43/cameras/rear_left/image_color/rectified", "/home/lie/nas/sustech-2021-06-18-07-23-43/camera/rear_left", -17)