
import os

from numpy.core.numeric import outer

from progress.bar import Bar

# 100ms period
def align_time(timestr, timestamp_offset_ms, jitter=30, delay=0, period=100):  # for ir camera, the timestamp is when it's received (not camera shutter time). the delay is 20~40ms.
    sec,nsec,ext = timestr.split(".")
    msec = (int(nsec)//1000000 - delay + timestamp_offset_ms + jitter)//period
    sec = int(sec) + msec//(1000//period)
    msec = msec % (1000//period)
    msec = msec * period
    return sec,msec,ext


def format_msec(msec):
    s = "{:03d}".format(msec)
    # if s[2]=='0':
    #     s = s[0:2]
    #     if s[1]=='0':
    #         s = s[0:1]
    return s

def link_one_folder(src_folder, dst_folder, timestamp_offset_ms, jitter=30, delay=0, period=100):
    if not os.path.exists(dst_folder):
        os.makedirs(dst_folder)
    
    os.chdir(dst_folder)
    os.system("rm *")
    
    src_folder = os.path.relpath(src_folder)  # use relative path
    
    files = os.listdir(src_folder)
    files.sort()

    with Bar('aligning ' + dst_folder, max=len(files)) as bar:
        for file in files:
            sec,msec,ext = align_time(file, timestamp_offset_ms, jitter, delay, period)


            #print(file, sec, msec)   # 20ms jitter
            os.system("ln -s -f "+src_folder + "/" + file + " " + dst_folder +"/" + str(sec) +"." + format_msec(msec) + "."+ext)
            bar.next()


