---
title: "CWES Day 01: Web Fuzzing"
categories: [CWES]
date: 2026-07-14 20:00:00 +0700
tags: [cwes, day01, fuzzing, ffuf, recon]
---

## Today

HTB Academy's Web Fuzzing module, finished end to end including the skills
assessment. Core idea: **discover** endpoints, params, vhosts, and hidden
dirs by fuzzing the space of possibilities, not by guessing one value at a
time.

## Environment gotchas (things that wasted time)

| Problem | Fix |
|---|---|
| Writeups use `/usr/share/seclists/...` but the file isn't there | Find your real path once: `find / -iname "*seclists*" -type d 2>/dev/null`. Common local clone: `~/SecLists/` |
| Make writeup paths "just work" | Symlink once: `sudo ln -s ~/SecLists /usr/share/seclists` |
| `directory-list-2.3-medium.txt` "no such file" | Your clone may prefix it: `DirBuster-2007_directory-list-2.3-medium.txt`. Always `ls` the dir first |
| DNS lists live under `Discovery/DNS/`, not `Discovery/` | Full path: `~/SecLists/Discovery/DNS/subdomains-top1million-*.txt` |
| `/etc/hosts` entry not resolving | **Never put a port in `/etc/hosts`.** Format is strictly `IP hostname`. Port goes in the URL |
| `pip install` → "externally-managed-environment" (PEP 668) | Use a venv (`python3 -m venv venv && source venv/bin/activate`) or `--break-system-packages` for throwaway tools |
| curl `(35) wrong version number` | You used `https://` on a plain-HTTP port. Switch to `http://` |
| curl `(3) bad range in URL` with `[` `]` | Brackets are curl range syntax. Use `--globoff` or URL-encode (`%5B` `%5D`) |
| ffuf: "Keyword FUZZ defined, but not found..." | You forgot to put `FUZZ` in the URL/data/header |
| Terminal errors after pasting HTML output | Copy-paste artifact: bash tried to run part of the HTML. Harmless |

## Concepts learned

### 1. Initial recon

```bash
# Confirm reachability + fingerprint server (403 is still progress, confirms it's alive)
curl -s -i http://TARGET:PORT/

# Response headers only
curl -I http://TARGET:PORT/path

# Full request/response cycle
curl -v http://TARGET:PORT/path

# Port discovery (host blocks ping → -Pn). Top ports first, they're faster:
nmap -Pn --top-ports 1000 -T4 TARGET
# Full sweep, sped up:
nmap -p- -Pn -n --min-rate 5000 -T4 TARGET
```

> HTB's shared front-end IPs show *hundreds* of "open" ports (30000–32999).
> That's cluster port-mapping, not one host. Spawn the assessment's own
> target for a clean IP:port.
{: .prompt-tip }

### 2. Directory / file fuzzing

```bash
# Basic directory fuzz
ffuf -w WORDLIST -u http://TARGET:PORT/FUZZ -v

# With extensions
ffuf -w WORDLIST -u http://TARGET:PORT/FUZZ -e .php,.html,.txt,.bak,.js,.json -v

# Fuzz INSIDE a discovered directory
ffuf -w WORDLIST -u http://TARGET:PORT/somedir/FUZZ -v

# gobuster equivalent
gobuster dir -u http://TARGET:PORT -w WORDLIST -x php,html,txt

# feroxbuster (recursive by default with -r)
feroxbuster -u http://TARGET:PORT/dir/ -w WORDLIST -r -x php,html,txt -t 50 -k
```

**Filtering out noise** (critical, since a catch-all page returns 200 for everything):
- `-ic` ignore wordlist comment lines (the `#` license header noise)
- `-fs N` filter by response size (`-fs 58` or ranges `-fs 250-350`)
- `-fc N` filter by status code (`-fc 403`, more robust than size when error pages vary)
- `-fr "regex"` filter by body content (`-fr "Forbidden|Access Denied"`)
- `-fw N` / `-fl N` filter by word / line count
- `-ac` autocalibrate filters automatically
- `-mc all` match everything (use when finding the baseline first)

### 3. Parameter value fuzzing

When a page says something like *"Invalid parameter, ensure X is set
correctly"*, the **value** of that param is the target. Fuzz it.

```bash
# 1. Find the baseline "wrong" response size first
curl -s "http://TARGET:PORT/page.php?param=test" -w "\n%{size_download}\n"

# 2. Fuzz the value, filtering out that baseline size
ffuf -w WORDLIST:FUZZ -u "http://TARGET:PORT/page.php?param=FUZZ" -fs BASELINE_SIZE

# POST-body variant
ffuf -w WORDLIST -u http://TARGET:PORT/page.php \
  -X POST -H "Content-Type: application/x-www-form-urlencoded" \
  -d "param=FUZZ" -fs BASELINE_SIZE

# Numeric range as a wordlist (no file needed)
ffuf -u http://TARGET:PORT/page.php -w <(seq 1 100000) -d "param=FUZZ" \
  -X POST -H "Content-Type: application/x-www-form-urlencoded" -fs BASELINE_SIZE
```

> GET-query fuzzing and POST-body fuzzing can behave differently. If one
> produces no hits, try the other. In the assessment, `accessID=FUZZ` as a
> GET query with `-fs 58` surfaced the value `getaccess`.
{: .prompt-tip }

**Parameter *name* discovery** (when you don't even know the param name):
```bash
ffuf -w PARAM_WORDLIST:FUZZ -u "http://TARGET:PORT/page.php?FUZZ=test" -fs BASELINE
# good list: SecLists/Discovery/Web-Content/burp-parameter-names.txt
```

### 4. VHOST / subdomain fuzzing

Trigger: a hint like *"head over to the X.htb vhost"* or content that
implies name-based virtual hosting.

```bash
# 1. Map the hostname to the target IP (NO PORT in hosts file)
echo "TARGET_IP hostname.htb" | sudo tee -a /etc/hosts

# 2. Find the baseline size for a bogus subdomain
curl -s "http://hostname.htb:PORT/" -H "Host: doesnotexist.hostname.htb" -w "\n%{size_download}\n"

# 3. Fuzz the Host header
ffuf -c -w DNS_WORDLIST:FUZZ -u http://hostname.htb:PORT/ \
  -H "Host: FUZZ.hostname.htb" -fs BASELINE
```

> Apache's 403 error page embeds the subdomain name in the "Server at ___
> Port 80" line, so **every** response is a slightly different size. Exact
> `-fs` fails. Better options:
> - `-fc 403` (filter the forbidden status entirely)
> - `-fr "Forbidden|Access Denied"` (filter by body content)
> - Dump all with `-mc all -o out.json -of json`, then eyeball the size
>   distribution for the true outlier.
{: .prompt-warning }

gobuster equivalent:
```bash
gobuster vhost -u http://hostname.htb:PORT -w WORDLIST --append-domain
# NOTE: vhost fuzzing needs a real base DOMAIN, not a bare IP. Bare IPs return uniform 400 garbage.
```

### 5. API endpoint fuzzing

```bash
# Generic endpoint discovery
ffuf -w WORDLIST -u http://TARGET:PORT/api/FUZZ -mc 200

# JSON body fuzzing, filter responses containing "error"
ffuf -w WORDLIST -u http://TARGET:PORT/ -X POST \
  -H "Content-Type: application/json" -d '{"name":"FUZZ"}' -fr "error"

# Read the returned value
curl -s http://TARGET:PORT/endpoint | jq
```

## Machines / challenges pwned

- **Web Fuzzing skills assessment** (HTB Academy): chained recon → param
  fuzzing → vhost fuzzing → recursive dir fuzzing to reach the flag.
  Full chain below.

### The chained-hint pattern

The skills assessment is a breadcrumb trail. Each step reveals the next:

1. **Recon** → root is 403, but `/admin` (301) and `/admin/panel.php` exist.
2. **panel.php** → "Invalid parameter … accessID". Fuzz the *value*:
   `?accessID=FUZZ -fs 58` → **`getaccess`**.
3. **Visit `?accessID=getaccess`** → hint: *"head to the `fuzzing_fun.htb` vhost"*.
4. **Add `fuzzing_fun.htb` to /etc/hosts** → page hints at a `/godeep` folder + another vhost.
5. **VHOST-fuzz** `FUZZ.fuzzing_fun.htb` → subdomain (e.g. `hidden`).
6. **Add `hidden.fuzzing_fun.htb` to /etc/hosts** → confirms `/godeep`.
7. **Recursive dir scan** on `hidden.fuzzing_fun.htb/godeep/` → nested paths → flag.

**Takeaways:** always read the response body for the next hint; a
403/"Access Denied" means "keep enumerating here," not "dead end"; filter by
*content* when error-page sizes vary; and re-apply `/etc/hosts` + IP
whenever the instance rotates.

### Alternate approach: feroxbuster-first

Found a [writeup of the same assessment](https://medium.com/@Aircon/hackthebox-htb-web-fuzzing-skill-assessment-2989ddc4df6e)
that swaps `feroxbuster` in for the directory-discovery steps instead of raw
`ffuf`. Same chain, worth keeping around as a second toolchain:

```bash
# 1. connectivity check
curl -v http://<target>:<port>/

# 2. recursive dir scan, feroxbuster instead of ffuf
feroxbuster -u http://<target>:<port>/ \
  -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
  -r -x php,html,txt,js -t 50 -k

# 3. param value fuzz, same idea as mine, ffuf
ffuf -w /usr/share/wordlists/seclists/Discovery/Web-Content/common.txt:FUZZ \
  -u http://<target>:<port>/admin/panel.php?accessID=FUZZ -fs 58

# 4. add the discovered vhost to /etc/hosts
sudo nano /etc/hosts

# 5. vhost fuzz, ffuf, size *range* instead of an exact byte count
ffuf -c -w /usr/share/seclists/SecLists-master/Discovery/DNS/subdomains-top1million-20000.txt:FUZZ \
  -u http://fuzzing_fun.htb:<port>/ -H 'Host: FUZZ.fuzzing_fun.htb' -fs 250-350

# 6. recursive dir scan on the hidden vhost's /godeep, feroxbuster again
feroxbuster -u http://hidden.fuzzing_fun.htb:<port>/godeep/ \
  -w /usr/share/wordlists/seclists/Discovery/Web-Content/common.txt -r -t 50 -k
```

Two things worth stealing from this version:
- **feroxbuster over raw ffuf for directory discovery**: `-r` recurses
  automatically, so there's no manual "now fuzz inside the dir I just found"
  follow-up pass.
- **`-fs 250-350` as a range**, not one exact byte count, on the vhost fuzz.
  More forgiving when sizes wobble slightly instead of varying wildly (see
  the Apache-403 trap above, where a range wouldn't have been enough).

Their `/usr/share/wordlists/dirbuster/...` and
`/usr/share/seclists/SecLists-master/...` paths are yet another variant of
the seclists-path gotcha from the table above. Every writeup assumes a
different install layout, which is exactly why "find it once, symlink it"
beats trusting any writeup's literal path.

## Cheatsheet additions

Folded the condensed version of this (filter flags, the ffuf skeleton, the
vhost-fuzzing trap, and the feroxbuster-first alternative) into the
[Recon & Enumeration](/cwes-cheatsheet/#recon--enumeration) section of the
running cheatsheet, with a link back here for the full walkthrough.

## Notes for tomorrow

_TODO_
