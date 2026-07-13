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

Push to `main` — GitHub Actions builds and deploys automatically
(see `.github/workflows/pages-deploy.yml`).

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
