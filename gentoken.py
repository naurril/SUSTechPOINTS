
import configparser
import jwt


usercfg = configparser.ConfigParser()
usercfg.read('conf/user.conf')

authcfg = configparser.ConfigParser()
authcfg.read('conf/auth.conf')

for u in usercfg['users']:
    print(u, jwt.encode({'i':u}, authcfg['token']['secret'], algorithm='HS256'))