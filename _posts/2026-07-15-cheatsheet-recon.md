---
title: "Reconnaissance Cheatsheet"
categories: [Cheatsheets]
date: 2026-07-15 20:00:00 +0700
tags: [cheatsheet, recon, dns, whois, osint, cwes]
---

Condensed from HTB Academy's Information Gathering module. The core split
that governs everything below: **passive** recon never touches the
target's own systems, it pulls data from third parties (registrars, public
resolvers, search engines, archives, CT logs), so it's effectively
undetectable. **Active** recon sends requests directly to the target's own
infrastructure (its DNS server, its web server), so it's faster and more
thorough but leaves logs.

## Quick reference

| Technique | Type | Detection risk | Primary tools |
|---|---|---|---|
| WHOIS lookup | Passive | Very low | `whois` |
| DNS lookups | Passive | Very low | `dig`, `nslookup`, `host` |
| Subdomain enum via CT logs / dorking | Passive | Very low | crt.sh, Censys, `site:` |
| Certificate Transparency | Passive | Very low | crt.sh, Censys |
| Search engine discovery | Passive | Very low | Google dorks, GHDB |
| Web archives | Passive | Very low | Wayback Machine |
| DNS zone transfer | Active | Low, usually refused | `dig axfr` |
| Subdomain bruteforcing | Active | Medium | `dnsenum`, `ffuf`, `gobuster` |
| Virtual host discovery | Active | Medium | `gobuster vhost`, `ffuf` |
| Fingerprinting | Active | Low | `curl`, `wafw00f`, `nikto`, WhatWeb |
| Crawling / spidering | Active | Low to medium | Burp Spider, ZAP, Scrapy |
| robots.txt / well-known URIs | Active | Very low | `curl`, browser |

## Passive reconnaissance

### WHOIS

Query/response protocol for registrar databases: domain name, registrar,
registrant/admin/technical contacts, creation/expiry dates, name servers.

```bash
whois inlanefreight.com
```

Reveals key personnel for social-engineering targeting and name
servers/hosting for infrastructure mapping. Domain status flags like
`clientTransferProhibited` / `serverTransferProhibited` just mean the domain
is locked against unauthorized transfers, not a vulnerability.
{: .prompt-tip }

WHOIS only gives org-level contacts (often a generic "Domain Admin"), not
individual employees. Pair with search-engine discovery or LinkedIn OSINT
for that.

### DNS lookups

| Record | Purpose |
|---|---|
| `A` | Hostname to IPv4 address |
| `AAAA` | Hostname to IPv6 address |
| `CNAME` | Alias pointing one hostname to another |
| `MX` | Mail server(s), with a priority |
| `NS` | Authoritative name server for the zone |
| `TXT` | Arbitrary text (SPF, verification, security policy) |
| `SOA` | Zone authority: primary NS, admin email, serial/refresh/retry/expire |
| `SRV` | Host and port for a specific service |
| `PTR` | Reverse lookup, IP to hostname |

```bash
dig domain.com A
dig domain.com MX
dig domain.com NS
dig domain.com TXT
dig @1.1.1.1 domain.com          # query a specific resolver
dig +trace domain.com            # walk the full resolution chain
dig -x 192.168.1.1                # reverse lookup
dig +short domain.com             # strip the header/footer noise
```

`ANY` queries (`dig domain.com ANY`) are frequently ignored by modern DNS
servers per RFC 8482, so don't rely on them to dump everything at once.
Query record types individually instead.
{: .prompt-tip }

A `CNAME` pointing at an outdated host, or a `TXT` record leaking a
third-party SaaS integration (password managers, verification services),
are both worth a second look, they're easy to skim past.

### Subdomain enumeration (passive)

Two passive sources instead of guessing names:

- **Certificate Transparency logs**: every SSL/TLS cert a CA issues gets
  logged publicly. The cert's Subject Alternative Name field often lists
  every subdomain it covers, including ones no longer live or never
  advertised anywhere.
- **Search engine dorking**: `site:domain.com` surfaces whatever's indexed.

```bash
curl -s "https://crt.sh/?q=facebook.com&output=json" \
  | jq -r '.[] | select(.name_value | contains("dev")) | .name_value' \
  | sort -u
```

CT logs beat wordlist bruteforcing for coverage: they surface subdomains
tied to old/expired certs that no wordlist would ever guess. But they only
catch domains that ever had a cert issued, so pair passive CT/dork results
with active bruteforcing for full coverage.
{: .prompt-tip }

### Certificate Transparency

- **crt.sh**: free, simple web UI and JSON API, no registration, limited
  filtering.
- **Censys**: more powerful filtering by domain/IP/cert attributes, has an
  API, but needs a free-tier account.

A `name_value` entry like `*.dev.facebook.com` is a wildcard cert covering
every subdomain at that level, not a literal hostname. Don't confuse the two
when compiling a subdomain list.

### Search engine discovery

"Google dorking": combining search operators to surface data that isn't
obviously linked from the site itself.

```
site:example.com inurl:login
site:example.com filetype:pdf
site:example.com inurl:config.php
site:example.com filetype:sql
intitle:"confidential report"
intext:"password reset"
allintext:admin password reset
allinurl:admin panel
site:example.com AND (inurl:admin OR inurl:login)
site:example.com numrange:1000-2000
cache:example.com
related:example.com
```

`intext:`/`inurl:`/`intitle:` need the term anywhere in the result;
`allintext:`/`allinurl:`/`allintitle:` need every term present. Know both
numeric-range syntaxes for the exam: `numrange:1000-2000` and `100..500`.
The [Google Hacking Database](https://www.exploit-db.com/google-hacking-database)
has far more dorks than anyone memorizes.
{: .prompt-tip }

### Web archives

The Wayback Machine (Internet Archive) crawls and timestamps snapshots of
public pages going back to 1996. It doesn't capture everything, sites of
low cultural/research value may never get archived, and owners can request
exclusion.

Browse by URL and date at web.archive.org. The earliest capture is usually
the interesting one: it can show an old site structure, paths, or
subdomains that don't exist anymore but might still resolve.

## Active reconnaissance

### DNS zone transfers

A zone transfer (`AXFR`) is meant to replicate all records from a primary
DNS server to a secondary. Misconfigured servers will hand the full zone,
every subdomain, IP, and NS record, to anyone who asks, not just trusted
secondaries.

```bash
dig axfr @nsztm1.digi.ninja zonetransfer.me
```

`zonetransfer.me` is a purpose-built demo domain that intentionally allows
AXFR, a safe target to practice against. Even a refused attempt is useful:
it confirms the server is configured correctly, which is itself a data
point.
{: .prompt-tip }

Zone transfers run over TCP, not UDP like typical DNS queries, since the
response can be large.

### Subdomain bruteforcing

```bash
dnsenum --enum inlanefreight.com \
  -f /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -r
```

`--enum` tunes the option set, `-f` sets the wordlist, `-r` recurses
(rerunning the wordlist against every subdomain it finds). Other tools in
the same space: `fierce` (recursive, wildcard detection), `dnsrecon`,
`amass`, `assetfinder`, `puredns`.

DNS resolution alone doesn't confirm a live, meaningful service behind a
resolved name. Always follow up by actually browsing to what you find.
{: .prompt-warning }

### Virtual host discovery

Subdomains are a DNS-level concept (their own record); virtual hosts are a
web-server-level concept (`Host` header routing) and may have **no DNS
record at all**, reachable only by editing `/etc/hosts` and hitting the
target IP directly. That's exactly why vhost fuzzing exists: it finds
hostnames a server responds to that DNS enumeration would never surface.

```bash
gobuster vhost -u http://inlanefreight.htb:81 \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt \
  --append-domain
```

`--append-domain` is required on newer gobuster versions to glue the
wordlist entry onto the base domain, older versions handled this
differently. `ffuf` can fuzz the `Host` header directly instead if you
prefer one tool for both directory and vhost fuzzing (see the
[Web Fuzzing cheatsheet]({% post_url 2026-07-15-cheatsheet-web-fuzzing %})).
{: .prompt-tip }

### Fingerprinting

```bash
curl -I https://inlanefreight.com

wafw00f inlanefreight.com

nikto -h inlanefreight.com -Tuning b
```

Check for a WAF *before* further probing, `wafw00f` first, since a WAF can
block or skew everything that comes after it.
{: .prompt-warning }

`curl -I` is headers only, follow redirect chains by hand since each hop
can leak something different (an `X-Redirect-By: WordPress` header, a
`wp-json` link header). Nikto's `-Tuning b` restricts the scan to software
identification only, useful when you just want fingerprinting, not a full
vulnerability sweep.

### Crawling / spidering

Distinct from fuzzing: crawling follows real links that exist on the page,
fuzzing guesses paths that might exist. Two strategies: breadth-first
(map the whole site structure) or depth-first (chase one path as deep as
it goes).

Worth extracting while crawling: internal/external links, HTML comments
(often leak internal info), metadata, and accidentally-exposed files
(`.bak`, `.old`, `web.config`, `error_log`).

```bash
python3 ReconSpider.py http://inlanefreight.com
```

HTB's ReconSpider (a Scrapy wrapper) dumps a `results.json` with `emails`,
`links`, `external_files`, `js_files`, `form_fields`, `comments`, and more.
Cross-reference the fields instead of reading them in isolation, a comment
mentioning "file server" plus a repeated `/files/` link pattern is a much
stronger lead together than either is alone.
{: .prompt-tip }

### robots.txt

```
User-agent: *
Disallow: /admin/
Disallow: /backup/
Allow: /backup/public/
Crawl-delay: 10
Sitemap: https://example.com/sitemap.xml
```

A `Disallow` entry doesn't hide a directory, it's a strong hint the
directory exists and is worth checking by hand. Some sites plant deliberate
honeypot entries here too, a hit can tell you as much about the target's
security awareness as about their file structure.
{: .prompt-tip }

### Well-known URIs

Standardized metadata directory at `/.well-known/` (RFC 8615), IANA keeps
the registry of suffixes.

| URI | Purpose |
|---|---|
| `security.txt` | Vulnerability disclosure contact (RFC 9116) |
| `change-password` | Standard password-change redirect |
| `openid-configuration` | OpenID Connect Discovery metadata |
| `assetlinks.json` | App/domain ownership verification |
| `mta-sts.txt` | SMTP email security policy (RFC 8461) |

`openid-configuration` alone can hand you the authorization endpoint, token
endpoint, JWKS URI, and supported scopes for an entire SSO implementation,
worth checking on any target running OAuth/OIDC.

## Automating recon

Frameworks that wrap several of the above into one run. Each still inherits
the active/passive nature of whatever it's doing underneath, `--whois` and
`--wayback` are passive, `--crawl` and `--dir` are active.

| Tool | Focus |
|---|---|
| FinalRecon | All-in-one: headers, whois, SSL, crawl, DNS, subdomains, dirs, wayback, ports |
| Recon-ng | Modular framework, can chain into exploitation |
| theHarvester | Emails, subdomains, hosts, employee names |
| SpiderFoot | OSINT automation across many data sources |

```bash
./finalrecon.py --headers --whois --url http://inlanefreight.com
./finalrecon.py --full --url http://inlanefreight.com   # everything at once
```

Output lands in `~/.local/share/finalrecon/dumps/fr_<domain>_<date>_<time>/`
by default, worth knowing so you're not hunting for where results went.

## Skills assessment methodology

The assessment chains these together in the classic order: start passive,
escalate to active as each stage's findings justify it.

1. **WHOIS** on the target domain, passive, establishes registrar/nameserver
   baseline.
2. **robots.txt** on the live target, active, one request, checks for
   disallowed paths hinting at hidden structure.
3. **Subdomain bruteforcing**, active, wordlist against the target domain
   to surface hostnames not advertised anywhere.
4. **Crawling**, active, walk what's been found so far to map the rest of
   the site.

Each discovered vhost gets added to `/etc/hosts` as it's found, so later
stages can actually reach it.
