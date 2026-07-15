---
title: "Web Fuzzing Cheatsheet"
categories: [Cheatsheets]
date: 2026-07-15 20:00:00 +0700
tags: [cheatsheet, web-fuzzing, ffuf, recon, cwes]
---

Condensed from HTB Academy's Web Fuzzing module. Core idea: **discover**
endpoints, params, vhosts, and hidden dirs by fuzzing the space of
possibilities, not by guessing one value at a time.

For passive recon (WHOIS, DNS, CT logs) before any of this, see the
[Reconnaissance cheatsheet]({% post_url 2026-07-15-cheatsheet-recon %}).

## Fingerprinting

A 403 still confirms the host is alive, so start here regardless of status:

```bash
curl -s -i http://TARGET:PORT/
nmap -Pn --top-ports 1000 -T4 TARGET          # fast pass
nmap -p- -Pn -n --min-rate 5000 -T4 TARGET    # full sweep
```

{% capture kt_recon %}
$ nmap -T5 --open $TARGET_IP
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-10 18:45 +0500
Nmap scan report for $TARGET_IP
Host is up (0.22s latency).
Not shown: 986 closed tcp ports (reset), 12 filtered tcp ports (no-response)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http

Nmap done: 1 IP address (1 host up) scanned in 6.84 seconds
{% endcapture %}
{% include terminal.html content=kt_recon %}

HTB's shared front-end IPs show *hundreds* of "open" ports (30000 to 32999).
That's cluster port-mapping, not one host. Spawn the target's own instance
for a clean IP:port.
{: .prompt-tip }

## Directory / file fuzzing

```bash
ffuf -w WORDLIST -u http://TARGET:PORT/FUZZ -e .php,.html,.txt,.bak,.js,.json -v
gobuster dir -u http://TARGET:PORT -w WORDLIST -x php,html,txt
feroxbuster -u http://TARGET:PORT/dir/ -w WORDLIST -r -x php,html,txt -t 50 -k
```

`feroxbuster -r` recurses into found directories automatically, so there's
no manual "now fuzz inside the dir I just found" follow-up pass like with
ffuf.
{: .prompt-tip }

## Parameter value fuzzing

When a page complains about a bad param value, fuzz the *value*, not the
name:

```bash
curl -s "http://T:P/page.php?param=test" -w "\n%{size_download}\n"   # baseline size
ffuf -w WORDLIST:FUZZ -u "http://T:P/page.php?param=FUZZ" -fs BASELINE
```

**Parameter *name* discovery:**

```bash
ffuf -w PARAM_WORDLIST:FUZZ -u "http://T:P/page.php?FUZZ=test" -fs BASELINE
# good list: SecLists/Discovery/Web-Content/burp-parameter-names.txt
```

## VHOST / subdomain fuzzing

```bash
echo "TARGET_IP hostname.htb" | sudo tee -a /etc/hosts   # NO port in /etc/hosts
curl -s "http://hostname.htb:P/" -H "Host: doesnotexist.hostname.htb" -w "\n%{size_download}\n"
ffuf -c -w DNS_WORDLIST:FUZZ -u http://hostname.htb:P/ -H "Host: FUZZ.hostname.htb" -fs BASELINE
# -fs also takes a range (e.g. -fs 250-350), more forgiving than one exact byte count
gobuster vhost -u http://hostname.htb:P -w WORDLIST --append-domain   # needs a real domain, not a bare IP
```

Apache 403 pages embed the hostname in the body ("Server at ___ Port 80"),
so vhost fuzzing gets a different size on *every* response. Exact `-fs`
fails there. Use `-fc 403`, `-fr "Forbidden|Access Denied"`, or dump
`-mc all -o out.json -of json` and eyeball the outlier.
{: .prompt-warning }

For passive subdomain discovery (Certificate Transparency logs, search
dorking) before reaching for a bruteforcer, see the
[Reconnaissance cheatsheet]({% post_url 2026-07-15-cheatsheet-recon %}#subdomain-enumeration-passive).

## API endpoint fuzzing

```bash
# Generic endpoint discovery
ffuf -w WORDLIST -u http://TARGET:PORT/api/FUZZ -mc 200

# JSON body fuzzing, filter responses containing "error"
ffuf -w WORDLIST -u http://TARGET:PORT/ -X POST \
  -H "Content-Type: application/json" -d '{"name":"FUZZ"}' -fr "error"

# Read the returned value
curl -s http://TARGET:PORT/endpoint | jq
```

## Filtering flags (ffuf)

`-ic` strip wordlist comments · `-fs N`/`-fs A-B` filter by size · `-fc N`
filter by status (more robust than size when error pages vary) ·
`-fr "regex"` filter by body content · `-fw`/`-fl` filter by word/line
count · `-ac` autocalibrate · `-mc all` match everything (baseline pass).

## Environment gotchas

| Problem | Fix |
|---|---|
| SecLists path in a writeup doesn't exist | `find / -iname "*seclists*" -type d 2>/dev/null`, or symlink once: `sudo ln -s ~/SecLists /usr/share/seclists` |
| `directory-list-2.3-medium.txt` not found | Clone may prefix it `DirBuster-2007_...`, so `ls` the dir first |
| DNS wordlists missing | They're under `Discovery/DNS/`, not `Discovery/` |
| curl `(35) wrong version number` | Used `https://` on a plain-HTTP port |
| curl `(3) bad range in URL` with `[`/`]` | Those are curl range syntax, use `--globoff` or URL-encode |
| ffuf "Keyword FUZZ defined, but not found" | `FUZZ` missing from the URL/data/header |

## Tools & one-liners

```bash
# ffuf skeleton
ffuf -w LIST:FUZZ -u URL/FUZZ [-e .ext,.ext] [-fs N|-fc N|-fr regex|-ac] [-ic] [-c] [-v]
ffuf ... -o out.json -of json   # save + reload output

# hosts file: add / remove
echo "IP host.htb" | sudo tee -a /etc/hosts
sudo sed -i '/host.htb/d' /etc/hosts

# response size / status quick check
curl -s URL -w "\n%{size_download}\n"
curl -s -o /dev/null -w "%{http_code}\n" URL
```

**Handy SecLists paths** (root varies by clone, check with `ls` first):
```
Discovery/Web-Content/common.txt
Discovery/Web-Content/directory-list-2.3-medium.txt   # may be DirBuster-2007_-prefixed
Discovery/Web-Content/burp-parameter-names.txt
Discovery/DNS/subdomains-top1million-5000.txt
Discovery/DNS/subdomains-top1million-20000.txt
```

## Skills assessment methodology

The assessment is a breadcrumb trail. Each step reveals the next, so read
every response body rather than only watching status codes:

1. **Recon**: root is 403, but `/admin` (301) and `/admin/panel.php` exist.
2. **panel.php** complains about an invalid `accessID`. Fuzz the *value*:
   `?accessID=FUZZ -fs 58`.
3. **The valid value** returns a hint pointing at another vhost.
4. **Add that vhost to `/etc/hosts`**, its page hints at a `/godeep` folder
   plus a further subdomain.
5. **VHOST-fuzz** that domain to find the subdomain.
6. **Add the subdomain to `/etc/hosts`**, confirming `/godeep`.
7. **Recursive dir scan** on the subdomain's `/godeep/` to reach the flag.

Takeaways: a 403 or "Access Denied" means "keep enumerating here", not
"dead end"; filter by *content* when error-page sizes vary; and re-apply
`/etc/hosts` when the instance rotates its IP.
{: .prompt-tip }

### Alternate toolchain: feroxbuster-first

A [writeup of the same assessment](https://medium.com/@Aircon/hackthebox-htb-web-fuzzing-skill-assessment-2989ddc4df6e)
swaps `feroxbuster` in for the directory-discovery steps instead of raw
`ffuf`. Same chain, worth keeping as a second approach:

```bash
# recursive dir scan, feroxbuster instead of ffuf
feroxbuster -u http://<target>:<port>/ \
  -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
  -r -x php,html,txt,js -t 50 -k

# param value fuzz, ffuf
ffuf -w /usr/share/wordlists/seclists/Discovery/Web-Content/common.txt:FUZZ \
  -u http://<target>:<port>/admin/panel.php?accessID=FUZZ -fs 58

# vhost fuzz, size *range* instead of an exact byte count
ffuf -c -w /usr/share/seclists/SecLists-master/Discovery/DNS/subdomains-top1million-20000.txt:FUZZ \
  -u http://fuzzing_fun.htb:<port>/ -H 'Host: FUZZ.fuzzing_fun.htb' -fs 250-350

# recursive dir scan on the hidden vhost's /godeep
feroxbuster -u http://hidden.fuzzing_fun.htb:<port>/godeep/ \
  -w /usr/share/wordlists/seclists/Discovery/Web-Content/common.txt -r -t 50 -k
```

Two things worth stealing from it:

- **feroxbuster over raw ffuf for directory discovery**: `-r` recurses
  automatically, so there's no manual "now fuzz inside the dir I just
  found" follow-up pass.
- **`-fs 250-350` as a range**, not one exact byte count, on the vhost
  fuzz. More forgiving when sizes wobble slightly instead of varying wildly
  (though not enough for the Apache-403 trap above).

Note their `/usr/share/wordlists/dirbuster/...` and
`/usr/share/seclists/SecLists-master/...` paths are yet another variant of
the seclists-path gotcha. Every writeup assumes a different install layout,
which is why "find it once, symlink it" beats trusting any literal path.
