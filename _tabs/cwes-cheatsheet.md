---
icon: fas fa-clipboard-list
order: 5
---

Living reference sheet for the CWES exam, built up over the 60-day prep
[log](/categories/cwes/). Sections fill in as topics get covered — the goal
is for this page to be exam-day-ready by day 60.

> Last updated: Day 2 — Web Fuzzing.
{: .prompt-info }

## Recon & Enumeration

Full walkthrough + the skills-assessment chain:
[Day 02 — Web Fuzzing](/posts/cwes-day02-web-fuzzing/).

**Fingerprint first** (a 403 still confirms the host is alive):

```bash
curl -s -i http://TARGET:PORT/
nmap -Pn --top-ports 1000 -T4 TARGET          # fast pass
nmap -p- -Pn -n --min-rate 5000 -T4 TARGET    # full sweep
```

**Directory / file fuzzing:**

```bash
ffuf -w WORDLIST -u http://TARGET:PORT/FUZZ -e .php,.html,.txt,.bak,.js,.json -v
gobuster dir -u http://TARGET:PORT -w WORDLIST -x php,html,txt
feroxbuster -u http://TARGET:PORT/dir/ -w WORDLIST -r -x php,html,txt -t 50 -k
```

**Parameter value fuzzing** (when a page complains about a bad param value —
fuzz the *value*, not the name):

```bash
curl -s "http://T:P/page.php?param=test" -w "\n%{size_download}\n"   # baseline size
ffuf -w WORDLIST:FUZZ -u "http://T:P/page.php?param=FUZZ" -fs BASELINE
```

**Parameter *name* discovery:**

```bash
ffuf -w PARAM_WORDLIST:FUZZ -u "http://T:P/page.php?FUZZ=test" -fs BASELINE
# good list: SecLists/Discovery/Web-Content/burp-parameter-names.txt
```

**VHOST / subdomain fuzzing:**

```bash
echo "TARGET_IP hostname.htb" | sudo tee -a /etc/hosts   # NO port in /etc/hosts
curl -s "http://hostname.htb:P/" -H "Host: doesnotexist.hostname.htb" -w "\n%{size_download}\n"
ffuf -c -w DNS_WORDLIST:FUZZ -u http://hostname.htb:P/ -H "Host: FUZZ.hostname.htb" -fs BASELINE
gobuster vhost -u http://hostname.htb:P -w WORDLIST --append-domain   # needs a real domain, not a bare IP
```

**Filtering flags (ffuf):** `-ic` strip wordlist comments · `-fs N`/`-fs A-B`
filter by size · `-fc N` filter by status (more robust than size when error
pages vary) · `-fr "regex"` filter by body content · `-fw`/`-fl` filter by
word/line count · `-ac` autocalibrate · `-mc all` match everything (baseline
pass).

> Apache 403 pages embed the hostname in the body ("Server at ___ Port 80"),
> so vhost fuzzing gets a different size on *every* response. Exact `-fs`
> fails there — use `-fc 403`, `-fr "Forbidden|Access Denied"`, or dump
> `-mc all -o out.json -of json` and eyeball the outlier.
{: .prompt-warning }

**Environment gotchas:**

| Problem | Fix |
|---|---|
| SecLists path in a writeup doesn't exist | `find / -iname "*seclists*" -type d 2>/dev/null`, or symlink once: `sudo ln -s ~/SecLists /usr/share/seclists` |
| `directory-list-2.3-medium.txt` not found | Clone may prefix it `DirBuster-2007_...` — `ls` the dir first |
| DNS wordlists missing | They're under `Discovery/DNS/`, not `Discovery/` |
| curl `(35) wrong version number` | Used `https://` on a plain-HTTP port |
| curl `(3) bad range in URL` with `[`/`]` | Those are curl range syntax — use `--globoff` or URL-encode |
| ffuf "Keyword FUZZ defined, but not found" | `FUZZ` missing from the URL/data/header |

## HTTP Fundamentals

_TODO_

## Injection (SQLi, Command Injection, XXE, SSTI)

_TODO_

## XSS & CSRF

_TODO_

## Authentication & Session Handling (JWT, OAuth, IDOR)

_TODO_

## File Upload, LFI/RFI

_TODO_

## SSRF

_TODO_

## Insecure Deserialization

_TODO_

## API-Specific Attacks

_TODO_

## Privilege Escalation (Web Context)

_TODO_

## Tools & One-Liners

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

**Handy SecLists paths** (root varies by clone — check with `ls` first):
```
Discovery/Web-Content/common.txt
Discovery/Web-Content/directory-list-2.3-medium.txt   # may be DirBuster-2007_-prefixed
Discovery/Web-Content/burp-parameter-names.txt
Discovery/DNS/subdomains-top1million-5000.txt
Discovery/DNS/subdomains-top1million-20000.txt
```

## Exam-Day Checklist

_TODO_
