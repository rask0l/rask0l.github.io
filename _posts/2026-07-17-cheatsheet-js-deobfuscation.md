---
title: "JS Deobfuscation Cheatsheet"
categories: [Cheatsheets]
date: 2026-07-17 11:00:00 +0700
tags: [cheatsheet, javascript, deobfuscation, decoding, cwes]
---

Condensed from HTB Academy's JavaScript Deobfuscation module. The whole
module is really one workflow: find obfuscated JS, make it readable, read
what it does, replay its request, decode the response.

## The workflow (exam order)

1. **Find the source**: `CTRL+U` to view page source, follow every
   `<script src="...">` to its `.js` file. Read HTML comments too.
2. **Recognise obfuscation**: unreadable JS that still runs. Spot the type
   (see table below).
3. **Deobfuscate**: beautify to reformat, unpack to actually reverse it.
4. **Analyse**: read the recovered code. Look for URLs, endpoints,
   `XMLHttpRequest`, request methods.
5. **Replay**: reproduce the request with `curl`.
6. **Decode**: the response is usually base64/hex/rot13. Decode it.

## Recognising the obfuscation type

| Tell | Technique |
|---|---|
| Everything on one long line, still readable | Minified |
| Starts with `eval(function(p,a,c,k,e,d){...})` | Packed (packer) |
| Hex identifiers `_0x1ec6`, a Base64 decode routine | obfuscator.io |
| Only these 6 chars: `[ ] ( ) ! +` | JSFuck |
| Only symbols, very slow to run | JJEncode / AAEncode |

Packing has a weakness: the cleartext strings are still visible at the end
(`Module|Deobfuscation|JavaScript|HTB|...`), so you can often guess what it
does before even unpacking.
{: .prompt-tip }

## Deobfuscating

**Beautify** only reformats (fixes minified code). **Unpack/deobfuscate**
actually reverses obfuscation. Don't confuse the two.

- Beautify in-browser: Firefox debugger (`CTRL+SHIFT+Z`), pick the script,
  click the `{ }` pretty-print button.
- Beautifiers: [prettier.io/playground](https://prettier.io/playground/),
  [beautifier.io](https://beautifier.io/)
- Unpacker (for packed code):
  [matthewfl.com/unPacker.html](https://matthewfl.com/unPacker.html), paste,
  click **UnPack**.

Don't leave blank lines before the script in the UnPacker, it can produce
wrong output.
{: .prompt-warning }

**Manual unpack (safe way):** never run `eval()` on untrusted code. Find the
final `return` value and print it with `console.log(...)` instead of
executing it. Verify any snippet safely at
[jsconsole.com](https://jsconsole.com).

## Analysing recovered code

Google any function you don't recognise (`XMLHttpRequest`, `xhr.open`). What
to pull out:

```javascript
var xhr = new XMLHttpRequest();
var url = "/serial.php";          // relative URL = same domain
xhr.open("POST", url, true);      // method + endpoint
xhr.send(null);                    // empty POST, no data
```

A relative URL (`/serial.php`) means same domain. An empty/unused request
often points at unreleased functionality worth probing server-side.

## Replaying with curl

```bash
curl http://TARGET:PORT/                                # GET, returns HTML
curl -s http://TARGET:PORT/serial.php -X POST           # POST, silent
curl -s http://TARGET:PORT/serial.php -X POST -d "param1=sample"  # POST + data
```

`-X POST` sets the method, `-s` silences progress noise, `-d` adds POST
data. A bare `-X POST` with no `-d` replicates an empty POST.

## Decoding the response

Identify the encoding first, then decode:

| Tell | Encoding | Decode |
|---|---|---|
| `A-Z a-z 0-9 + /`, ends in `=`, length ÷ 4 | Base64 | `base64 -d` |
| Only `0-9 a-f` | Hex | `xxd -p -r` |
| Readable structure, fixed letter shift | rot13 | `tr` (same both ways) |

```bash
# Base64
echo aHR0cHM6Ly93d3cuaGFja3RoZWJveC5ldS8K | base64 -d
echo -n "text" | base64                      # encode (-n avoids trailing newline)

# Hex
echo 68747470733a2f2f... | xxd -p -r
echo -n "text" | xxd -p                       # encode

# rot13 (encode and decode are the same command)
echo uggcf://jjj | tr 'A-Za-z' 'N-ZA-Mn-za-m'
```

`man ascii` gives the full hex table. If you can't tell the encoding, paste
it into a **Cipher Identifier**. Encryption (encoding with a key) is a
different beast, if the key isn't in the script, you usually can't reverse
it.
{: .prompt-tip }

## Obfuscating (reverse direction, for reference)

Occasionally useful to obfuscate your own payload to bypass a filter:

- Minify: [javascript-minifier.com](https://javascript-minifier.com/)
- Pack/obfuscate: [beautifytools.com/javascript-obfuscator.php](https://beautifytools.com/javascript-obfuscator.php)
- Full obfuscation with Base64 string array: [obfuscator.io](https://obfuscator.io)
- Esoteric (filter bypass only, very slow): JSFuck, JJEncode, AAEncode
