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

## CWES 60-day log

Daily/module notes from the 60-day CWES prep live in `_posts/` too, one file
per day:

```markdown
---
title: "CWES Day 07: SQL Injection"
categories: [CWES]
date: 2026-07-19 20:00:00 +0700
tags: [cwes, day07, sqli]
---
```

- Run `bash tools/new-cwes-day.sh <slug> [title]` to scaffold the next day's
  post from `_drafts/cwes-day-template.md` (auto-fills the date and next day
  number), e.g. `bash tools/new-cwes-day.sh sql-injection 'SQL Injection'`.
- Boxes/challenges pwned along the way get their own normal `[Writeups]` post
  and get linked back from the day's CWES entry (and vice versa).
- The running exam cheatsheet is `_tabs/cwes-cheatsheet.md`. Update it as
  topics are learned, since it's meant to be exam-day-ready by day 60.

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
