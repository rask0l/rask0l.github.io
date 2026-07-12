/* copy button on code blocks */
(function () {
  "use strict";
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
})();
