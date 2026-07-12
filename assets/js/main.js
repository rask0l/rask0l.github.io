(function () {
  "use strict";

  /* ── Copy button on code blocks ──────────────────────── */
  document.querySelectorAll(".md pre").forEach(function (pre) {
    var btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.textContent = "copy";
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(pre.innerText).then(function () {
        btn.textContent = "copied";
        setTimeout(function () { btn.textContent = "copy"; }, 1500);
      });
    });
    pre.appendChild(btn);
  });

  /* ── Table of contents (Notion-style, left) ──────────── */
  var md = document.querySelector(".md");
  var toc = document.getElementById("toc");
  if (!md || !toc) return;

  var heads = md.querySelectorAll("h2, h3");
  if (heads.length < 2) { toc.style.display = "none"; return; }

  var ul = document.createElement("ul");
  var links = [];

  heads.forEach(function (h) {
    if (!h.id) {
      h.id = h.textContent.toLowerCase().trim()
        .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    }
    var li = document.createElement("li");
    li.className = "lvl-" + h.tagName.substring(1);
    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    a.dataset.id = h.id;
    li.appendChild(a);
    ul.appendChild(li);
    links.push(a);
  });

  var title = document.createElement("div");
  title.className = "toc-title";
  title.textContent = "On this page";
  toc.appendChild(title);
  toc.appendChild(ul);

  /* highlight the section currently in view */
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        links.forEach(function (l) {
          l.classList.toggle("active", l.dataset.id === e.target.id);
        });
      }
    });
  }, { rootMargin: "0px 0px -75% 0px", threshold: 0 });

  heads.forEach(function (h) { obs.observe(h); });
})();
