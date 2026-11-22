 /*
======================================================================
====
   MedX - Module WebView Android (Android 8 - 14+), Multi-Écrans & Lecteurs
   Fichier : webview-compat.js

======================================================================
==== */
(function (global) {
  "use strict";

  var MedXCompat = {};
  MedXCompat.WATERMARK_TEXT = "MedX • Dr RABIBISOA • 0342002623";

  var memoryStore = {};
  var isAndroidWebView = false;
  var androidVersionNum = null;

  /* 1. Détection WebView & version Android */
  function detectEnvironment() {
    var ua = "";
    try {
      ua = (global.navigator && global.navigator.userAgent) ?
String(global.navigator.userAgent) : "";
    } catch (e) {
      ua = "";
    }

    var androidMatch = ua.match(/Android\s+([0-9]+(?:\.[0-9]+)?)/i);
    if (androidMatch && androidMatch[1]) {
      androidVersionNum = parseFloat(androidMatch[1]);
    }

    isAndroidWebView =
      /;\s*wv\)/i.test(ua) ||
      /WebView/i.test(ua) ||
      (/Android/i.test(ua) && /Version\/[0-9.]+/i.test(ua) && !/Chrome\/[0-9.]+ Mobile/i.test(ua));

    return {
      userAgent: ua,
      isAndroidWebView: isAndroidWebView,
      androidVersion: androidVersionNum
    };
  }

  /* 2. Stockage sécurisé (localStorage avec repli mémoire si bloqué en WebView) */
  MedXCompat.safeGet = function (key) {
    try {
      if (global.localStorage) {
        return global.localStorage.getItem(key);
      }
    } catch (e) {}
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] :
null;
  };

  MedXCompat.safeSet = function (key, value) {
    var strVal = String(value);
    memoryStore[key] = strVal;
    try {
      if (global.localStorage) {
        global.localStorage.setItem(key, strVal);
        return true;
      }
    } catch (e) {}
    return false;
  };

  /* 3. Adaptation multi-écrans & WebView */
  MedXCompat.applyViewportAndScreenRules = function () {
    var doc = global.document;
    if (!doc || !doc.documentElement) return;

    var env = detectEnvironment();
    var root = doc.documentElement;

    if (env.isAndroidWebView) {
      root.classList.add("medx-webview");
    }
    if (env.androidVersion !== null && !isNaN(env.androidVersion)) {
      root.setAttribute("data-android-version", String(env.androidVersion));
    }

    var w = global.innerWidth || (doc.documentElement &&
doc.documentElement.clientWidth) || 360;
    if (w <= 360) {
      root.classList.add("medx-small-screen");
    } else {
      root.classList.remove("medx-small-screen");
    }

    var vh = (global.innerHeight || 640) * 0.01;
    root.style.setProperty("--medx-vh", vh + "px");
  };

  /* 4. Navigation fiable entre sections (Home, Cours, Vidéos, QCM, Classement, À propos)
*/
  MedXCompat.switchTab = function (tabId) {
    var doc = global.document;
    if (!doc) return;

    var targetId = tabId || "home";
    var sections = doc.querySelectorAll(".view-section");
    for (var i = 0; i < sections.length; i++) {
      sections[i].classList.remove("active");
    }

    var targetSec = doc.getElementById("sec-" + targetId) || doc.getElementById("sec-home");
    if (targetSec) {
      targetSec.classList.add("active");
    }

    var navItems = doc.querySelectorAll(".nav-item");
    for (var j = 0; j < navItems.length; j++) {
      var btnTab = navItems[j].getAttribute("data-tab");
      if (!btnTab) {
        var oc = navItems[j].getAttribute("onclick") || "";
        var m = oc.match(/switchTab\(['"]([^'"]+)['"]\)/);
        if (m && m[1]) btnTab = m[1];
      }
      if (btnTab === targetId) {
        navItems[j].classList.add("active");
      } else {
        navItems[j].classList.remove("active");
      }
    }

    MedXCompat.safeSet("MedX_Last_Tab", targetId);

    try {
      global.scrollTo(0, 0);
    } catch (e) {
      if (doc.documentElement) doc.documentElement.scrollTop = 0;
      if (doc.body) doc.body.scrollTop = 0;
    }
  };

  /* 5. Filigrane PDF & Vidéo */
  MedXCompat.renderWatermark = function (containerId, itemClass, count) {
    var doc = global.document;
    var box = doc ? doc.getElementById(containerId) : null;
    if (!box) return;

    var safeText = String(MedXCompat.WATERMARK_TEXT || "MedX").replace(/[&<>"']/g,
function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });

    var html = "";
    var total = count || 12;
    for (var i = 0; i < total; i++) {
      html += '<div class="' + itemClass + '">' + safeText + "</div>";
    }
    box.innerHTML = html;
  };

  /* 6. Aide URL PDF (Google Drive / Dropbox) & Vidéo (YouTube / MP4) */
  MedXCompat.normalizePdfUrl = function (url) {
    if (!url) return "";
    var trimmed = String(url).trim();
    var driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch && driveMatch[1]) {
      return "https://drive.google.com/uc?export=download&id=" + driveMatch[1];
    }
    if (trimmed.indexOf("dropbox.com") !== -1) {
      return trimmed
        .replace("www.dropbox.com", "dl.dropboxusercontent.com")
        .replace("?dl=0", "")
        .replace("&dl=0", "");
    }
    return trimmed;
  };

  MedXCompat.extractYouTubeId = function (url) {
    if (!url) return null;
    var match =
String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{
6,})/);
    return match ? match[1] : null;
  };

  /* 7. Initialisation automatique au chargement & redimensionnement */
  function initListeners() {
    MedXCompat.applyViewportAndScreenRules();
    global.addEventListener("resize", MedXCompat.applyViewportAndScreenRules);
    global.addEventListener("orientationchange", function () {
      setTimeout(MedXCompat.applyViewportAndScreenRules, 150);
    });
  }

  if (global.document && global.document.readyState === "loading") {
global.document.addEventListener("DOMContentLoaded", initListeners);
} else {
initListeners();
}
global.MedXCompat = MedXCompat;
if (typeof global.switchTab !== "function") {
global.switchTab = MedXCompat.switchTab;
}
})(window);