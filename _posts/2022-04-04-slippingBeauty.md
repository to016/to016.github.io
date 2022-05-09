---
title: Slipping beauty - webhacking.kr
description: From webhacking.kr
author: to^
date: 2022-04-04 12:58:00 +0700
categories: [WebSec, CTF]
tags: [path traversal]     # TAG names should always be lowercase
img_path: /assets/img/
image:
 src: slipping_beauty/webhackingkr_logo.png
 alt: webhackingkr logo
 width: 1000
 height: 400
---

## _Link challenge_
<http://webhacking.kr:10015/>

## _Source code_
![source_code](slipping_beauty/source_code.png)
_source code_

## _Phân tích_
Vì tên chall là "slipping beauty" nên mình thử dùng file upload symlink zip nhưng không thành công vì zip wrapper sẽ không đọc được symlink zip nên mình sẽ tiếp cận theo hướng khác.

Từ [wu](https://blog.christophetd.fr/write-insomnihack-2018-ctf-teaser/#Overwriting_PHP_session_file) này ta thấy được 1 thứ thú vị :
`By default, PHP stores its sessions in a serialized format in the directory /var/lib/php/sessions, in a file named sess_[session ID]`

Vậy nếu ta lợi dụng hàm copy để copy nội dụng file upload `exploit.zip` với tên file đc zip là `../../../../var/lib/php/session/sess_myphpsseid` nhằm mục đích ghi file ở bên phía server thì sao?
Để làm được điều đó thì ta cần tìm 1 tool để có thể zip file chứa các chacracter đặc biệt như `/` hay `.`
Sau 1 hồi search mình tìm được một [tool](https://github.com/ptoomey3/evilarc/blob/master/evilarc.py) trên github

Tiếp theo ta xem cách PHP lưu session:

![session file](slipping_beauty/php_sess_file.png)
_php session file_

Ok thế file session t cần tạo sẽ có nội dung là `uid|s :5 : "admin"`
Để ý rằng file name sẽ bị thêm 1 vào 1 số random nên việc ta cần làm là tạo 1 file với tên là `sess_` và nội dung như trên, sau khi nhận được số random đó thì paste vào cookie để solve chall này 😊

## _Khai thác_
Script để tạo file upload:
![exploit step](slipping_beauty/exp_step.png)
_exploit step_

Và upload:
![reponse](slipping_beauty/response.png)
_upload reponse_

Cuối cùng ta set trong cookie: `PHPSESSID=24094577` và load lại trang để server dùng session này.
![result](slipping_beauty/result.png)
_result_

> FLAG{my_zip_is_slipping_beauty}
{: .prompt-info  }

