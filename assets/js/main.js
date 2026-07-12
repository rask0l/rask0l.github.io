/* rask0l // security notes — interactions */
(function () {
  "use strict";

  /* ── Hero typing effect ──────────────────────────────── */
  var typeEl = document.querySelector(".type");
  var outEl = document.getElementById("hero-out");
  if (typeEl && outEl) {
    var cmd = typeEl.getAttribute("data-type") || "";
    var i = 0;
    var out =
      '<span class="k">handle</span>   = <span class="v">"rask0l"</span>\n' +
      '<span class="k">focus</span>    = <span class="v">["htb", "ctf", "appsec", "AD"]</span>\n' +
      '<span class="k">writeups</span> = <span class="v">enumeration → root, no skipped steps</span>\n' +
      '<span class="k">motto</span>    = <span class="v">"break it, then document it"</span>';

    (function typeCmd() {
      if (i <= cmd.length) {
        typeEl.textContent = cmd.slice(0, i);
        i++;
        setTimeout(typeCmd, 55);
      } else {
        setTimeout(function () { outEl.innerHTML = out; }, 300);
      }
    })();
  }

  /* ── Writeup filters + search ────────────────────────── */
  var filters = document.querySelectorAll(".filter[data-filter]");
  var search = document.getElementById("search");
  var items = Array.prototype.slice.call(document.querySelectorAll(".js-item"));
  var noResults = document.getElementById("no-results");
  var current = "all";

  function apply() {
    var q = search ? search.value.trim().toLowerCase() : "";
    var shown = 0;
    items.forEach(function (el) {
      var diff = el.getAttribute("data-diff") || "";
      var hay = (el.getAttribute("data-title") || "") + " " + (el.getAttribute("data-tags") || "");
      var okDiff = current === "all" || diff === current;
      var okSearch = !q || hay.indexOf(q) !== -1;
      var show = okDiff && okSearch;
      el.classList.toggle("hide", !show);
      if (show) shown++;
    });
    if (noResults) noResults.hidden = shown !== 0 || items.length === 0;
  }

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filters.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      current = btn.getAttribute("data-filter");
      apply();
    });
  });
  if (search) search.addEventListener("input", apply);

  /* ── Copy button on code blocks ──────────────────────── */
  document.querySelectorAll(".markdown pre").forEach(function (pre) {
    var btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.textContent = "copy";
    btn.addEventListener("click", function () {
      var code = pre.innerText;
      navigator.clipboard.writeText(code).then(function () {
        btn.textContent = "copied ✓";
        setTimeout(function () { btn.textContent = "copy"; }, 1500);
      });
    });
    pre.appendChild(btn);
  });
})();
