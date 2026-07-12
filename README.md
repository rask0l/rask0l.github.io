# rask0l // security notes

A terminal-themed Jekyll site for Hack The Box writeups, CTF notes, and a blog.
Hosted free on **GitHub Pages** — push markdown, it deploys automatically.

---

## 🚀 Deploy in 5 minutes

1. **Create the repo.** For a site at `https://<username>.github.io`, name the repo
   exactly `<username>.github.io`. (For a sub-path like `.../blog`, name it anything
   and set `baseurl: "/blog"` in `_config.yml`.)

2. **Set your details** in [`_config.yml`](_config.yml) — replace `your-username`,
   `your-htb-handle`, title, etc. Then run this from the repo root to swap the
   placeholder everywhere:
   ```bash
   grep -rl 'your-username' . --exclude-dir=_site | xargs sed -i 's/your-username/YOUR_GITHUB_USERNAME/g'
   ```

3. **Push:**
   ```bash
   git init && git add . && git commit -m "init: security notes site"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```

4. **Enable Pages:** Repo → **Settings → Pages → Source: Deploy from a branch →
   `main` / `root`**. Wait ~1 minute. Done.

---

## ✍️ Adding a writeup

Drop a file in [`_posts/`](_posts/) named `YYYY-MM-DD-machine-name.md`:

```markdown
---
layout: post
title: "BoardLight"
category: writeups
date: 2026-07-12 20:00:00 +0000
difficulty: Easy        # Easy | Medium | Hard | Insane
os: Linux               # Linux | Windows
platform: HackTheBox
points: 20
status: Owned           # Owned | In progress
tags: [web, cve, privesc]
description: "One-line summary shown on the card."
---

## Enumeration
...your markdown...
```

The card badges, difficulty colors, filters, and stats update automatically.

## ✍️ Adding a blog post

Same folder, but `category: blog` and no difficulty/os fields needed.

---

## 🖥️ Preview locally (optional)

```bash
bundle install          # first time only
bundle exec jekyll serve --livereload
# → http://127.0.0.1:4000
```

You don't need this to publish — GitHub builds it for you. It's just for previewing.

---

## 🎨 Customizing

| What | Where |
|------|-------|
| Colors / theme | CSS variables at the top of [`assets/css/main.scss`](assets/css/main.scss) |
| Nav links | [`_includes/nav.html`](_includes/nav.html) |
| Hero text | [`index.html`](index.html) + the typing effect in [`assets/js/main.js`](assets/js/main.js) |
| About / progress | [`about.md`](about.md), [`progress.md`](progress.md) |

Signature color is HTB green `#9fef00` — change `--green` to rebrand instantly.
