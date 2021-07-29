
import os

from numpy.core.numeric import outer

from progress.bar import Bar

def align_time(timestr, timestamp_offset_ms, jitter=30, delay=0):  # for ir camera, the timestamp is when it's received (not camera shutter time). the delay is 20~40ms.
    sec,nsec,ext = timestr.split(".")
    msec = (int(nsec)//1000000 - delay + timestamp_offset_ms + jitter)//100
    sec = int(sec) + msec//10
    msec = msec % 10
    return sec,msec,ext

def link_one_folder(src_folder, dst_folder, timestamp_offset_ms, jitter=30, delay=0):
    if not os.path.exists(dst_folder):
        os.makedirs(dst_folder)

    os.chdir(dst_folder)

    src_folder = os.path.relpath(src_folder)  # use relative path
    files = os.listdir(src_folder)
    files.sort()

    with Bar('Processing ' + src_folder, max=len(files)) as bar:
        for file in files:
            sec,msec,ext = align_time(file, timestamp_offset_ms, jitter, delay)
            #print(file, sec, msec)   # 20ms jitter
            os.system("ln -s -f "+src_folder + "/" + file + " " + dst_folder +"/" + str(sec) +"." + str(msec) + "."+ext)
            bar.next()


