# Intro

The tool can run **faster** with multi-thread while deploy the it on uwsgi server.

It's simple if you want to push it to cloud whenever.

You can run it with `python ./main.py` or `uwsgi --ini uwsgi.ini`


# Required

```
pip install uwsgi
```

# Config
```
--- file: uwsgi.ini ---

[uwsgi]
# Set the IP and Port.
http = 0.0.0.0:8092

# **Importance**: Need rewrite the value of chdir key. The right path 
chdir = /root/SUSTechPOINTS

module = main:application
master = true
buffer-size = 65536
processes = 4
threads = 2
```

# Run

```
uwsgi --ini uwsgi.ini
```
