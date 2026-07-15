# rask0l

Hack The Box writeups, CTF notes, and a blog. Built with
[Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy), hosted on GitHub Pages.

## Adding a writeup or post

Drop a file in `_posts/` named `YYYY-MM-DD-title.md`:

```markdown
---
title: "Machine Name"
categories: [Writeups]     # or [Blog]
date: 2026-07-13 20:00:00 +0000
tags: [nmap, web, privesc] # lowercase, used for the /tags/ index
---

## Enumeration
...
```

Push to `main`. GitHub Actions builds and deploys automatically
(see `.github/workflows/pages-deploy.yml`).

## CWES cheatsheets

CWES exam prep is organized as one cheatsheet per module, not a daily log
(that was the original plan, `_posts/2026-07-14-cwes-day01-web-fuzzing.md`
is the one artifact of it and stays as-is, but it's not the pattern to
follow going forward). Each module gets its own post:

```markdown
---
title: "SQL Injection Cheatsheet"
categories: [Cheatsheets]
date: 2026-07-19 20:00:00 +0700
tags: [cheatsheet, sqli, cwes]
---
```

- Condense the module's PDF/notes down to what's actually useful for quick
  reference and exam recall (commands, tables, gotchas), don't transcribe
  it wholesale.
- Boxes/challenges pwned along the way get their own normal `[Writeups]`
  post, cross-linked from the relevant cheatsheet.
- `_tabs/cwes-cheatsheet.md` is a short index tab linking every module
  cheatsheet, add an entry there ("Modules covered") when a new one goes up.

### Terminal-window blocks

For a real command/output transcript, `_includes/terminal.html` renders it
as a Kali-style terminal window instead of a plain code block. Prefix a
command line with `$ `, everything else is treated as output:

```liquid
{% capture term %}
$ nmap -T5 --open $TARGET_IP
Host is up (0.22s latency).
22/tcp open  ssh
80/tcp open  http
{% endcapture %}
{% include terminal.html content=term %}
```

Optional params: `host` (default `kali@kali`), `path` (default `~`), and
`title` (defaults to `{host}: {path}`). The breadcrumb prompt is generated
automatically, not hand-typed. Use this only for genuine session transcripts;
generic command-syntax references (the kind with `WORDLIST`/`TARGET`
placeholders) stay as plain ` ```bash ` blocks.

## Local preview

```bash
bundle install
bundle exec jekyll serve --livereload
# → http://127.0.0.1:4000
```

## Config

Site title, tagline, and social links live in `_config.yml`. Sidebar contact
icons (currently: Hack The Box profile + email) are in `_data/contact.yml`.
The About page is `_tabs/about.md`.
