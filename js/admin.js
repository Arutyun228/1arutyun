/**
 * 1arutyun — Visual Block Studio (/admin)
 * Features:
 * - Direct visual mouse resizing (width %, height/padY px, split column ratio %)
 * - Drag-and-drop block reordering
 * - 13 Standard Block types that initialize EMPTY ("Здесь пока пусто")
 * - On-block visual controls: 8 Shapes, + / - Images, Image Size, Block Colors, Framed Heading
 * - Full Pages Manager: Add, Rename, Edit Blocks, and Delete Custom Pages & Release Pages
 * - Granular Light & Dark Color Scheme Customizer + Font Pickers
 */

(function () {
  "use strict";

  const BASE_PATH = (function () {
    const path = window.location.pathname || "/";
    const segments = path.split("/").filter(Boolean);
    if (/\.github\.io$/i.test(window.location.hostname) && segments.length > 0) {
      const first = segments[0].toLowerCase();
      const known = ["admin", "admin.html", "index.html", "release", "videos", "thoughts", "page"];
      if (!known.includes(first)) {
        return "/" + segments[0];
      }
    }
    return "";
  })();

  function resolveUrl(url) {
    if (!url) return "";
    const s = String(url);
    if (/^(https?:|data:|blob:|mailto:|tel:)/i.test(s)) return s;
    if (BASE_PATH && s.startsWith("/") && !s.startsWith(BASE_PATH + "/") && s !== BASE_PATH) {
      return BASE_PATH + (s === "/" ? "/" : s);
    }
    return s;
  }

  function fixSubpathAssets(container = document) {
    if (!BASE_PATH) return;
    container.querySelectorAll("img[src^='/'], video[src^='/'], source[src^='/']").forEach((el) => {
      const raw = el.getAttribute("src");
      if (raw && raw.startsWith("/") && !raw.startsWith(BASE_PATH + "/")) {
        el.setAttribute("src", BASE_PATH + raw);
      }
    });
    container.querySelectorAll("video[poster^='/']").forEach((el) => {
      const raw = el.getAttribute("poster");
      if (raw && raw.startsWith("/") && !raw.startsWith(BASE_PATH + "/")) {
        el.setAttribute("poster", BASE_PATH + raw);
      }
    });
    container.querySelectorAll("[style*=\"url('/\"]").forEach((el) => {
      const st = el.getAttribute("style") || "";
      el.setAttribute("style", st.replace(/url\(['"]?(\/(?!\/)[^'")]+)['"]?\)/g, (m, p1) => {
        if (p1.startsWith(BASE_PATH + "/")) return m;
        return `url('${BASE_PATH}${p1}')`;
      }));
    });
  }

  function detectDefaultGithubRepo() {
    const saved = localStorage.getItem("1arutyun_gh_repo");
    if (saved) return saved;
    const host = window.location.hostname || "";
    if (/\.github\.io$/i.test(host)) {
      const owner = host.replace(/\.github\.io$/i, "");
      const repo = BASE_PATH ? BASE_PATH.slice(1) : `${owner}.github.io`;
      return `${owner}/${repo}`;
    }
    return "";
  }

  async function hmacSha256Hex(message, secret = "1arutyun_salt_v2") {
    const enc = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await window.crypto.subtle.sign("HMAC", key, enc.encode(String(message)));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function verifyStaticLogin(username, password) {
    let expectedUser = "admin";
    let expectedHash = "5c7f5c0dacd432f1ad03237246b6845e66ae76eed3759a3485d1323e95986c11"; // "1arutyun2026"
    const customAuth = localStorage.getItem("1arutyun_local_auth_override");
    if (customAuth) {
      try {
        const parsed = JSON.parse(customAuth);
        if (parsed.username && parsed.passwordHash) {
          expectedUser = parsed.username;
          expectedHash = parsed.passwordHash;
        }
      } catch (e) {}
    } else {
      try {
        const res = await fetch(resolveUrl(`/data/auth.json?t=${Date.now()}`), { cache: "no-store" });
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.username) expectedUser = cfg.username;
          if (cfg.passwordHash) expectedHash = cfg.passwordHash;
        }
      } catch (e) {}
    }
    const inputHash = await hmacSha256Hex(password, "1arutyun_salt_v2");
    return username === expectedUser && inputHash === expectedHash;
  }

  const state = {
    token: localStorage.getItem("1arutyun_admin_token") || "",
    isStaticHost: false,
    siteData: JSON.parse(JSON.stringify(window.DEFAULT_SITE_DATA || {})),
    currentPage: "main", // "main" | "release:<slug>" | "page:<slug>" | "videos" | "thoughts"
    editLang: "en",
    canvasTheme: "light",
    selectedBlockId: null,
    mediaFiles: [],
    mediaPickerCallback: null,
    draggedBlockIndex: null
  };

  const SHAPES = [
    { id: "sharp", label: "Острые углы (Референс)" },
    { id: "soft", label: "Мягкие углы" },
    { id: "arch", label: "Арка" },
    { id: "circle", label: "Круг" },
    { id: "angled", label: "Параллелограмм" },
    { id: "diamond", label: "Ромб" },
    { id: "hexagon", label: "Гексагон" },
    { id: "organic", label: "Органика" }
  ];

  const BLOCK_CATEGORIES = [
    { id: "hero", label: "🎯 Шапка и витрина" },
    { id: "text", label: "📝 Текст и история" },
    { id: "music", label: "🎵 Музыка, Релизы и Медиа" },
    { id: "nav", label: "🔗 Соцсети, Кнопки и Разделители" }
  ];

  const STANDARD_BLOCKS = [
    {
      type: "hero-banner",
      category: "hero",
      icon: "🖼",
      title: "Панорамный баннер",
      desc: "Широкая шапка с фото или чистым фоном под тему"
    },
    {
      type: "split-content",
      category: "hero",
      icon: "◧",
      title: "Сплит: Фото + Текст",
      desc: "Обложка и заголовок в линиях (как витрина релиза)"
    },
    {
      type: "text-block",
      category: "text",
      icon: "¶",
      title: "Текстовый блок",
      desc: "Заголовок и форматированные абзацы"
    },
    {
      type: "two-col-text",
      category: "text",
      icon: "☷",
      title: "Две колонки текста",
      desc: "Журнальная вёрстка текста в 2 колонки"
    },
    {
      type: "framed-quote",
      category: "text",
      icon: "“”",
      title: "Цитата в линиях",
      desc: "Акцентная фраза или анонс между линиями"
    },
    {
      type: "releases-list",
      category: "music",
      icon: "💿",
      title: "Каталог релизов",
      desc: "Автоматическая сетка / список вышедших релизов"
    },
    {
      type: "streaming-links",
      category: "music",
      icon: "🎧",
      title: "Кнопки площадок",
      desc: "Ссылки на Spotify, Apple Music, YouTube и др."
    },
    {
      type: "multi-image",
      category: "music",
      icon: "❖",
      title: "Галерея фото",
      desc: "От 1 до 6 изображений с выбором формы"
    },
    {
      type: "video-block",
      category: "music",
      icon: "▶",
      title: "Видеоплеер",
      desc: "Встроенное видео YouTube или MP4 файл"
    },
    {
      type: "next-release",
      category: "music",
      icon: "✦",
      title: "Строка анонса",
      desc: "Минималистичная строка следующего релиза"
    },
    {
      type: "socials-row",
      category: "nav",
      icon: "〰",
      title: "Портал соцсетей",
      desc: "Креативный блок Instagram и Telegram с волной"
    },
    {
      type: "action-button",
      category: "nav",
      icon: "↗",
      title: "Кнопка / Ссылка",
      desc: "Плоская кнопка перехода без градиента"
    },
    {
      type: "divider-spacer",
      category: "nav",
      icon: "―",
      title: "Разделитель / Отступ",
      desc: "Тонкая линия или пустое пространство"
    }
  ];

  const COLOR_PRESETS = [
    {
      name: "Референс (Чистый белый)",
      light: { bg: "#ffffff", text: "#212121", muted: "#5f5f5f", accent: "#212121", btnBg: "#212121", btnText: "#ffffff", line: "#dcdcdc" },
      dark: { bg: "#191919", text: "#f0f0f0", muted: "#a8a8a8", accent: "#f0f0f0", btnBg: "#f0f0f0", btnText: "#191919", line: "#363636" }
    },
    {
      name: "Теплая бумага и Эспрессо",
      light: { bg: "#faf7f2", text: "#231f1d", muted: "#6e655f", accent: "#3d2c24", btnBg: "#231f1d", btnText: "#faf7f2", line: "#e2dad0" },
      dark: { bg: "#1a1715", text: "#f2ece4", muted: "#a69b91", accent: "#e0c8b0", btnBg: "#f2ece4", btnText: "#1a1715", line: "#38312d" }
    },
    {
      name: "Татев (Горный лес)",
      light: { bg: "#f6f8f5", text: "#1c241e", muted: "#556358", accent: "#2d4732", btnBg: "#2d4732", btnText: "#ffffff", line: "#d5dfd7" },
      dark: { bg: "#131915", text: "#e9f0eb", muted: "#92a396", accent: "#88b391", btnBg: "#e9f0eb", btnText: "#131915", line: "#2b382e" }
    },
    {
      name: "Графит и Кобальт",
      light: { bg: "#f8fafc", text: "#0f172a", muted: "#64748b", accent: "#1e3a8a", btnBg: "#0f172a", btnText: "#ffffff", line: "#e2e8f0" },
      dark: { bg: "#0b0f19", text: "#f1f5f9", muted: "#94a3b8", accent: "#60a5fa", btnBg: "#f1f5f9", btnText: "#0b0f19", line: "#1e293b" }
    },
    {
      name: "Терракота и Песок",
      light: { bg: "#fdf8f5", text: "#2b1d19", muted: "#7c5e54", accent: "#9c4221", btnBg: "#9c4221", btnText: "#ffffff", line: "#ebd8d0" },
      dark: { bg: "#1c1412", text: "#f9ece6", muted: "#b5988e", accent: "#dd6b20", btnBg: "#f9ece6", btnText: "#1c1412", line: "#3d2b26" }
    },
    {
      name: "Монохром Галерея",
      light: { bg: "#f4f4f5", text: "#18181b", muted: "#71717a", accent: "#18181b", btnBg: "#18181b", btnText: "#ffffff", line: "#d4d4d8" },
      dark: { bg: "#09090b", text: "#fafafa", muted: "#a1a1aa", accent: "#fafafa", btnBg: "#fafafa", btnText: "#09090b", line: "#27272a" }
    }
  ];

  function showToast(msg) {
    const el = document.getElementById("studio-toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const ARROW_UP_RIGHT_SVG = `<svg class="arrow-up-right-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>`;

  function getFieldAlignStyle(block, field) {
    if (block && block.fieldAlign && block.fieldAlign[field]) {
      return `text-align:${block.fieldAlign[field]};`;
    }
    return "";
  }

  function sanitizeRichHtml(str) {
    if (!str) return "";
    const raw = String(str);
    if (!/<[a-z][\s\S]*>/i.test(raw)) {
      return escapeHtml(raw);
    }
    const tpl = document.createElement("template");
    tpl.innerHTML = raw;
    const allowedTags = new Set([
      "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL", "BR",
      "P", "DIV", "UL", "OL", "LI", "BLOCKQUOTE", "H2", "H3", "H4", "SPAN", "A"
    ]);
    const cleanNode = (node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (!allowedTags.has(child.tagName)) {
            const frag = document.createDocumentFragment();
            while (child.firstChild) frag.appendChild(child.firstChild);
            child.replaceWith(frag);
            cleanNode(node);
            return;
          }
          const alignAttr = child.getAttribute("align");
          const safeStyles = [];
          if (alignAttr && /^(left|center|right|justify)$/i.test(alignAttr.trim())) {
            safeStyles.push(`text-align:${alignAttr.trim().toLowerCase()}`);
          }
          const styleAttr = child.getAttribute("style") || "";
          if (styleAttr) {
            const mAlign = styleAttr.match(/text-align\s*:\s*(left|center|right|justify)/i);
            if (mAlign) safeStyles.push(`text-align:${mAlign[1].toLowerCase()}`);
            const mWeight = styleAttr.match(/font-weight\s*:\s*(bold|700|600|normal)/i);
            if (mWeight) safeStyles.push(`font-weight:${mWeight[1].toLowerCase()}`);
            const mStyle = styleAttr.match(/font-style\s*:\s*(italic|normal)/i);
            if (mStyle) safeStyles.push(`font-style:${mStyle[1].toLowerCase()}`);
            const mDeco = styleAttr.match(/text-decoration(?:-line)?\s*:\s*([^;]+)/i);
            if (mDeco) {
              const d = mDeco[1].toLowerCase();
              const parts = [];
              if (d.includes("underline")) parts.push("underline");
              if (d.includes("line-through")) parts.push("line-through");
              if (parts.length) safeStyles.push(`text-decoration:${parts.join(" ")}`);
            }
          }
          const attrs = Array.from(child.attributes);
          for (const attr of attrs) {
            const name = attr.name.toLowerCase();
            if (child.tagName === "A" && name === "href") {
              const val = attr.value.trim();
              if (/^javascript:/i.test(val)) {
                child.removeAttribute("href");
              } else {
                child.setAttribute("target", "_blank");
                child.setAttribute("rel", "noopener");
              }
            } else {
              child.removeAttribute(attr.name);
            }
          }
          if (safeStyles.length) {
            child.setAttribute("style", safeStyles.join("; ") + ";");
          }
          cleanNode(child);
        }
      }
    };
    cleanNode(tpl.content);
    return tpl.innerHTML;
  }

  function ensureLocalizedObj(obj, key) {
    if (!obj[key] || typeof obj[key] !== "object") {
      const val = typeof obj[key] === "string" ? obj[key] : "";
      obj[key] = { en: val, ru: val };
    }
    return obj[key];
  }

  function getLoc(obj, key) {
    if (!obj || obj[key] === undefined || obj[key] === null) return "";
    if (typeof obj[key] === "string") return obj[key];
    const enVal = obj[key].en;
    if (enVal !== undefined && enVal !== null && String(enVal).trim() !== "") {
      return enVal;
    }
    const ruVal = obj[key].ru;
    if (ruVal !== undefined && ruVal !== null && String(ruVal).trim() !== "") {
      return ruVal;
    }
    return enVal !== undefined ? enVal : "";
  }

  function setLoc(obj, key, value) {
    ensureLocalizedObj(obj, key);
    obj[key].en = value;
    obj[key].ru = value;
  }

  /* ==========================================================================
     REQUIREMENT #3: NEW BLOCKS START COMPLETELY EMPTY ("Здесь пока пусто")
     ========================================================================== */
  function createEmptyBlock(type) {
    const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const base = {
      id,
      type,
      widthPct: type === "hero-banner" ? 100 : 88,
      padY: type === "hero-banner" ? 0 : 28,
      shape: "sharp",
      bgColor: "transparent",
      textColor: "",
      visible: true
    };

    switch (type) {
      case "hero-banner":
        return {
          ...base,
          fullBleed: true,
          height: 230,
          image: "",
          overlayOpacity: 0.2,
          title: { en: "", ru: "" },
          subtitle: { en: "", ru: "" }
        };
      case "split-content":
        return {
          ...base,
          layout: "image-left",
          splitRatio: 42,
          framedHeading: true,
          tilt3d: true,
          images: [""],
          imageSize: 400,
          title: { en: "", ru: "" },
          subtitle: { en: "", ru: "" },
          text: { en: "", ru: "" },
          buttonText: { en: "", ru: "" },
          linkUrl: ""
        };
      case "socials-row":
        return {
          ...base,
          align: "center",
          iconSize: 34,
          padY: 24
        };
      case "text-block":
        return {
          ...base,
          align: "left",
          framedHeading: true,
          title: { en: "", ru: "" },
          text: { en: "", ru: "" }
        };
      case "multi-image":
        return {
          ...base,
          columns: 2,
          tilt3d: true,
          images: ["", ""],
          caption: { en: "", ru: "" }
        };
      case "framed-quote":
        return {
          ...base,
          text: { en: "", ru: "" },
          subtitle: { en: "", ru: "" }
        };
      case "two-col-text":
        return {
          ...base,
          title: { en: "", ru: "" },
          leftText: { en: "", ru: "" },
          rightText: { en: "", ru: "" }
        };
      case "releases-list":
        return {
          ...base,
          showAll: true,
          title: { en: "", ru: "" }
        };
      case "streaming-links":
        return {
          ...base,
          title: { en: "", ru: "" },
          releaseSlug: ""
        };
      case "video-block":
        return {
          ...base,
          title: { en: "", ru: "" },
          text: { en: "", ru: "" },
          videoUrl: ""
        };
      case "next-release":
        return {
          ...base,
          title: { en: "", ru: "" }
        };
      case "action-button":
        return {
          ...base,
          align: "center",
          btnStyle: "flat",
          buttonText: { en: "", ru: "" },
          linkUrl: ""
        };
      case "divider-spacer":
        return {
          ...base,
          padY: 32,
          showLine: true
        };
      default:
        return base;
    }
  }

  /* ==========================================================================
     ACTIVE BLOCK LIST FOR CURRENT PAGE (Main, Custom Page, or Release Page)
     ========================================================================== */
  function getActiveBlocksArray() {
    if (state.currentPage === "main") {
      if (!Array.isArray(state.siteData.blocks)) state.siteData.blocks = [];
      return state.siteData.blocks;
    }
    if (state.currentPage.startsWith("page:")) {
      const slug = state.currentPage.slice(5);
      const pg = (state.siteData.customPages || []).find((p) => p.slug === slug);
      if (pg) {
        if (!Array.isArray(pg.blocks)) pg.blocks = [];
        return pg.blocks;
      }
    }
    if (state.currentPage.startsWith("release:")) {
      const slug = state.currentPage.slice(8);
      const rel = (state.siteData.releases || []).find((r) => r.slug === slug);
      if (rel) {
        if (!Array.isArray(rel.extraBlocks)) rel.extraBlocks = [];
        return rel.extraBlocks;
      }
    }
    return null;
  }

  /* ==========================================================================
     APPLY THEME & FONTS TO CANVAS PAPER
     ========================================================================== */
  function applyCanvasVariables() {
    const paper = document.getElementById("canvas-paper");
    if (!paper) return;
    paper.setAttribute("data-theme", state.canvasTheme);

    const settings = state.siteData.settings || {};
    const colors =
      state.canvasTheme === "dark"
        ? settings.darkColors || { bg: "#191919", text: "#f0f0f0", muted: "#a8a8a8", accent: "#f0f0f0", btnBg: "#f0f0f0", btnText: "#191919", line: "#363636" }
        : settings.lightColors || { bg: "#ffffff", text: "#212121", muted: "#5f5f5f", accent: "#212121", btnBg: "#212121", btnText: "#ffffff", line: "#dcdcdc" };

    paper.style.setProperty("--bg", colors.bg || "#ffffff");
    paper.style.setProperty("--text", colors.text || "#212121");
    paper.style.setProperty("--muted", colors.muted || "#5f5f5f");
    paper.style.setProperty("--accent", colors.accent || "#212121");
    paper.style.setProperty("--btn-bg", colors.btnBg || "#212121");
    paper.style.setProperty("--btn-text", colors.btnText || "#ffffff");
    paper.style.setProperty("--line", colors.line || "#dcdcdc");
    paper.style.backgroundColor = colors.bg || "#ffffff";
    paper.style.color = colors.text || "#212121";

    const fonts = settings.fonts || {};
    if (fonts.banner) paper.style.setProperty("--font-banner", fonts.banner);
    if (fonts.heading) paper.style.setProperty("--font-heading", fonts.heading);
    if (fonts.body) paper.style.setProperty("--font-body", fonts.body);

    if (state.initialized) {
      scheduleAutoSave();
    }
  }

  /* ==========================================================================
     RENDER PAGE SELECTOR & PAGES TREE IN SIDEBAR (Requirement #4: Fixed!)
     ========================================================================== */
  function renderPagesNavigation() {
    const select = document.getElementById("page-selector");
    const tree = document.getElementById("pages-tree-list");
    const releases = state.siteData.releases || [];
    const customPages = state.siteData.customPages || [];

    // Validate currentPage still exists
    if (state.currentPage.startsWith("release:")) {
      const slug = state.currentPage.slice(8);
      if (!releases.some((r) => r.slug === slug)) state.currentPage = "main";
    } else if (state.currentPage.startsWith("page:")) {
      const slug = state.currentPage.slice(5);
      if (!customPages.some((p) => p.slug === slug)) state.currentPage = "main";
    }

    if (select) {
      let opts = `<option value="main">Главная страница (/)</option>`;
      releases.forEach((r) => {
        opts += `<option value="release:${escapeHtml(r.slug)}">Релиз: ${escapeHtml(r.title)} (/release/${escapeHtml(r.slug)})</option>`;
      });
      customPages.forEach((p) => {
        const title = getLoc(p, "title") || p.slug;
        opts += `<option value="page:${escapeHtml(p.slug)}">Страница: ${escapeHtml(title)} (/page/${escapeHtml(p.slug)})</option>`;
      });
      opts += `
        <option value="videos">Страница Видео (/videos)</option>
        <option value="thoughts">Канал / Мысли (/thoughts)</option>
      `;
      select.innerHTML = opts;
      select.value = state.currentPage;
    }

    if (tree) {
      let html = `
        <div class="page-tree-item ${state.currentPage === "main" ? "active" : ""}" data-switch-page="main">
          <div class="page-tree-left">
            <span class="page-tree-title">🏠 Главная страница</span>
            <span class="page-tree-url">/ (Блоков: ${(state.siteData.blocks || []).length})</span>
          </div>
        </div>
      `;

      if (releases.length) {
        html += `<div class="drawer-section-title" style="margin:12px 0 6px;">Страницы релизов</div>`;
        releases.forEach((r, idx) => {
          const key = `release:${r.slug}`;
          html += `
            <div class="page-tree-item ${state.currentPage === key ? "active" : ""}" data-switch-page="${escapeHtml(key)}">
              <div class="page-tree-left">
                <span class="page-tree-title">💿 ${escapeHtml(r.title || "Без названия")}</span>
                <span class="page-tree-url">/release/${escapeHtml(r.slug)}</span>
              </div>
              <div class="page-tree-actions">
                <button type="button" class="adm-btn adm-btn-sm adm-btn-danger" data-delete-release="${idx}" title="Удалить страницу релиза">🗑</button>
              </div>
            </div>
          `;
        });
      }

      if (customPages.length) {
        html += `<div class="drawer-section-title" style="margin:12px 0 6px;">Пользовательские страницы</div>`;
        customPages.forEach((p, idx) => {
          const key = `page:${p.slug}`;
          const title = getLoc(p, "title") || "Новая страница";
          html += `
            <div class="page-tree-item ${state.currentPage === key ? "active" : ""}" data-switch-page="${escapeHtml(key)}">
              <div class="page-tree-left">
                <span class="page-tree-title">📄 ${escapeHtml(title)}</span>
                <span class="page-tree-url">/page/${escapeHtml(p.slug)} (Блоков: ${(p.blocks || []).length})</span>
              </div>
              <div class="page-tree-actions">
                <button type="button" class="adm-btn adm-btn-sm adm-btn-danger" data-delete-custom-page="${idx}" title="Удалить эту страницу">🗑</button>
              </div>
            </div>
          `;
        });
      }

      html += `
        <div class="drawer-section-title" style="margin:12px 0 6px;">Специальные разделы</div>
        <div class="page-tree-item ${state.currentPage === "videos" ? "active" : ""}" data-switch-page="videos">
          <div class="page-tree-left">
            <span class="page-tree-title">🎬 Видеоработы</span>
            <span class="page-tree-url">/videos (${(state.siteData.videos || []).length} видео)</span>
          </div>
        </div>
        <div class="page-tree-item ${state.currentPage === "thoughts" ? "active" : ""}" data-switch-page="thoughts">
          <div class="page-tree-left">
            <span class="page-tree-title">💬 Канал / Мысли (с границами)</span>
            <span class="page-tree-url">/thoughts (${(state.siteData.posts || []).length} постов)</span>
          </div>
        </div>
      `;

      tree.innerHTML = html;
    }
  }

  /* ==========================================================================
     RENDER SINGLE INTERACTIVE BLOCK ON CANVAS (With Visual Resize & Controls)
     ========================================================================== */
  function renderVisualBlock(block, idx, total) {
    const widthPct = Number(block.widthPct) || 88;
    const padY = block.padY !== undefined ? Number(block.padY) : 28;
    const shape = block.shape || "sharp";
    const shapeClass = `shape-${shape}`;
    const bgColor = block.bgColor && block.bgColor !== "transparent" ? block.bgColor : "transparent";
    const textColor = block.textColor || "";
    const isSelected = state.selectedBlockId === block.id;

    const blockMeta = STANDARD_BLOCKS.find((b) => b.type === block.type) || { title: block.type };

    // Build Modern Glassmorphic On-Block Visual Toolbar
    let extraToolbarControls = "";

    // Shape selector for blocks that have visual shapes
    if (["split-content", "multi-image", "video-block", "hero-banner", "releases-list"].includes(block.type)) {
      extraToolbarControls += `
        <select class="vblock-tb-select" data-block-prop="shape" data-block-idx="${idx}" title="Форма изображения / блока">
          ${SHAPES.map((s) => `<option value="${s.id}" ${shape === s.id ? "selected" : ""}>⬡ ${s.label}</option>`).join("")}
        </select>
      `;
    }

    // Image count (+ Фото / - Фото) & Image size for split-content and multi-image
    if (block.type === "split-content" || block.type === "multi-image") {
      if (!Array.isArray(block.images) || !block.images.length) {
        block.images = block.image ? [block.image] : [""];
      }
      extraToolbarControls += `
        <button type="button" class="vblock-tb-btn" data-add-block-img="${idx}" title="Добавить еще одно изображение в блок">+ Фото (${block.images.length})</button>
        ${block.images.length > 1 ? `<button type="button" class="vblock-tb-btn" data-remove-block-img="${idx}" title="Убрать последнее фото">− Фото</button>` : ""}
      `;
    }

    if (block.type === "split-content") {
      extraToolbarControls += `
        <button type="button" class="vblock-tb-btn" data-toggle-layout="${idx}" title="Поменять местами фото и текст">
          ⇄ ${block.layout === "image-right" ? "Фото справа" : "Фото слева"}
        </button>
        <label class="vblock-tb-num-chip" title="Максимальная ширина фото (в пикселях)">
          <span>Фото</span>
          <input type="number" min="180" max="620" step="10" value="${Number(block.imageSize) || 400}" data-block-input="imageSize" data-block-idx="${idx}">
          <span style="opacity:0.65;">px</span>
        </label>
        <button type="button" class="vblock-tb-btn ${block.framedHeading !== false ? "is-active" : ""}" data-toggle-framed="${idx}" title="Линии сверху и снизу заголовка">
          ═ Линии
        </button>
        <button type="button" class="vblock-tb-btn ${block.tilt3d !== false ? "is-active" : ""}" data-toggle-tilt="${idx}" title="3D анимация обложки при наведении">
          3D Эффект
        </button>
      `;
    }

    if (block.type === "hero-banner") {
      extraToolbarControls += `
        <button type="button" class="vblock-tb-btn" data-pick-banner-img="${idx}">🖼 Сменить баннер</button>
        <button type="button" class="vblock-tb-btn ${block.noImage ? "is-active" : ""}" data-toggle-banner-noimg="${idx}" title="Отключить фото баннера (чистый фон под светлую/темную тему)">
          ${block.noImage ? "🚫 Без фото: Вкл" : "🖼 Фото: Вкл"}
        </button>
        <button type="button" class="vblock-tb-btn ${block.fullBleed !== false ? "is-active" : ""}" data-toggle-fullbleed="${idx}">
          ${block.fullBleed !== false ? "↔ Во всю ширину" : "↔ В контейнере"}
        </button>
      `;
    }

    const toolbarHtml = `
      <div class="vblock-toolbar">
        <div class="vblock-tb-group">
          <span class="vblock-drag-handle" draggable="true" data-drag-idx="${idx}" title="Перетащите для изменения порядка">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" style="opacity:0.75;"><circle cx="2.5" cy="2" r="1.2"/><circle cx="7.5" cy="2" r="1.2"/><circle cx="2.5" cy="6" r="1.2"/><circle cx="7.5" cy="6" r="1.2"/><circle cx="2.5" cy="10" r="1.2"/><circle cx="7.5" cy="10" r="1.2"/></svg>
            <span>${escapeHtml(blockMeta.title)}</span>
          </span>
          <span class="vblock-size-pill" data-size-readout="${idx}">Ш:${widthPct}% · В:${block.type === "hero-banner" ? (block.height || 230) + "px" : padY + "px"}</span>
          ${extraToolbarControls ? `<span class="vblock-tb-divider"></span>${extraToolbarControls}` : ""}
        </div>
        <div class="vblock-tb-group">
          <label class="vblock-color-chip" title="Цвет фона блока">
            <input type="color" class="vblock-tb-color" data-block-color="bgColor" data-block-idx="${idx}" value="${bgColor !== "transparent" ? bgColor : "#ffffff"}">
            <span>Фон</span>
          </label>
          <button type="button" class="vblock-tb-btn" data-clear-bg="${idx}" title="Сделать фон прозрачным (бесшовным)">Прозр.</button>
          <label class="vblock-color-chip" title="Цвет текста блока">
            <input type="color" class="vblock-tb-color" data-block-color="textColor" data-block-idx="${idx}" value="${textColor || "#212121"}">
            <span>Текст</span>
          </label>
          <span class="vblock-tb-divider"></span>
          <button type="button" class="vblock-tb-btn icon-only" data-move-block="${idx}" data-dir="-1" ${idx === 0 ? "disabled" : ""} title="Переместить выше">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
          <button type="button" class="vblock-tb-btn icon-only" data-move-block="${idx}" data-dir="1" ${idx === total - 1 ? "disabled" : ""} title="Переместить ниже">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <button type="button" class="vblock-tb-btn icon-only" data-dup-block="${idx}" title="Дублировать блок">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
          <button type="button" class="vblock-tb-btn icon-only ${block.visible === false ? "is-active" : ""}" data-vis-block="${idx}" title="Скрыть / Показать блок">
            ${
              block.visible === false
                ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`
                : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`
            }
          </button>
          <button type="button" class="vblock-tb-btn icon-only danger" data-del-block="${idx}" title="Удалить блок">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

    // Build Block Inner Content with Empty Placeholders ("Здесь пока пусто")
    let innerHtml = "";

    if (block.type === "hero-banner") {
      const h = Number(block.height) || 230;
      const noImg = block.noImage === true;
      const hasImg = !noImg && !!block.image;
      const bgStyle = noImg
        ? `min-height:${h}px;`
        : hasImg
        ? `background-image:url('${escapeHtml(block.image)}');min-height:${h}px;`
        : `background:#27272a;min-height:${h}px;border:1.5px dashed #71717a;`;

      innerHtml = `
        <div class="hero-banner-block ${noImg ? "no-banner-image" : ""} ${block.fullBleed !== false ? "" : shapeClass}" style="${bgStyle}">
          ${noImg ? "" : `<div class="hero-banner-overlay" style="opacity:${block.overlayOpacity !== undefined ? block.overlayOpacity : 0.18};"></div>`}
          <div class="hero-banner-content" style="width:100%;max-width:760px;">
            ${
              !hasImg && !noImg
                ? `<div style="margin-bottom:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                    <button type="button" class="adm-btn adm-btn-sm" data-pick-banner-img="${idx}">+ Выбрать фото баннера</button>
                    <button type="button" class="adm-btn adm-btn-sm" data-toggle-banner-noimg="${idx}">🚫 Использовать без фото (чистый фон)</button>
                  </div>`
                : ""
            }
            <h1 class="hero-banner-title" contenteditable="true" data-edit-field="title" data-block-idx="${idx}" data-placeholder="Здесь пока пусто — введите заголовок баннера (например: 1arutyun)" style="${textColor ? `color:${textColor};` : ""}${getFieldAlignStyle(block, "title")}">${sanitizeRichHtml(getLoc(block, "title"))}</h1>
            <p class="hero-banner-subtitle" contenteditable="true" data-edit-field="subtitle" data-block-idx="${idx}" data-placeholder="Подзаголовок баннера (необязательно)..." style="${getFieldAlignStyle(block, "subtitle")}">${sanitizeRichHtml(getLoc(block, "subtitle"))}</p>
          </div>
        </div>
      `;
    } else if (block.type === "socials-row") {
      const socials = (state.siteData.profile && state.siteData.profile.socials) || {};
      const igHandle = socials.instagramHandle || "@1arutyun";
      const tgHandle = socials.telegramHandle || "@u_aruta";
      innerHtml = `
        <div class="socials-creative-wrap">
          <div class="socials-creative-header">
            <div class="socials-creative-title-group">
              <div class="socials-wave-eq" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
              <h2 class="socials-creative-heading" contenteditable="true" data-edit-field="title" data-block-idx="${idx}" data-placeholder="Заголовок блока соцсетей (например: Stay on the Same Frequency)" style="${getFieldAlignStyle(block, "title")}">${sanitizeRichHtml(getLoc(block, "title") || "Stay on the Same Frequency")}</h2>
            </div>
            <div class="socials-creative-sub" contenteditable="true" data-edit-field="subtitle" data-block-idx="${idx}" data-placeholder="Подзаголовок..." style="${getFieldAlignStyle(block, "subtitle")}">${sanitizeRichHtml(getLoc(block, "subtitle") || "Direct line — visual fragments, unreleased demos & thoughts in the quiet")}</div>
          </div>

          <div class="socials-creative-grid">
            <div class="social-portal-card">
              <div class="social-portal-left">
                <div class="social-orbit-ring">
                  <svg width="34" height="34" viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="40" height="40" rx="11" fill="#d6249f"/><rect x="11.5" y="11.5" width="25" height="25" rx="6.5" stroke="#fff" stroke-width="2.6" fill="none"/><circle cx="24" cy="24" r="6" stroke="#fff" stroke-width="2.6" fill="none"/><circle cx="31.2" cy="16.8" r="1.6" fill="#fff"/></svg>
                </div>
                <div class="social-portal-info">
                  <span class="social-portal-tag">01 // Visual Diary & Stories</span>
                  <span class="social-portal-handle">Instagram · ${escapeHtml(igHandle)}</span>
                  <span class="social-portal-desc">Behind the scenes, visual fragments, and moments between releases.</span>
                </div>
              </div>
              <span class="social-portal-arrow">${ARROW_UP_RIGHT_SVG}</span>
            </div>

            <div class="social-portal-card">
              <div class="social-portal-left">
                <div class="social-orbit-ring">
                  <svg width="34" height="34" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#2AABEE"/><path d="M13.6 23.6L32.8 16.2C33.7 15.9 34.5 16.4 34.2 17.7L30.9 33.2C30.7 34.3 30 34.6 29.1 34.1L24.1 30.4L21.7 32.7C21.4 33 21.2 33.2 20.7 33.2L21.1 28.1L30.4 19.7C30.8 19.3 30.3 19.1 29.8 19.5L18.3 26.7L13.4 25.2C12.3 24.8 12.3 24.1 13.6 23.6Z" fill="#fff"/></svg>
                </div>
                <div class="social-portal-info">
                  <span class="social-portal-tag">02 // Personal Channel & Demos</span>
                  <span class="social-portal-handle">Telegram · ${escapeHtml(tgHandle)}</span>
                  <span class="social-portal-desc">Unfiltered thoughts, voice notes, drafts, and late-night conversations.</span>
                </div>
              </div>
              <span class="social-portal-arrow">${ARROW_UP_RIGHT_SVG}</span>
            </div>
          </div>
        </div>
      `;
    } else if (block.type === "split-content") {
      const ratio = Number(block.splitRatio) || 42;
      const isRight = block.layout === "image-right";
      const gridCols = isRight
        ? `minmax(0, ${100 - ratio}fr) minmax(0, ${ratio}fr)`
        : `minmax(0, ${ratio}fr) minmax(0, ${100 - ratio}fr)`;
      const images = Array.isArray(block.images) && block.images.length ? block.images : [""];
      const imgCountClass = images.length >= 3 ? "cols-3" : images.length === 2 ? "cols-2" : "cols-1";
      const nearAlignClass = isRight ? "align-near-left" : "align-near-right";

      const imagesColHtml = `
        <div class="split-images-col ${imgCountClass} ${nearAlignClass}" data-split-img-col="${idx}" style="position:relative;${block.imageSize ? `max-width:${block.imageSize}px;` : ""}">
          ${images
            .map((imgUrl, imgIdx) =>
              imgUrl
                ? `<div class="editable-image-box">
                    <div class="cover-3d-card ${shapeClass}">
                      <img src="${escapeHtml(imgUrl)}" alt="">
                    </div>
                    <div class="editable-image-actions">
                      <button type="button" class="adm-btn adm-btn-sm" data-pick-split-img="${idx}" data-img-idx="${imgIdx}">Сменить фото</button>
                      <button type="button" class="adm-btn adm-btn-sm adm-btn-danger" data-clear-split-img="${idx}" data-img-idx="${imgIdx}">Очистить</button>
                    </div>
                  </div>`
                : `<div class="empty-image-slot ${shapeClass}" data-pick-split-img="${idx}" data-img-idx="${imgIdx}">
                    <strong style="font-size:0.9rem;">Здесь пока пусто</strong>
                    <span>Нажмите, чтобы выбрать или загрузить изображение</span>
                  </div>`
            )
            .join("")}
          <div class="split-img-size-handle" data-resize-img-size="${idx}" title="Потяните, чтобы изменить размер фото (${block.imageSize || 400}px)">⤡</div>
        </div>
      `;

      const textColHtml = `
        <div class="split-text-col">
          <div class="${block.framedHeading !== false ? "framed-heading-box" : "unframed-heading-box"}">
            <h2 class="split-heading" contenteditable="true" data-edit-field="title" data-block-idx="${idx}" data-placeholder="Здесь пока пусто — введите заголовок" style="${getFieldAlignStyle(block, "title")}">${sanitizeRichHtml(getLoc(block, "title"))}</h2>
          </div>
          <div class="split-subtitle" contenteditable="true" data-edit-field="subtitle" data-block-idx="${idx}" data-placeholder="Подзаголовок / дата релиза (здесь пока пусто)..." style="${getFieldAlignStyle(block, "subtitle")}">${sanitizeRichHtml(getLoc(block, "subtitle"))}</div>
          <div class="split-body-text" contenteditable="true" data-edit-field="text" data-block-idx="${idx}" data-placeholder="Здесь пока пусто — нажмите, чтобы написать текст или манифест (доступно форматирование)..." style="${getFieldAlignStyle(block, "text")}">${sanitizeRichHtml(getLoc(block, "text"))}</div>
          <div style="margin-top:18px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
            <span class="btn-flat" contenteditable="true" data-edit-field="buttonText" data-block-idx="${idx}" data-placeholder="Текст кнопки (необязательно)...">${sanitizeRichHtml(getLoc(block, "buttonText"))}</span>
            <input type="text" class="adm-input" style="width:220px;font-size:0.75rem;" placeholder="Ссылка (напр. /release/undefined)" value="${escapeHtml(block.linkUrl || "")}" data-block-input="linkUrl" data-block-idx="${idx}">
          </div>
        </div>
      `;

      const dividerLeft = isRight ? 100 - ratio : ratio;

      innerHtml = `
        <div class="split-content-inner" style="grid-template-columns:${gridCols};position:relative;">
          ${isRight ? textColHtml + imagesColHtml : imagesColHtml + textColHtml}
          <div class="split-ratio-resizer" style="left:${dividerLeft}%;" data-resize-split="${idx}" title="Потяните влево/вправо для изменения пропорции колонок"></div>
        </div>
      `;
    } else if (block.type === "text-block") {
      innerHtml = `
        <div>
          <div class="${block.framedHeading ? "framed-heading-box" : "unframed-heading-box"}">
            <h2 class="split-heading" style="font-size:1.9rem;${getFieldAlignStyle(block, "title")}" contenteditable="true" data-edit-field="title" data-block-idx="${idx}" data-placeholder="Здесь пока пусто — введите заголовок...">${sanitizeRichHtml(getLoc(block, "title"))}</h2>
          </div>
          <div class="split-body-text" style="${getFieldAlignStyle(block, "text")}" contenteditable="true" data-edit-field="text" data-block-idx="${idx}" data-placeholder="Здесь пока пусто — введите основной текст блока (выделите текст для жирного, курсива, ссылок)...">${sanitizeRichHtml(getLoc(block, "text"))}</div>
        </div>
      `;
    } else if (block.type === "multi-image") {
      const images = Array.isArray(block.images) && block.images.length ? block.images : [""];
      const cols = Math.min(images.length, 3) || 1;
      innerHtml = `
        <div>
          <div class="gallery-grid" style="grid-template-columns:repeat(${cols}, 1fr);">
            ${images
              .map((src, imgIdx) =>
                src
                  ? `<div class="editable-image-box">
                      <div class="cover-3d-card ${shapeClass}">
                        <img src="${escapeHtml(src)}" alt="">
                      </div>
                      <div class="editable-image-actions">
                        <button type="button" class="adm-btn adm-btn-sm" data-pick-split-img="${idx}" data-img-idx="${imgIdx}">Сменить</button>
                        <button type="button" class="adm-btn adm-btn-sm adm-btn-danger" data-clear-split-img="${idx}" data-img-idx="${imgIdx}">✕</button>
                      </div>
                    </div>`
                  : `<div class="empty-image-slot ${shapeClass}" data-pick-split-img="${idx}" data-img-idx="${imgIdx}">
                      <strong>Здесь пока пусто</strong>
                      <span>Нажмите, чтобы добавить фото #${imgIdx + 1}</span>
                    </div>`
              )
              .join("")}
          </div>
          <p style="text-align:center;color:var(--muted);font-size:0.86rem;margin-top:10px;font-style:italic;${getFieldAlignStyle(block, "caption")}" contenteditable="true" data-edit-field="caption" data-block-idx="${idx}" data-placeholder="Подпись к галерее (необязательно)...">${sanitizeRichHtml(getLoc(block, "caption"))}</p>
        </div>
      `;
    } else if (block.type === "framed-quote") {
      innerHtml = `
        <blockquote class="framed-quote-block">
          <div style="${getFieldAlignStyle(block, "text")}" contenteditable="true" data-edit-field="text" data-block-idx="${idx}" data-placeholder="Здесь пока пусто — введите цитату или важную мысль...">${sanitizeRichHtml(getLoc(block, "text"))}</div>
          <footer style="margin-top:10px;font-size:0.9rem;color:var(--muted);font-style:normal;${getFieldAlignStyle(block, "subtitle")}" contenteditable="true" data-edit-field="subtitle" data-block-idx="${idx}" data-placeholder="Автор / подпись (необязательно)">${sanitizeRichHtml(getLoc(block, "subtitle"))}</footer>
        </blockquote>
      `;
    } else if (block.type === "two-col-text") {
      innerHtml = `
        <div>
          <div class="framed-heading-box">
            <h2 class="split-heading" style="font-size:1.75rem;${getFieldAlignStyle(block, "title")}" contenteditable="true" data-edit-field="title" data-block-idx="${idx}" data-placeholder="Заголовок двух колонок (здесь пока пусто)...">${sanitizeRichHtml(getLoc(block, "title"))}</h2>
          </div>
          <div class="two-col-text-grid">
            <div class="split-body-text" style="${getFieldAlignStyle(block, "leftText")}" contenteditable="true" data-edit-field="leftText" data-block-idx="${idx}" data-placeholder="Левая колонка — здесь пока пусто...">${sanitizeRichHtml(getLoc(block, "leftText"))}</div>
            <div class="split-body-text" style="${getFieldAlignStyle(block, "rightText")}" contenteditable="true" data-edit-field="rightText" data-block-idx="${idx}" data-placeholder="Правая колонка — здесь пока пусто...">${sanitizeRichHtml(getLoc(block, "rightText"))}</div>
          </div>
        </div>
      `;
    } else if (block.type === "releases-list") {
      const releases = state.siteData.releases || [];
      innerHtml = `
        <div>
          <div class="framed-heading-box" style="margin-bottom:18px;">
            <h3 class="split-heading" style="font-size:1.6rem;${getFieldAlignStyle(block, "title")}" contenteditable="true" data-edit-field="title" data-block-idx="${idx}" data-placeholder="Заголовок списка релизов (оставьте пустым, если не нужен)...">${sanitizeRichHtml(getLoc(block, "title"))}</h3>
          </div>
          <div style="padding:14px;border:1px dashed var(--line);font-size:0.84rem;color:var(--muted);">
            Каталог релизов (${releases.length}): ${releases.slice(0, 5).map((r) => `<strong>${escapeHtml(r.title)}</strong>`).join(", ") || "нет релизов"}${releases.length > 5 ? ` и ещё ${releases.length - 5}` : ""}.
            <label style="margin-left:12px;cursor:pointer;">
              <input type="checkbox" data-block-check="showAll" data-block-idx="${idx}" ${block.showAll ? "checked" : ""}> Показывать все релизы всегда
            </label>
          </div>
        </div>
      `;
    } else if (block.type === "streaming-links") {
      const releases = state.siteData.releases || [];
      const rel = releases.find((r) => r.slug === block.releaseSlug) || releases[0];
      const platforms = (rel && rel.platforms) || [];
      innerHtml = `
        <div>
          <h3 style="font-family:var(--font-heading);font-size:1.2rem;margin-bottom:10px;${getFieldAlignStyle(block, "title")}" contenteditable="true" data-edit-field="title" data-block-idx="${idx}" data-placeholder="Заголовок блока площадок (например: Слушать на всех площадках)...">${sanitizeRichHtml(getLoc(block, "title"))}</h3>
          <div class="platforms-grid-clean">
            ${platforms.map((p) => `<div class="platform-clean-link"><span>${escapeHtml(p.name)}</span><span class="platform-clean-arrow">${ARROW_UP_RIGHT_SVG}</span></div>`).join("")}
          </div>
        </div>
      `;
    } else if (block.type === "video-block") {
      innerHtml = `
        <div>
          <h3 style="font-family:var(--font-heading);font-size:1.3rem;margin-bottom:10px;${getFieldAlignStyle(block, "title")}" contenteditable="true" data-edit-field="title" data-block-idx="${idx}" data-placeholder="Название видео (здесь пока пусто)...">${sanitizeRichHtml(getLoc(block, "title"))}</h3>
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <input type="text" class="adm-input" placeholder="Ссылка на YouTube или путь к MP4 файлу (здесь пока пусто)..." value="${escapeHtml(block.videoUrl || "")}" data-block-input="videoUrl" data-block-idx="${idx}">
            <button type="button" class="adm-btn adm-btn-sm" data-pick-video-block="${idx}">Выбрать файл</button>
          </div>
          ${
            block.videoUrl
              ? `<div style="padding:18px;background:#111;color:#fff;text-align:center;font-family:var(--font-mono);font-size:0.82rem;">▶ Видео привязано: ${escapeHtml(block.videoUrl)}</div>`
              : `<div class="empty-image-slot" style="min-height:150px;" data-pick-video-block="${idx}"><strong>Здесь пока пусто</strong><span>Вставьте ссылку на YouTube выше или нажмите, чтобы выбрать видеофайл</span></div>`
          }
        </div>
      `;
    } else if (block.type === "next-release") {
      innerHtml = `
        <div class="next-release-line" style="${getFieldAlignStyle(block, "title")}" contenteditable="true" data-edit-field="title" data-block-idx="${idx}" data-placeholder="Здесь пока пусто — например: Next Release - /   / 2026">${sanitizeRichHtml(getLoc(block, "title"))}</div>
      `;
    } else if (block.type === "action-button") {
      const btnAlign = (block.fieldAlign && block.fieldAlign.buttonText) || block.align || "center";
      innerHtml = `
        <div style="text-align:${btnAlign};">
          <div style="display:inline-flex;flex-direction:column;gap:8px;align-items:center;">
            <span class="${block.btnStyle === "outline" ? "btn-outline" : "btn-flat"}" contenteditable="true" data-edit-field="buttonText" data-block-idx="${idx}" data-placeholder="Здесь пока пусто — введите текст кнопки">${sanitizeRichHtml(getLoc(block, "buttonText"))}</span>
            <input type="text" class="adm-input" style="width:240px;font-size:0.75rem;" placeholder="URL ссылки (напр. https://...)" value="${escapeHtml(block.linkUrl || "")}" data-block-input="linkUrl" data-block-idx="${idx}">
          </div>
        </div>
      `;
    } else if (block.type === "divider-spacer") {
      innerHtml = `
        <div>
          ${block.showLine !== false ? `<hr style="border:none;border-top:1px solid var(--line);">` : `<div style="text-align:center;font-size:0.72rem;color:var(--muted);">Пустой отступ (${padY * 2}px)</div>`}
        </div>
      `;
    }

    const maxPx = Math.round((1180 * widthPct) / 100);
    const isFullBleed = block.fullBleed || (block.type === "hero-banner" && block.fullBleed !== false);
    const wrapStyle = `max-width:${isFullBleed ? "100%" : maxPx + "px"};width:${isFullBleed ? "100%" : widthPct + "%"};padding:${padY}px ${isFullBleed ? "0" : "24px"};background:${bgColor};${textColor ? `color:${textColor};` : ""}`;

    return `
      <div class="vblock-wrapper ${isSelected ? "selected" : ""} ${block.visible === false ? "is-hidden" : ""}"
           data-block-wrapper="${idx}"
           data-block-id="${escapeHtml(block.id)}"
           data-fullbleed="${isFullBleed ? "true" : "false"}"
           style="${wrapStyle}">
        ${toolbarHtml}
        ${innerHtml}
        <!-- Direct Mouse Resize Handles (Left, Right, Bottom) -->
        <div class="vblock-resize-width-left" data-resize-width="${idx}" data-resize-side="left" title="Потяните влево/вправо для изменения ширины блока"></div>
        <div class="vblock-resize-width" data-resize-width="${idx}" data-resize-side="right" title="Потяните влево/вправо для изменения ширины блока"></div>
        <div class="vblock-resize-height" data-resize-height="${idx}" title="Потяните вверх/вниз для изменения высоты / отступа блока"></div>
      </div>
    `;
  }

  function renderSimulatedHeader() {
    const profile = state.siteData.profile || {};
    const customPages = (state.siteData.customPages || []).filter((p) => p.showInNav !== false);
    return `
      <header class="site-header scrolled" style="position:relative;z-index:10;pointer-events:none;opacity:0.92;">
        <div class="header-bar">
          <span class="brand-link">
            <img src="${escapeHtml(profile.avatar || "/assets/logo_or_avatar.jpg")}" alt="" class="brand-avatar">
            <span>${escapeHtml(profile.artistName || "1arutyun")}</span>
          </span>
          <div class="header-right">
            <nav class="main-nav">
              <span class="nav-item ${state.currentPage === "main" ? "active" : ""}">Main Page</span>
              ${customPages.map((p) => `<span class="nav-item ${state.currentPage === `page:${p.slug}` ? "active" : ""}">${escapeHtml(getLoc(p, "title") || p.slug)}</span>`).join("")}
              <span class="nav-item ${state.currentPage === "videos" ? "active" : ""}">Videos</span>
              <span class="nav-item ${state.currentPage === "thoughts" ? "active" : ""}">Thoughts</span>
            </nav>
          </div>
        </div>
      </header>
    `;
  }

  /* ==========================================================================
     RENDER FULL CANVAS FOR CURRENTLY SELECTED PAGE
     ========================================================================== */
  function renderCanvas() {
    commitHistorySnapshot(true);
    applyCanvasVariables();
    const paper = document.getElementById("canvas-paper");
    if (!paper) return;

    // 1. MAIN PAGE (`/`)
    if (state.currentPage === "main") {
      const blocks = state.siteData.blocks || [];
      paper.innerHTML = `
        ${renderSimulatedHeader()}
        <div class="seamless-blocks-flow">
          ${
            blocks.length
              ? blocks.map((b, i) => renderVisualBlock(b, i, blocks.length)).join("")
              : `<div style="padding:80px 24px;text-align:center;color:var(--muted);">
                  <h3>На главной странице пока нет блоков</h3>
                  <p style="margin-top:8px;">Нажмите на любой блок во вкладке «Вставка» справа, чтобы добавить его.</p>
                </div>`
          }
        </div>
      `;
      return;
    }

    // 2. CUSTOM PAGE (`/page/:slug`) — Requirement #4: Editable & Deletable!
    if (state.currentPage.startsWith("page:")) {
      const slug = state.currentPage.slice(5);
      const customPages = state.siteData.customPages || [];
      const pageIdx = customPages.findIndex((p) => p.slug === slug);
      const page = customPages[pageIdx];
      if (!page) {
        state.currentPage = "main";
        return renderCanvas();
      }
      const blocks = page.blocks || [];
      paper.innerHTML = `
        <div style="padding:18px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#18181b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
            <div>
              <label style="font-size:0.7rem;color:#64748b;display:block;">Название страницы</label>
              <input type="text" class="adm-input" style="width:220px;" value="${escapeHtml(getLoc(page, "title"))}" data-custom-page-title="${pageIdx}" placeholder="Введите название...">
            </div>
            <div>
              <label style="font-size:0.7rem;color:#64748b;display:block;">Адрес URL (/page/...)</label>
              <input type="text" class="adm-input" style="width:170px;" value="${escapeHtml(page.slug)}" data-custom-page-slug="${pageIdx}">
            </div>
            <label style="font-size:0.8rem;display:inline-flex;align-items:center;gap:6px;margin-top:14px;cursor:pointer;">
              <input type="checkbox" data-custom-page-nav="${pageIdx}" ${page.showInNav !== false ? "checked" : ""}> Показывать в верхнем меню
            </label>
          </div>
          <button type="button" class="adm-btn adm-btn-danger" data-delete-custom-page="${pageIdx}">🗑 Удалить страницу</button>
        </div>

        <div class="seamless-blocks-flow">
          ${
            blocks.length
              ? blocks.map((b, i) => renderVisualBlock(b, i, blocks.length)).join("")
              : `<div style="padding:80px 24px;text-align:center;color:var(--muted);">
                  <h3>Здесь пока пусто</h3>
                  <p style="margin-top:8px;">Выберите любой блок в панели «Вставка» справа, чтобы собрать эту страницу.</p>
                </div>`
          }
        </div>
      `;
      return;
    }

    // 3. DEDICATED RELEASE PAGE (`/release/:slug`)
    if (state.currentPage.startsWith("release:")) {
      const slug = state.currentPage.slice(8);
      const releases = state.siteData.releases || [];
      const relIdx = releases.findIndex((r) => r.slug === slug);
      const rel = releases[relIdx];
      if (!rel) {
        state.currentPage = "main";
        return renderCanvas();
      }
      if (!Array.isArray(rel.extraBlocks)) rel.extraBlocks = [];
      const allSiteVideos = state.siteData.videos || [];
      if (!Array.isArray(rel.videoIds)) {
        rel.videoIds = allSiteVideos
          .filter((v) => v.releaseSlug === rel.slug && !!(v.videoUrl || v.youtubeId))
          .map((v) => v.id);
      }
      const attachedVideos = rel.videoIds
        .map((id) => allSiteVideos.find((v) => v.id === id))
        .filter(Boolean);

      const isFeaturedLatest = (getFeaturedRelease() && getFeaturedRelease().slug === rel.slug);

      paper.innerHTML = `
        ${renderSimulatedHeader()}
        <div style="padding:16px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#18181b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
              <strong>Редактирование страницы релиза:</strong> <span style="font-family:var(--font-mono);">/release/${escapeHtml(rel.slug)}</span>
            </div>
            ${
              isFeaturedLatest
                ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:0.74rem;font-weight:600;">★ Отображается на главном экране (Последний релиз)</span>`
                : `<button type="button" class="adm-btn adm-btn-sm" data-set-latest-release="${relIdx}">☆ Сделать главным релизом на главной странице</button>`
            }
          </div>
          <button type="button" class="adm-btn adm-btn-danger" data-delete-release="${relIdx}">🗑 Удалить страницу релиза</button>
        </div>

        <div class="container" style="padding-top:28px;padding-bottom:36px;">
          <div class="release-top-split">
            <div>
              ${
                rel.cover
                  ? `<div class="editable-image-box">
                      <div class="cover-3d-card shape-${escapeHtml(rel.coverShape || "sharp")}">
                        <img src="${escapeHtml(rel.cover)}" alt="">
                      </div>
                      <div class="editable-image-actions">
                        <button type="button" class="adm-btn adm-btn-sm" data-pick-rel-cover="${relIdx}">Сменить обложку</button>
                      </div>
                    </div>`
                  : `<div class="empty-image-slot" data-pick-rel-cover="${relIdx}">
                      <strong>Здесь пока пусто</strong>
                      <span>Нажмите, чтобы загрузить обложку релиза</span>
                    </div>`
              }
              <div class="adm-field" style="margin-top:12px;">
                <label>Форма обложки</label>
                <select class="adm-select" data-rel-field="coverShape" data-rel-idx="${relIdx}">
                  ${SHAPES.map((s) => `<option value="${s.id}" ${(rel.coverShape || "sharp") === s.id ? "selected" : ""}>${s.label}</option>`).join("")}
                </select>
              </div>
            </div>

            <div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div class="adm-field">
                  <label>Название релиза</label>
                  <input type="text" class="adm-input" value="${escapeHtml(rel.title)}" data-rel-field="title" data-rel-idx="${relIdx}">
                </div>
                <div class="adm-field">
                  <label>URL Slug (/release/...)</label>
                  <input type="text" class="adm-input" value="${escapeHtml(rel.slug)}" data-rel-field="slug" data-rel-idx="${relIdx}">
                </div>
                <div class="adm-field">
                  <label>Тип релиза</label>
                  <input type="text" class="adm-input" value="${escapeHtml(getLoc(rel, "type"))}" data-rel-loc="type" data-rel-idx="${relIdx}">
                </div>
                <div class="adm-field">
                  <label>Дата выхода</label>
                  <input type="text" class="adm-input" value="${escapeHtml(rel.releaseDate)}" data-rel-field="releaseDate" data-rel-idx="${relIdx}">
                </div>
              </div>

              <div class="adm-field">
                <label>Краткое описание для списка</label>
                <textarea class="adm-textarea" data-rel-loc="shortDesc" data-rel-idx="${relIdx}">${escapeHtml(getLoc(rel, "shortDesc"))}</textarea>
              </div>

              <div class="adm-field">
                <label>Полное описание на странице релиза</label>
                <textarea class="adm-textarea" data-rel-loc="fullDesc" data-rel-idx="${relIdx}">${escapeHtml(getLoc(rel, "fullDesc"))}</textarea>
              </div>

              <div class="adm-field">
                <label>Список треков (через запятую)</label>
                <input type="text" class="adm-input" value="${escapeHtml((rel.tracks || []).join(", "))}" data-rel-tracks="${relIdx}">
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px;">
                <label style="font-size:0.78rem;font-weight:700;">Ссылки на площадки прослушивания</label>
                <button type="button" class="adm-btn adm-btn-sm" data-add-platform="${relIdx}">+ Добавить площадку</button>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${(rel.platforms || [])
                  .map(
                    (p, pIdx) => `
                  <div style="display:grid;grid-template-columns:130px 110px 1fr auto;gap:6px;align-items:center;">
                    <input type="text" class="adm-input" value="${escapeHtml(p.name)}" placeholder="Название" data-plat-name="${relIdx}:${pIdx}">
                    <select class="adm-select" data-plat-icon="${relIdx}:${pIdx}">
                      ${["spotify", "apple", "youtube", "deezer", "tidal", "soundcloud", "link"]
                        .map((ic) => `<option value="${ic}" ${p.icon === ic ? "selected" : ""}>${ic}</option>`)
                        .join("")}
                    </select>
                    <input type="text" class="adm-input" value="${escapeHtml(p.url)}" placeholder="https://..." data-plat-url="${relIdx}:${pIdx}">
                    <button type="button" class="adm-btn adm-btn-sm adm-btn-danger" data-del-platform="${relIdx}:${pIdx}">✕</button>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          </div>

          <!-- Дополнительные блоки релиза -->
          <div style="padding:12px 0;margin-top:24px;border-top:1px dashed var(--line);font-size:0.78rem;color:var(--muted);text-align:center;">
            Дополнительные блоки страницы релиза (добавляются через вкладку «Вставка» справа):
          </div>
          <div class="seamless-blocks-flow">
            ${rel.extraBlocks.map((b, i) => renderVisualBlock(b, i, rel.extraBlocks.length)).join("")}
          </div>

          <!-- БЛОК ВИДЕО ЭТОГО РЕЛИЗА (Requirement #4: Отбор собственных видео для каждого релиза!) -->
          <div style="margin-top:44px;padding-top:28px;border-top:1px solid var(--line);">
            <div class="framed-heading-box" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
              <h2 class="split-heading" style="font-size:1.65rem;">Видео и Mood-ролики этого релиза (${attachedVideos.length})</h2>
              <button type="button" class="adm-btn adm-btn-primary" data-add-rel-video="${relIdx}">+ Загрузить / добавить новое видео к релизу</button>
            </div>

            <p style="font-size:0.84rem;color:var(--muted);margin-bottom:18px;">
              Отметьте ниже, какие видео из загруженных на сайт относятся к релизу <strong>${escapeHtml(rel.title)}</strong>. На странице этого релиза будут отображаться <strong>только выбранные здесь видео</strong> (а не все видео сайта):
            </p>

            <!-- Селектор видео из всех загруженных на сайт -->
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:12px;margin-bottom:28px;">
              ${
                allSiteVideos.length
                  ? allSiteVideos
                      .map((v) => {
                        const isChecked = rel.videoIds.includes(v.id);
                        const thumb = v.thumbnail || "/assets/undefined_album_cover.jpg";
                        const vTitle = getLoc(v, "title") || v.videoUrl || "Без названия";
                        return `
                          <div style="padding:10px;border:${isChecked ? "2px solid #2563eb" : "1px solid var(--line)"};background:${isChecked ? "rgba(37,99,235,0.06)" : "var(--post-bg)"};display:flex;flex-direction:column;gap:8px;">
                            <div style="aspect-ratio:16/9;background:#111;overflow:hidden;position:relative;">
                              <img src="${escapeHtml(thumb)}" alt="" style="width:100%;height:100%;object-fit:cover;">
                              ${
                                isChecked
                                  ? `<span style="position:absolute;top:6px;right:6px;background:#2563eb;color:#fff;font-size:0.68rem;font-weight:700;padding:2px 8px;">✓ В релизе</span>`
                                  : ""
                              }
                            </div>
                            <div style="font-size:0.84rem;font-weight:600;line-height:1.3;">${escapeHtml(vTitle)}</div>
                            <button type="button" class="adm-btn adm-btn-sm ${isChecked ? "adm-btn-primary" : ""}" data-toggle-rel-video="${relIdx}:${escapeHtml(v.id)}" style="width:100%;margin-top:auto;">
                              ${isChecked ? "✓ Отображается (Убрать из релиза)" : "+ Прикрепить к этому релизу"}
                            </button>
                          </div>
                        `;
                      })
                      .join("")
                  : `<div style="padding:18px;border:1px dashed var(--line);color:var(--muted);">На сайте пока нет загруженных видео. Нажмите «+ Загрузить / добавить новое видео к релизу».</div>`
              }
            </div>

            <!-- Живой предпросмотр того, как блок видео выглядит в конце страницы релиза -->
            ${
              attachedVideos.length
                ? `<div style="padding:18px;border:1px dashed var(--line);background:var(--post-bg);">
                    <div style="font-family:var(--font-mono);font-size:0.74rem;color:var(--muted);text-transform:uppercase;margin-bottom:14px;">
                      Предпросмотр блока видео на странице релиза (${attachedVideos.length} видео):
                    </div>
                    <div class="video-catalog-grid" style="margin-top:0;">
                      ${attachedVideos
                        .map((v) => {
                          const thumb = v.thumbnail || "/assets/undefined_album_cover.jpg";
                          return `
                            <div>
                              <div class="video-player-frame">
                                ${
                                  v.type === "file" && v.videoUrl
                                    ? `<video src="${escapeHtml(v.videoUrl)}" poster="${escapeHtml(thumb)}" controls playsinline preload="metadata"></video>`
                                    : `<img src="${escapeHtml(thumb)}" alt="" style="width:100%;height:100%;object-fit:cover;">`
                                }
                              </div>
                              <div style="margin-top:8px;font-family:var(--font-heading);font-weight:600;font-size:0.92rem;">
                                ${escapeHtml(getLoc(v, "title") || "Без названия")}
                              </div>
                            </div>
                          `;
                        })
                        .join("")}
                    </div>
                  </div>`
                : `<div style="padding:18px;border:1px dashed var(--line);text-align:center;color:var(--muted);font-size:0.84rem;">
                    К этому релизу не прикреплено ни одного видео — блок видео внизу страницы релиза будет скрыт.
                  </div>`
            }
          </div>
        </div>
      `;
      return;
    }

    // 4. VIDEOS PAGE (`/videos`)
    if (state.currentPage === "videos") {
      const videos = state.siteData.videos || [];
      paper.innerHTML = `
        <div class="container" style="padding:28px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 class="split-heading" style="font-size:1.8rem;">Видеоработы (/videos)</h2>
            <button type="button" class="adm-btn adm-btn-primary" id="canvas-add-video-btn">+ Добавить видео</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${
              videos.length
                ? videos
                    .map(
                      (v, vIdx) => `
                  <div style="padding:18px;border:1px solid var(--line);display:grid;grid-template-columns:220px 1fr;gap:18px;align-items:start;">
                    <div>
                      ${
                        v.thumbnail
                          ? `<img src="${escapeHtml(v.thumbnail)}" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;margin-bottom:8px;">`
                          : `<div class="empty-image-slot" style="min-height:120px;margin-bottom:8px;" data-pick-vid-thumb="${vIdx}"><strong>Здесь пока пусто</strong><span>Обложка видео</span></div>`
                      }
                      <button type="button" class="adm-btn adm-btn-sm" style="width:100%;" data-pick-vid-thumb="${vIdx}">Выбрать обложку</button>
                    </div>
                    <div>
                      <div style="display:grid;grid-template-columns:1fr 140px auto;gap:8px;margin-bottom:8px;">
                        <input type="text" class="adm-input" placeholder="Название видео" value="${escapeHtml(getLoc(v, "title"))}" data-vid-loc="title" data-vid-idx="${vIdx}">
                        <select class="adm-select" data-vid-field="type" data-vid-idx="${vIdx}">
                          <option value="youtube" ${v.type !== "file" ? "selected" : ""}>YouTube</option>
                          <option value="file" ${v.type === "file" ? "selected" : ""}>Видеофайл MP4</option>
                        </select>
                        <button type="button" class="adm-btn adm-btn-danger" data-del-video="${vIdx}">Удалить</button>
                      </div>
                      <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <input type="text" class="adm-input" placeholder="Ссылка на YouTube или ID видео / путь к MP4" value="${escapeHtml(v.videoUrl || v.youtubeId || "")}" data-vid-field="videoUrl" data-vid-idx="${vIdx}">
                        <button type="button" class="adm-btn adm-btn-sm" data-pick-vid-file="${vIdx}">Загрузить MP4</button>
                      </div>
                      <textarea class="adm-textarea" style="min-height:54px;" placeholder="Описание видео (необязательно)..." data-vid-loc="desc" data-vid-idx="${vIdx}">${escapeHtml(getLoc(v, "desc"))}</textarea>
                    </div>
                  </div>
                `
                    )
                    .join("")
                : `<p style="color:var(--muted);">Здесь пока пусто — нажмите «+ Добавить видео».</p>`
            }
          </div>
        </div>
      `;
      return;
    }

    // 5. THOUGHTS / CHANNEL PAGE (`/thoughts`) — Requirement #10: With Borders!
    if (state.currentPage === "thoughts") {
      const posts = state.siteData.posts || [];
      paper.innerHTML = `
        <div class="container" style="padding:28px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div>
              <h2 class="split-heading" style="font-size:1.8rem;">Канал / Мысли (/thoughts)</h2>
              <p style="font-size:0.8rem;color:var(--muted);">В постах сохранены четкие границы между карточками для удобства чтения</p>
            </div>
            <button type="button" class="adm-btn adm-btn-primary" id="canvas-add-post-btn">+ Новый пост</button>
          </div>
          <div class="posts-bordered-list">
            ${
              posts.length
                ? posts
                    .map(
                      (p, pIdx) => `
                  <article class="post-bordered-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
                      <label style="font-size:0.8rem;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                        <input type="checkbox" data-post-pin="${pIdx}" ${p.pinned ? "checked" : ""}> 📌 Закрепленный пост
                      </label>
                      <button type="button" class="adm-btn adm-btn-sm adm-btn-danger" data-del-post="${pIdx}">Удалить пост</button>
                    </div>
                    <div class="adm-field">
                      <label>Заголовок поста</label>
                      <input type="text" class="adm-input" placeholder="Здесь пока пусто — введите заголовок..." value="${escapeHtml(getLoc(p, "title"))}" data-post-loc="title" data-post-idx="${pIdx}">
                    </div>
                    <div class="adm-field">
                      <label>Текст поста</label>
                      <textarea class="adm-textarea" placeholder="Здесь пока пусто — поделитесь мыслями..." data-post-loc="text" data-post-idx="${pIdx}">${escapeHtml(getLoc(p, "text"))}</textarea>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                      <input type="text" class="adm-input" style="flex:1;" placeholder="Фото или видео к посту (здесь пока пусто)..." value="${escapeHtml(p.mediaUrl || "")}" data-post-media="${pIdx}">
                      <button type="button" class="adm-btn adm-btn-sm" data-pick-post-media="${pIdx}">Прикрепить фото/видео</button>
                      ${p.mediaUrl ? `<button type="button" class="adm-btn adm-btn-sm adm-btn-danger" data-clear-post-media="${pIdx}">Убрать медиа</button>` : ""}
                    </div>
                  </article>
                `
                    )
                    .join("")
                : `<div class="post-bordered-card">Здесь пока пусто — нажмите «+ Новый пост».</div>`
            }
          </div>
        </div>
      `;
    }
    fixSubpathAssets(paper);
  }

  /* ==========================================================================
     RENDER INSERT PALETTE & THEME COLOR CUSTOMIZER (Requirement #2 & #6)
     ========================================================================== */
  function renderInsertPalette() {
    const grid = document.getElementById("insert-blocks-grid");
    if (!grid) return;
    grid.className = "insert-categories-wrap";
    grid.innerHTML = BLOCK_CATEGORIES.map((cat) => {
      const catBlocks = STANDARD_BLOCKS.filter((b) => b.category === cat.id);
      if (!catBlocks.length) return "";
      return `
        <div class="insert-cat-section">
          <div class="insert-cat-header">
            <span class="insert-cat-title">${escapeHtml(cat.label || cat.title || "")}</span>
            <span class="insert-cat-count">${catBlocks.length}</span>
          </div>
          <div class="insert-blocks-grid">
            ${catBlocks
              .map(
                (b) => `
              <button type="button" class="insert-block-card" data-insert-block="${b.type}">
                <div class="insert-card-top">
                  <span class="insert-card-icon">${escapeHtml(b.icon || "+")}</span>
                  <strong>+ ${escapeHtml(b.title)}</strong>
                </div>
                <span>${escapeHtml(b.desc)}</span>
              </button>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }).join("");
  }

  function renderThemesDrawer() {
    const settings = state.siteData.settings || (state.siteData.settings = {});
    if (!settings.lightColors) {
      settings.lightColors = { bg: "#ffffff", text: "#212121", muted: "#5f5f5f", accent: "#212121", btnBg: "#212121", btnText: "#ffffff", line: "#dcdcdc" };
    }
    if (!settings.darkColors) {
      settings.darkColors = { bg: "#191919", text: "#f0f0f0", muted: "#a8a8a8", accent: "#f0f0f0", btnBg: "#f0f0f0", btnText: "#191919", line: "#363636" };
    }
    if (!settings.fonts) {
      settings.fonts = { banner: "'Bitter', Georgia, serif", heading: "'Montserrat', sans-serif", body: "'Bitter', Georgia, serif" };
    }

    const presetsGrid = document.getElementById("color-presets-grid");
    if (presetsGrid) {
      presetsGrid.innerHTML = COLOR_PRESETS.map(
        (pr, idx) => `
        <button type="button" class="adm-btn adm-btn-sm" style="justify-content:flex-start;text-align:left;" data-apply-preset="${idx}">
          <span style="width:12px;height:12px;background:${pr.light.bg};border:1px solid ${pr.light.text};display:inline-block;"></span>
          <span style="width:12px;height:12px;background:${pr.light.btnBg};display:inline-block;"></span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(pr.name)}</span>
        </button>
      `
      ).join("");
    }

    const colorLabels = [
      { key: "bg", label: "Фон страницы" },
      { key: "text", label: "Основной текст" },
      { key: "muted", label: "Приглушенный текст" },
      { key: "accent", label: "Акцентный цвет" },
      { key: "btnBg", label: "Фон плоских кнопок" },
      { key: "btnText", label: "Текст кнопок" },
      { key: "line", label: "Линии и рамки" }
    ];

    const renderColorGroup = (containerId, modeKey, obj) => {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = colorLabels
        .map(
          (c) => `
        <div class="color-picker-row">
          <span>${c.label}</span>
          <div class="color-picker-controls">
            <input type="color" value="${escapeHtml(obj[c.key] || "#000000")}" data-theme-color="${modeKey}:${c.key}">
            <input type="text" value="${escapeHtml(obj[c.key] || "#000000")}" data-theme-hex="${modeKey}:${c.key}">
          </div>
        </div>
      `
        )
        .join("");
    };

    renderColorGroup("light-colors-editor", "lightColors", settings.lightColors);
    renderColorGroup("dark-colors-editor", "darkColors", settings.darkColors);

    const fb = document.getElementById("font-banner-select");
    const fh = document.getElementById("font-heading-select");
    const fbody = document.getElementById("font-body-select");
    if (fb) fb.value = settings.fonts.banner || "'Bitter', Georgia, serif";
    if (fh) fh.value = settings.fonts.heading || "'Montserrat', sans-serif";
    if (fbody) fbody.value = settings.fonts.body || "'Bitter', Georgia, serif";

    const profile = state.siteData.profile || {};
    const socials = profile.socials || {};
    const nameIn = document.getElementById("prof-artist-name");
    const avIn = document.getElementById("prof-avatar");
    const igIn = document.getElementById("prof-ig-url");
    const tgIn = document.getElementById("prof-tg-url");
    if (nameIn) nameIn.value = profile.artistName || "1arutyun";
    if (avIn) avIn.value = profile.avatar || "";
    if (igIn) igIn.value = socials.instagram || "";
    if (tgIn) tgIn.value = socials.telegram || "";
  }

  /* ==========================================================================
     MEDIA LIBRARY & UPLOADER
     ========================================================================== */
  const BUILTIN_ASSETS = [
    { name: "header_banner.jpg", url: "/assets/header_banner.jpg", type: "image", deletable: false },
    { name: "undefined_album_cover.jpg", url: "/assets/undefined_album_cover.jpg", type: "image", deletable: false },
    { name: "art_photo.jpg", url: "/assets/art_photo.jpg", type: "image", deletable: false },
    { name: "logo_or_avatar.jpg", url: "/assets/logo_or_avatar.jpg", type: "image", deletable: false },
    { name: "main_art1.jpg", url: "/assets/main_art1.jpg", type: "image", deletable: false },
    { name: "music_art.jpg", url: "/assets/music_art.jpg", type: "image", deletable: false },
    { name: "release_img1.jpg", url: "/assets/release_img1.jpg", type: "image", deletable: false },
    { name: "spotify_cover.jpg", url: "/assets/spotify_cover.jpg", type: "image", deletable: false },
    { name: "yt_oh_no.jpg", url: "/assets/yt_oh_no.jpg", type: "image", deletable: false },
    { name: "yt_amena.jpg", url: "/assets/yt_amena.jpg", type: "image", deletable: false },
    { name: "yt_fear_the_dark.jpg", url: "/assets/yt_fear_the_dark.jpg", type: "image", deletable: false }
  ];

  async function loadMediaLibrary() {
    let loaded = false;
    if (!state.isStaticHost) {
      try {
        const res = await fetch(resolveUrl("/api/media"));
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (res.ok && ct.includes("application/json")) {
          const data = await res.json();
          state.mediaFiles = data.files || [];
          loaded = true;
        }
      } catch (e) {}
    }
    if (!loaded) {
      const extraMedia = JSON.parse(localStorage.getItem("1arutyun_gh_uploaded_media") || "[]");
      state.mediaFiles = [...extraMedia, ...BUILTIN_ASSETS];
    }
    renderMediaGrids();
  }

  function renderMediaGrids() {
    const renderItems = (isModal) =>
      state.mediaFiles
        .map(
          (f) => `
        <div class="media-item">
          ${
            f.type === "video"
              ? `<video src="${escapeHtml(resolveUrl(f.url))}" class="media-thumb" muted preload="metadata"></video>`
              : `<img src="${escapeHtml(resolveUrl(f.url))}" class="media-thumb" alt="">`
          }
          <div class="media-meta">
            <button type="button" class="adm-btn adm-btn-sm" style="flex:1;" data-select-media="${escapeHtml(f.url)}">
              ${isModal ? "Выбрать" : "Копировать URL"}
            </button>
            ${
              f.deletable
                ? `<button type="button" class="adm-btn adm-btn-sm adm-btn-danger" data-delete-media="${escapeHtml(f.url)}">🗑</button>`
                : ""
            }
          </div>
        </div>
      `
        )
        .join("");

    const drawerGrid = document.getElementById("drawer-media-grid");
    const modalGrid = document.getElementById("modal-media-grid");
    if (drawerGrid) drawerGrid.innerHTML = renderItems(false);
    if (modalGrid) modalGrid.innerHTML = renderItems(true);
  }

  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function utf8ToBase64(str) {
    return arrayBufferToBase64(new TextEncoder().encode(str));
  }

  async function pushFileToGithub(repoPath, base64Content, commitMsg) {
    const token = (localStorage.getItem("1arutyun_gh_token") || "").trim();
    const repo = (localStorage.getItem("1arutyun_gh_repo") || detectDefaultGithubRepo()).trim();
    const branch = (localStorage.getItem("1arutyun_gh_branch") || "main").trim();
    if (!token || !repo) {
      throw new Error("NO_GH_TOKEN");
    }
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${repoPath}`;
    let sha = null;
    try {
      const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      });
      if (getRes.ok) {
        const existing = await getRes.json();
        sha = existing.sha || null;
      }
    } catch (e) {}

    const body = {
      message: commitMsg || `Update ${repoPath} via 1arutyun Studio`,
      content: base64Content,
      branch
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(errData.message || `GitHub API Error ${putRes.status}`);
    }
    return putRes.json();
  }

  function downloadSiteJson() {
    const jsonStr = JSON.stringify(state.siteData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "site.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("⬇ Файл site.json скачан (замените data/site.json в репозитории)");
  }

  async function uploadFiles(fileList) {
    if (!fileList || !fileList.length) return null;
    let lastUploadedUrl = null;
    for (const file of fileList) {
      showToast(`Загрузка ${file.name}...`);
      if (!state.isStaticHost) {
        try {
          const res = await fetch(resolveUrl("/api/upload"), {
            method: "POST",
            headers: {
              Authorization: `Bearer ${state.token}`,
              "X-File-Name": encodeURIComponent(file.name)
            },
            body: file
          });
          const ct = (res.headers.get("content-type") || "").toLowerCase();
          if (res.ok && ct.includes("application/json")) {
            const data = await res.json();
            lastUploadedUrl = data.url;
            continue;
          }
          state.isStaticHost = true;
        } catch (e) {
          state.isStaticHost = true;
        }
      }

      // Static / GitHub Pages upload fallback
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const repoPath = `assets/uploads/${safeName}`;
      const publicUrl = `/${repoPath}`;
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const ghToken = (localStorage.getItem("1arutyun_gh_token") || "").trim();

      if (ghToken) {
        try {
          await pushFileToGithub(repoPath, b64, `Upload ${safeName}`);
          const extraMedia = JSON.parse(localStorage.getItem("1arutyun_gh_uploaded_media") || "[]");
          extraMedia.unshift({
            name: safeName,
            url: publicUrl,
            type: file.type.startsWith("video/") ? "video" : "image",
            deletable: false
          });
          localStorage.setItem("1arutyun_gh_uploaded_media", JSON.stringify(extraMedia));
          lastUploadedUrl = publicUrl;
        } catch (err) {
          showToast(`Ошибка загрузки в GitHub: ${err.message}`);
        }
      } else if (file.type.startsWith("image/") && file.size <= 1500000) {
        const dataUrl = `data:${file.type};base64,${b64}`;
        lastUploadedUrl = dataUrl;
      } else {
        showToast("Для загрузки файлов на GitHub Pages укажите GitHub Token во вкладке «Темы»");
      }
    }
    await loadMediaLibrary();
    if (lastUploadedUrl) showToast("Файл успешно загружен");
    return lastUploadedUrl;
  }

  function openMediaPicker(callback) {
    state.mediaPickerCallback = callback;
    const modal = document.getElementById("media-modal");
    if (modal) modal.classList.remove("hidden");
    loadMediaLibrary();
  }

  function closeMediaPicker() {
    state.mediaPickerCallback = null;
    const modal = document.getElementById("media-modal");
    if (modal) modal.classList.add("hidden");
  }

  /* ==========================================================================
     DIRECT MOUSE RESIZING HANDLES ON BLOCKS (Requirement #5)
     ========================================================================== */
  function initDirectMouseResizing() {
    let activeResize = null;

    document.addEventListener("mousedown", (e) => {
      const widthHandle = e.target.closest("[data-resize-width]");
      if (widthHandle) {
        e.preventDefault();
        const idx = Number(widthHandle.getAttribute("data-resize-width"));
        const side = widthHandle.getAttribute("data-resize-side") || "right";
        const blocks = getActiveBlocksArray();
        if (!blocks || !blocks[idx]) return;
        const wrapper = widthHandle.closest(".vblock-wrapper");
        const paper = document.getElementById("canvas-paper");
        activeResize = {
          mode: "width",
          side,
          idx,
          block: blocks[idx],
          wrapper,
          paperWidth: paper ? paper.clientWidth : 1180,
          startX: e.clientX,
          startWidthPct: Number(blocks[idx].widthPct) || 84
        };
        return;
      }

      const heightHandle = e.target.closest("[data-resize-height]");
      if (heightHandle) {
        e.preventDefault();
        const idx = Number(heightHandle.getAttribute("data-resize-height"));
        const blocks = getActiveBlocksArray();
        if (!blocks || !blocks[idx]) return;
        const wrapper = heightHandle.closest(".vblock-wrapper");
        activeResize = {
          mode: "height",
          idx,
          block: blocks[idx],
          wrapper,
          startY: e.clientY,
          startVal:
            blocks[idx].type === "hero-banner"
              ? Number(blocks[idx].height) || 230
              : blocks[idx].padY !== undefined
              ? Number(blocks[idx].padY)
              : 28
        };
        return;
      }

      const splitHandle = e.target.closest("[data-resize-split]");
      if (splitHandle) {
        e.preventDefault();
        const idx = Number(splitHandle.getAttribute("data-resize-split"));
        const blocks = getActiveBlocksArray();
        if (!blocks || !blocks[idx]) return;
        const inner = splitHandle.closest(".split-content-inner");
        activeResize = {
          mode: "split",
          idx,
          block: blocks[idx],
          inner,
          handle: splitHandle,
          rect: inner.getBoundingClientRect()
        };
        return;
      }

      const imgSizeHandle = e.target.closest("[data-resize-img-size]");
      if (imgSizeHandle) {
        e.preventDefault();
        const idx = Number(imgSizeHandle.getAttribute("data-resize-img-size"));
        const blocks = getActiveBlocksArray();
        if (!blocks || !blocks[idx]) return;
        const colEl = imgSizeHandle.closest("[data-split-img-col]");
        const wrapper = imgSizeHandle.closest(".vblock-wrapper");
        activeResize = {
          mode: "imgSize",
          idx,
          block: blocks[idx],
          colEl,
          wrapper,
          handle: imgSizeHandle,
          startX: e.clientX,
          startSize: Number(blocks[idx].imageSize) || (colEl ? colEl.offsetWidth : 400)
        };
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!activeResize) return;

      if (activeResize.mode === "width") {
        const dir = activeResize.side === "left" ? -1 : 1;
        const deltaX = (e.clientX - activeResize.startX) * 2 * dir;
        const deltaPct = (deltaX / activeResize.paperWidth) * 100;
        const newPct = Math.round(Math.max(45, Math.min(100, activeResize.startWidthPct + deltaPct)));
        const maxPx = Math.round((1180 * newPct) / 100);
        activeResize.block.widthPct = newPct;
        activeResize.block.fullBleed = newPct === 100 && activeResize.block.type === "hero-banner";
        if (activeResize.wrapper) {
          activeResize.wrapper.style.maxWidth = activeResize.block.fullBleed ? "100%" : `${maxPx}px`;
          activeResize.wrapper.style.width = activeResize.block.fullBleed ? "100%" : `${newPct}%`;
          const readout = activeResize.wrapper.querySelector(`[data-size-readout="${activeResize.idx}"]`);
          if (readout) {
            const v = activeResize.block.type === "hero-banner" ? (activeResize.block.height || 230) : (activeResize.block.padY || 0);
            readout.textContent = `Ш:${newPct}% · В:${v}px`;
          }
        }
      } else if (activeResize.mode === "height") {
        const deltaY = e.clientY - activeResize.startY;
        if (activeResize.block.type === "hero-banner") {
          const newH = Math.round(Math.max(120, Math.min(680, activeResize.startVal + deltaY)));
          activeResize.block.height = newH;
          const bannerEl = activeResize.wrapper.querySelector(".hero-banner-block");
          if (bannerEl) bannerEl.style.minHeight = `${newH}px`;
          const readout = activeResize.wrapper.querySelector(`[data-size-readout="${activeResize.idx}"]`);
          if (readout) readout.textContent = `Ш:${activeResize.block.widthPct || 100}% · В:${newH}px`;
        } else {
          const newPad = Math.round(Math.max(0, Math.min(140, activeResize.startVal + deltaY / 2)));
          activeResize.block.padY = newPad;
          if (activeResize.wrapper) {
            activeResize.wrapper.style.paddingTop = `${newPad}px`;
            activeResize.wrapper.style.paddingBottom = `${newPad}px`;
            const readout = activeResize.wrapper.querySelector(`[data-size-readout="${activeResize.idx}"]`);
            if (readout) readout.textContent = `Ш:${activeResize.block.widthPct || 84}% · В:${newPad}px`;
          }
        }
      } else if (activeResize.mode === "split") {
        const relX = e.clientX - activeResize.rect.left;
        let pct = Math.round((relX / activeResize.rect.width) * 100);
        pct = Math.max(25, Math.min(75, pct));
        const isRight = activeResize.block.layout === "image-right";
        activeResize.block.splitRatio = isRight ? 100 - pct : pct;
        if (activeResize.inner) {
          activeResize.inner.style.gridTemplateColumns = `minmax(0, ${pct}fr) minmax(0, ${100 - pct}fr)`;
        }
        if (activeResize.handle) {
          activeResize.handle.style.left = `${pct}%`;
        }
      } else if (activeResize.mode === "imgSize") {
        const deltaX = e.clientX - activeResize.startX;
        const newSize = Math.round(Math.max(180, Math.min(620, activeResize.startSize + deltaX)));
        activeResize.block.imageSize = newSize;
        if (activeResize.colEl) {
          activeResize.colEl.style.maxWidth = `${newSize}px`;
        }
        if (activeResize.wrapper) {
          const numInput = activeResize.wrapper.querySelector(`[data-block-input="imageSize"]`);
          if (numInput) numInput.value = newSize;
        }
      }
    });

    window.addEventListener("mouseup", () => {
      if (activeResize) {
        activeResize = null;
        scheduleAutoSave();
      }
    });
  }

  /* ==========================================================================
     DRAG & DROP REORDERING OF BLOCKS ON CANVAS
     ========================================================================== */
  function initBlockDragAndDrop() {
    document.addEventListener("dragstart", (e) => {
      const handle = e.target.closest("[data-drag-idx]");
      if (!handle) return;
      state.draggedBlockIndex = Number(handle.getAttribute("data-drag-idx"));
      e.dataTransfer.effectAllowed = "move";
    });

    document.addEventListener("dragover", (e) => {
      if (state.draggedBlockIndex === null) return;
      const wrapper = e.target.closest("[data-block-wrapper]");
      if (!wrapper) return;
      e.preventDefault();
      document.querySelectorAll(".vblock-wrapper.drag-over").forEach((el) => el.classList.remove("drag-over"));
      wrapper.classList.add("drag-over");
    });

    document.addEventListener("drop", (e) => {
      if (state.draggedBlockIndex === null) return;
      const wrapper = e.target.closest("[data-block-wrapper]");
      document.querySelectorAll(".vblock-wrapper.drag-over").forEach((el) => el.classList.remove("drag-over"));
      if (!wrapper) {
        state.draggedBlockIndex = null;
        return;
      }
      e.preventDefault();
      const targetIdx = Number(wrapper.getAttribute("data-block-wrapper"));
      const blocks = getActiveBlocksArray();
      if (blocks && state.draggedBlockIndex !== targetIdx) {
        const [moved] = blocks.splice(state.draggedBlockIndex, 1);
        blocks.splice(targetIdx, 0, moved);
        renderCanvas();
        scheduleAutoSave();
        showToast("Порядок блоков обновлен");
      }
      state.draggedBlockIndex = null;
    });

    document.addEventListener("dragend", () => {
      state.draggedBlockIndex = null;
      document.querySelectorAll(".vblock-wrapper.drag-over").forEach((el) => el.classList.remove("drag-over"));
    });
  }

  /* ==========================================================================
     UNDO / REDO HISTORY STACK + SAVE SITE DATA TO SERVER
     ========================================================================== */
  const history = {
    undoStack: [],
    redoStack: [],
    maxSize: 50,
    lastCommittedJson: "",
    isRestoring: false
  };

  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById("undo-btn");
    const redoBtn = document.getElementById("redo-btn");
    if (undoBtn) {
      undoBtn.disabled = history.undoStack.length === 0;
      undoBtn.title =
        history.undoStack.length > 0
          ? `Отменить последнее действие (Ctrl+Z) — шагов назад: ${history.undoStack.length}`
          : "Отменить последнее действие (Ctrl+Z)";
    }
    if (redoBtn) {
      redoBtn.disabled = history.redoStack.length === 0;
    }
  }

  function commitHistorySnapshot(triggerSave = false) {
    if (!state.initialized || history.isRestoring) return;
    const currentJson = JSON.stringify(state.siteData);
    if (!history.lastCommittedJson) {
      history.lastCommittedJson = currentJson;
      return;
    }
    if (currentJson !== history.lastCommittedJson) {
      history.undoStack.push(history.lastCommittedJson);
      if (history.undoStack.length > history.maxSize) {
        history.undoStack.shift();
      }
      history.redoStack = [];
      history.lastCommittedJson = currentJson;
      updateUndoRedoButtons();
      if (triggerSave) {
        scheduleAutoSave();
      }
    }
  }

  function performUndo() {
    const currentJson = JSON.stringify(state.siteData);
    let targetJson = null;

    if (history.lastCommittedJson && currentJson !== history.lastCommittedJson) {
      history.redoStack.push(currentJson);
      targetJson = history.lastCommittedJson;
    } else if (history.undoStack.length > 0) {
      history.redoStack.push(currentJson);
      targetJson = history.undoStack.pop();
      history.lastCommittedJson = targetJson;
    }

    if (!targetJson) return;

    history.isRestoring = true;
    try {
      state.siteData = JSON.parse(targetJson);
      renderPagesNavigation();
      renderThemesDrawer();
      renderCanvas();
    } finally {
      history.isRestoring = false;
    }
    updateUndoRedoButtons();
    saveSiteData(true);
    showToast("↶ Последнее действие отменено");
  }

  function performRedo() {
    if (history.redoStack.length === 0) return;
    const currentJson = JSON.stringify(state.siteData);
    const nextJson = history.redoStack.pop();
    history.undoStack.push(currentJson);
    history.lastCommittedJson = nextJson;

    history.isRestoring = true;
    try {
      state.siteData = JSON.parse(nextJson);
      renderPagesNavigation();
      renderThemesDrawer();
      renderCanvas();
    } finally {
      history.isRestoring = false;
    }
    updateUndoRedoButtons();
    saveSiteData(true);
    showToast("↷ Действие возвращено");
  }

  let autoSaveTimer = null;
  let saveBtnResetTimer = null;

  function scheduleAutoSave() {
    if (!state.token) return;
    const dot = document.getElementById("save-status-dot");
    if (dot) {
      dot.textContent = "Сохранение...";
      dot.classList.add("is-saving");
    }
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveSiteData(true);
    }, 350);
  }

  async function saveSiteData(silent = false) {
    commitHistorySnapshot(false);
    const isSilent = silent === true;
    const dot = document.getElementById("save-status-dot");
    if (dot) {
      dot.textContent = "Сохранение...";
      dot.classList.add("is-saving");
    }

    // Always persist draft in localStorage
    try {
      localStorage.setItem("1arutyun_local_site_draft", JSON.stringify(state.siteData));
    } catch (e) {}

    const markSavedUi = (statusText = "Синхронизировано") => {
      if (dot) {
        dot.textContent = statusText;
        dot.classList.remove("is-saving");
      }
      const btn = document.getElementById("save-site-btn");
      if (btn) {
        btn.textContent = "✓ Сохранено";
        btn.classList.add("is-saved");
        clearTimeout(saveBtnResetTimer);
        saveBtnResetTimer = setTimeout(() => {
          btn.textContent = "Сохранить изменения";
          btn.classList.remove("is-saved");
        }, 1600);
      }
    };

    if (!state.isStaticHost) {
      try {
        const res = await fetch(resolveUrl("/api/site"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${state.token}`
          },
          body: JSON.stringify(state.siteData)
        });
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (res.ok && ct.includes("application/json")) {
          markSavedUi("Синхронизировано");
          if (!isSilent) {
            showToast("✓ Все изменения сохранены на сайте!");
          }
          return;
        }
        if (res.status === 404 || res.status === 405 || !ct.includes("application/json")) {
          state.isStaticHost = true;
        } else if (!isSilent) {
          showToast("Ошибка сохранения: проверьте авторизацию");
          return;
        }
      } catch (e) {
        state.isStaticHost = true;
      }
    }

    // Static / GitHub Pages mode
    const ghToken = (localStorage.getItem("1arutyun_gh_token") || "").trim();
    if (ghToken && !isSilent) {
      try {
        showToast("☁ Отправка изменений в GitHub Pages...");
        const jsonStr = JSON.stringify(state.siteData, null, 2);
        const defaultJsStr = `// Auto-generated fallback data synced with data/site.json\nwindow.DEFAULT_SITE_DATA = ${jsonStr};\n`;
        await pushFileToGithub("data/site.json", utf8ToBase64(jsonStr), "Update data/site.json via 1arutyun Studio");
        await pushFileToGithub("js/default-data.js", utf8ToBase64(defaultJsStr), "Sync js/default-data.js via 1arutyun Studio");
        markSavedUi("Опубликовано в GitHub");
        showToast("✓ Опубликовано в ваш репозиторий GitHub Pages!");
      } catch (err) {
        markSavedUi("Сохранено локально");
        showToast(`Ошибка GitHub API: ${err.message}`);
      }
    } else {
      markSavedUi(ghToken ? "Готово к публикации" : "Сохранено в браузере");
      if (!isSilent) {
        // Open Themes tab & focus GitHub Token setup so user knows how to publish to GitHub Pages
        const themesTab = document.querySelector(".drawer-tab[data-tab='themes']");
        if (themesTab) themesTab.click();
        const ghTokenInput = document.getElementById("gh-token-input");
        if (ghTokenInput) {
          ghTokenInput.scrollIntoView({ behavior: "smooth", block: "center" });
          ghTokenInput.focus();
        }
        showToast("Сохранено в браузере! Для записи в GitHub Pages укажите GitHub Token справа или скачайте site.json.");
      }
    }
  }

  /* ==========================================================================
     PAGE CREATION & DELETION HELPERS (Requirement #4)
     ========================================================================== */
  function createNewCustomPage() {
    if (!Array.isArray(state.siteData.customPages)) state.siteData.customPages = [];
    const num = state.siteData.customPages.length + 1;
    const slug = `page-${num}-${Date.now().toString(36).slice(-3)}`;
    const newPage = {
      id: `pg-${Date.now()}`,
      slug,
      title: { en: "", ru: "" },
      showInNav: true,
      blocks: []
    };
    state.siteData.customPages.push(newPage);
    state.currentPage = `page:${slug}`;
    renderPagesNavigation();
    renderCanvas();
    showToast("Создана новая пустая страница");
  }

  function getFeaturedRelease() {
    const releases = state.siteData.releases || [];
    if (!releases.length) return null;
    const explicit = releases.find((r) => r.isLatest);
    if (explicit) return explicit;
    if (releases.length > 1 && releases[0].slug === "undefined") {
      return releases[releases.length - 1];
    }
    return releases[0];
  }

  function syncFeaturedReleaseToMainBlock(rel) {
    if (!rel) return;
    const blocks = state.siteData.blocks || [];
    const mainSplit = blocks.find(
      (b) => b.type === "split-content" && (b.id === "block-undefined-split" || b.isLatestReleaseBlock)
    );
    if (!mainSplit) return;

    // Preserve original Undefined manifesto text on the Undefined release object
    const undefRel = (state.siteData.releases || []).find((r) => r.slug === "undefined");
    if (undefRel && !undefRel.featuredText && mainSplit.linkUrl === "/release/undefined") {
      undefRel.featuredText = JSON.parse(JSON.stringify(mainSplit.text || { en: "", ru: "" }));
    }

    mainSplit.title = { en: rel.title || "", ru: rel.title || "" };
    mainSplit.subtitle = {
      en: `Latest Release${rel.releaseDate ? " - " + rel.releaseDate : ""}`,
      ru: `Последний релиз${rel.releaseDate ? " - " + rel.releaseDate : ""}`
    };
    mainSplit.linkUrl = `/release/${rel.slug}`;
    if (rel.cover) {
      mainSplit.images = [rel.cover];
    } else if (rel.slug !== "undefined") {
      mainSplit.images = [""];
    }
    if (rel.coverShape) {
      mainSplit.shape = rel.coverShape;
    }
    if (rel.slug === "undefined" && undefRel && undefRel.featuredText) {
      mainSplit.text = JSON.parse(JSON.stringify(undefRel.featuredText));
    } else {
      const enDesc = (rel.fullDesc && rel.fullDesc.en) || (rel.shortDesc && rel.shortDesc.en) || "";
      const ruDesc = (rel.fullDesc && rel.fullDesc.ru) || (rel.shortDesc && rel.shortDesc.ru) || "";
      if (enDesc || ruDesc) {
        mainSplit.text = { en: enDesc || ruDesc, ru: ruDesc || enDesc };
      }
    }
  }

  function createNewReleasePage() {
    if (!Array.isArray(state.siteData.releases)) state.siteData.releases = [];
    // Save current undefined manifesto text before switching
    const undefRel = state.siteData.releases.find((r) => r.slug === "undefined");
    const mainSplit = (state.siteData.blocks || []).find(
      (b) => b.type === "split-content" && (b.id === "block-undefined-split" || b.isLatestReleaseBlock)
    );
    if (undefRel && mainSplit && !undefRel.featuredText && mainSplit.linkUrl === "/release/undefined") {
      undefRel.featuredText = JSON.parse(JSON.stringify(mainSplit.text || { en: "", ru: "" }));
    }

    state.siteData.releases.forEach((r) => {
      r.isLatest = false;
    });
    const num = state.siteData.releases.length + 1;
    const slug = `release-${num}`;
    const newRel = {
      id: `rel-${Date.now()}`,
      slug,
      isLatest: true,
      title: `New Release ${num}`,
      type: { en: "Single", ru: "Сингл" },
      releaseDate: "2026",
      recordedInfo: { en: "", ru: "" },
      cover: "",
      coverShape: "sharp",
      shortDesc: { en: "", ru: "" },
      fullDesc: { en: "", ru: "" },
      tracks: [],
      platforms: [
        { name: "Spotify", url: "", icon: "spotify" },
        { name: "Apple Music", url: "", icon: "apple" }
      ],
      thanksMessage: { en: "", ru: "" },
      videoIds: [],
      extraBlocks: []
    };
    state.siteData.releases.unshift(newRel);
    syncFeaturedReleaseToMainBlock(newRel);
    state.currentPage = `release:${slug}`;
    renderPagesNavigation();
    renderCanvas();
    scheduleAutoSave();
    showToast("Создана страница нового релиза — он автоматически установлен как последний релиз на главной");
  }

  /* ==========================================================================
     SIDEBAR DRAWER RESIZING & RICH TEXT FLOATING TOOLBAR
     ========================================================================== */
  function initDrawerResizing() {
    const handle = document.getElementById("drawer-resize-handle");
    const workspace = document.getElementById("studio-workspace");
    if (!handle || !workspace) return;

    const savedWidth = localStorage.getItem("1arutyun_drawer_width");
    if (savedWidth) {
      const w = Number(savedWidth);
      if (w >= 310 && w <= 640) {
        workspace.style.setProperty("--drawer-width", `${w}px`);
      }
    }

    let isResizing = false;
    handle.addEventListener("mousedown", (e) => {
      isResizing = true;
      handle.classList.add("resizing");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!isResizing) return;
      const newWidth = Math.round(Math.max(310, Math.min(640, window.innerWidth - e.clientX)));
      workspace.style.setProperty("--drawer-width", `${newWidth}px`);
      localStorage.setItem("1arutyun_drawer_width", String(newWidth));
    });

    window.addEventListener("mouseup", () => {
      if (!isResizing) return;
      isResizing = false;
      handle.classList.remove("resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  }

  function initRichTextToolbar() {
    const bar = document.getElementById("rte-floating-bar");
    if (!bar) return;
    let activeEditable = null;

    function updatePosition() {
      if (!activeEditable || !document.body.contains(activeEditable)) {
        bar.classList.remove("visible");
        return;
      }
      const rect = activeEditable.getBoundingClientRect();
      const barWidth = bar.offsetWidth || 420;
      let top = rect.top - 50;
      if (top < 64) {
        top = rect.bottom + 10;
      }
      let left = rect.left + (rect.width - barWidth) / 2;
      left = Math.max(16, Math.min(window.innerWidth - barWidth - 16, left));
      bar.style.top = `${Math.round(top)}px`;
      bar.style.left = `${Math.round(left)}px`;
      bar.classList.add("visible");
    }

    document.addEventListener("focusin", (e) => {
      const editable = e.target.closest("[contenteditable='true'][data-edit-field]");
      if (editable) {
        activeEditable = editable;
        updatePosition();
      }
    });

    document.addEventListener("focusout", (e) => {
      setTimeout(() => {
        const focused = document.activeElement;
        if (focused && (focused.closest("#rte-floating-bar") || focused.closest("[contenteditable='true'][data-edit-field]"))) {
          return;
        }
        activeEditable = null;
        bar.classList.remove("visible");
      }, 150);
    });

    document.querySelector(".canvas-viewport")?.addEventListener("scroll", () => {
      if (activeEditable && bar.classList.contains("visible")) {
        updatePosition();
      }
    });

    bar.addEventListener("mousedown", (e) => {
      // Prevent losing selection inside contenteditable when clicking toolbar buttons
      e.preventDefault();
    });

    function ensureSelectionInEditable(el) {
      const sel = window.getSelection();
      if (!sel) return;
      if (sel.rangeCount === 0 || sel.isCollapsed || !el.contains(sel.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    bar.addEventListener("click", (e) => {
      if (!activeEditable) return;
      const field = activeEditable.getAttribute("data-edit-field");
      const idx = Number(activeEditable.getAttribute("data-block-idx"));
      const blocks = getActiveBlocksArray();
      const block = blocks && blocks[idx] ? blocks[idx] : null;

      const cmdBtn = e.target.closest("[data-rte-cmd]");
      if (cmdBtn) {
        const cmd = cmdBtn.getAttribute("data-rte-cmd");
        const val = cmdBtn.getAttribute("data-rte-val") || null;
        activeEditable.focus();

        if (cmd === "justifyLeft" || cmd === "justifyCenter" || cmd === "justifyRight") {
          const alignVal = cmd === "justifyCenter" ? "center" : cmd === "justifyRight" ? "right" : "left";
          if (block && field) {
            if (!block.fieldAlign) block.fieldAlign = {};
            block.fieldAlign[field] = alignVal;
            if ((block.type === "text-block" && field === "text") || (block.type === "action-button" && field === "buttonText")) {
              block.align = alignVal;
            }
          }
          activeEditable.style.textAlign = alignVal;
          // Clear any conflicting inline text-align / align attributes inside child elements
          // so that paragraph alignment (fieldAlign) applies identically across both EN and RU
          activeEditable.querySelectorAll("[style], [align]").forEach((el) => {
            el.removeAttribute("align");
            const st = el.getAttribute("style");
            if (st) {
              const cleaned = st.replace(/text-align\s*:\s*[^;]+;?/gi, "").trim();
              if (cleaned) el.setAttribute("style", cleaned);
              else el.removeAttribute("style");
            }
          });
          if (block && field && block[field] && typeof block[field] === "object") {
            const otherLang = state.editLang === "en" ? "ru" : "en";
            if (block[field][otherLang]) {
              block[field][otherLang] = String(block[field][otherLang])
                .replace(/\s+align=["'][^"']*["']/gi, "")
                .replace(/text-align\s*:\s*[^;"']+;?/gi, "");
            }
          }
        } else {
          ensureSelectionInEditable(activeEditable);
          if (cmd === "removeFormat" && block && block.fieldAlign && field) {
            delete block.fieldAlign[field];
            activeEditable.style.textAlign = "";
          }
          document.execCommand(cmd, false, val);
        }

        activeEditable.dispatchEvent(new Event("input", { bubbles: true }));
        saveSiteData(true);
        return;
      }

      const linkBtn = e.target.closest("[data-rte-link]");
      if (linkBtn) {
        const url = prompt("Введите ссылку (URL, например https://... или /release/...):", "https://");
        if (url && url.trim()) {
          activeEditable.focus();
          ensureSelectionInEditable(activeEditable);
          document.execCommand("createLink", false, url.trim());
          activeEditable.dispatchEvent(new Event("input", { bubbles: true }));
          saveSiteData(true);
        }
      }
    });
  }

  /* ==========================================================================
     MAIN INITIALIZATION & EVENT LISTENERS
     ========================================================================== */
  async function initAdmin() {
    // 1. Check Auth (supports both Node.js backend AND GitHub Pages static hosting!)
    const authOverlay = document.getElementById("auth-overlay");
    let authed = false;
    if (state.token) {
      if (state.token.startsWith("static_gh_session_")) {
        state.isStaticHost = true;
        authed = true;
      } else {
        try {
          const vRes = await fetch(resolveUrl("/api/auth/verify"), {
            headers: { Authorization: `Bearer ${state.token}` }
          });
          const ct = (vRes.headers.get("content-type") || "").toLowerCase();
          if (vRes.ok && ct.includes("application/json")) {
            authed = true;
          } else if (vRes.status === 404 || vRes.status === 405 || !ct.includes("application/json")) {
            state.isStaticHost = true;
          }
        } catch (e) {
          state.isStaticHost = true;
        }
      }
    }
    if (authed && authOverlay) {
      authOverlay.classList.add("hidden");
    }

    // 2. Load fresh site.json (tries /api/site first, falls back to /data/site.json on GitHub Pages)
    let siteLoaded = false;
    if (!state.isStaticHost) {
      try {
        const sRes = await fetch(resolveUrl("/api/site"), { cache: "no-store" });
        const ct = (sRes.headers.get("content-type") || "").toLowerCase();
        if (sRes.ok && ct.includes("application/json")) {
          state.siteData = await sRes.json();
          siteLoaded = true;
        } else {
          state.isStaticHost = true;
        }
      } catch (e) {
        state.isStaticHost = true;
      }
    }

    if (!siteLoaded) {
      try {
        const jRes = await fetch(resolveUrl(`/data/site.json?t=${Date.now()}`), { cache: "no-store" });
        if (jRes.ok) {
          state.siteData = await jRes.json();
          siteLoaded = true;
        }
      } catch (e) {}
    }

    if (state.isStaticHost) {
      const localDraft = localStorage.getItem("1arutyun_local_site_draft");
      if (localDraft) {
        try {
          state.siteData = JSON.parse(localDraft);
        } catch (e) {}
      }
    }

    // Populate GitHub Pages config inputs in Themes tab
    const ghRepoIn = document.getElementById("gh-repo-input");
    const ghBranchIn = document.getElementById("gh-branch-input");
    const ghTokenIn = document.getElementById("gh-token-input");
    if (ghRepoIn) ghRepoIn.value = detectDefaultGithubRepo();
    if (ghBranchIn) ghBranchIn.value = localStorage.getItem("1arutyun_gh_branch") || "main";
    if (ghTokenIn) ghTokenIn.value = localStorage.getItem("1arutyun_gh_token") || "";

    document.getElementById("save-gh-config-btn")?.addEventListener("click", () => {
      if (ghRepoIn) localStorage.setItem("1arutyun_gh_repo", ghRepoIn.value.trim());
      if (ghBranchIn) localStorage.setItem("1arutyun_gh_branch", ghBranchIn.value.trim() || "main");
      if (ghTokenIn) localStorage.setItem("1arutyun_gh_token", ghTokenIn.value.trim());
      showToast("✓ Настройки GitHub сохранены! Нажмите «Сохранить изменения» для отправки на сайт.");
    });

    document.getElementById("download-site-json-btn")?.addEventListener("click", downloadSiteJson);

    renderInsertPalette();
    renderPagesNavigation();
    renderThemesDrawer();
    renderCanvas();
    loadMediaLibrary();
    initDirectMouseResizing();
    initBlockDragAndDrop();
    initDrawerResizing();
    initRichTextToolbar();
    state.initialized = true;
    history.lastCommittedJson = JSON.stringify(state.siteData);
    history.undoStack = [];
    history.redoStack = [];
    updateUndoRedoButtons();

    document.getElementById("undo-btn")?.addEventListener("click", performUndo);
    document.getElementById("redo-btn")?.addEventListener("click", performRedo);

    window.addEventListener("keydown", (e) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;
      const key = e.key.toLowerCase();
      if ((key === "z" || key === "я") && !e.shiftKey) {
        if (history.undoStack.length > 0 || JSON.stringify(state.siteData) !== history.lastCommittedJson) {
          e.preventDefault();
          performUndo();
        }
      } else if (key === "y" || key === "н" || ((key === "z" || key === "я") && e.shiftKey)) {
        if (history.redoStack.length > 0) {
          e.preventDefault();
          performRedo();
        }
      }
    });

    // Login Form (Works on both Node.js server AND GitHub Pages static hosting!)
    const authForm = document.getElementById("auth-form");
    if (authForm) {
      authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("auth-username").value.trim();
        const password = document.getElementById("auth-password").value;
        const errEl = document.getElementById("auth-error");
        errEl.textContent = "";

        if (!state.isStaticHost) {
          try {
            const res = await fetch(resolveUrl("/api/auth/login"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password })
            });
            const ct = (res.headers.get("content-type") || "").toLowerCase();
            if (ct.includes("application/json")) {
              const data = await res.json();
              if (res.ok && data.ok) {
                state.token = data.token;
                localStorage.setItem("1arutyun_admin_token", data.token);
                authOverlay.classList.add("hidden");
                errEl.textContent = "";
              } else {
                errEl.textContent = data.error || "Неверный логин или пароль";
              }
              return;
            }
            state.isStaticHost = true;
          } catch (err) {
            state.isStaticHost = true;
          }
        }

        // Static / GitHub Pages browser-side cryptographic login verification
        try {
          const valid = await verifyStaticLogin(username, password);
          if (valid) {
            state.token = `static_gh_session_${Date.now()}`;
            localStorage.setItem("1arutyun_admin_token", state.token);
            authOverlay.classList.add("hidden");
            errEl.textContent = "";
          } else {
            errEl.textContent = "Неверный логин или пароль";
          }
        } catch (err) {
          errEl.textContent = "Ошибка проверки пароля в браузере";
        }
      });
    }

    // Save & Logout
    document.getElementById("save-site-btn")?.addEventListener("click", saveSiteData);
    document.getElementById("logout-btn")?.addEventListener("click", () => {
      state.token = "";
      localStorage.removeItem("1arutyun_admin_token");
      authOverlay.classList.remove("hidden");
    });

    // Page Selector Dropdown
    document.getElementById("page-selector")?.addEventListener("change", (e) => {
      state.currentPage = e.target.value;
      renderPagesNavigation();
      renderCanvas();
    });

    // Quick Action Buttons
    document.getElementById("add-custom-page-btn")?.addEventListener("click", createNewCustomPage);
    document.getElementById("quick-add-page-btn")?.addEventListener("click", createNewCustomPage);
    document.getElementById("add-release-page-btn")?.addEventListener("click", createNewReleasePage);
    document.getElementById("quick-add-release-btn")?.addEventListener("click", createNewReleasePage);

    document.getElementById("quick-add-video-btn")?.addEventListener("click", () => {
      state.currentPage = "videos";
      if (!Array.isArray(state.siteData.videos)) state.siteData.videos = [];
      state.siteData.videos.unshift({
        id: `vid-${Date.now()}`,
        title: { en: "", ru: "" },
        desc: { en: "", ru: "" },
        type: "youtube",
        youtubeId: "",
        videoUrl: "",
        thumbnail: "",
        date: "2026",
        releaseSlug: ""
      });
      renderPagesNavigation();
      renderCanvas();
    });

    document.getElementById("quick-add-post-btn")?.addEventListener("click", () => {
      state.currentPage = "thoughts";
      if (!Array.isArray(state.siteData.posts)) state.siteData.posts = [];
      state.siteData.posts.unshift({
        id: `post-${Date.now()}`,
        date: new Date().toISOString(),
        pinned: false,
        title: { en: "", ru: "" },
        text: { en: "", ru: "" },
        mediaType: "image",
        mediaUrl: "",
        reactions: 0
      });
      renderPagesNavigation();
      renderCanvas();
    });

    // File Upload Inputs
    document.getElementById("media-upload-input")?.addEventListener("change", async (e) => {
      await uploadFiles(e.target.files);
      e.target.value = "";
    });

    document.getElementById("modal-upload-input")?.addEventListener("change", async (e) => {
      const url = await uploadFiles(e.target.files);
      e.target.value = "";
      if (url && state.mediaPickerCallback) {
        state.mediaPickerCallback(url);
        closeMediaPicker();
      }
    });

    document.getElementById("close-media-modal")?.addEventListener("click", closeMediaPicker);
    document.getElementById("modal-apply-url")?.addEventListener("click", () => {
      const val = document.getElementById("modal-direct-url")?.value.trim();
      if (val && state.mediaPickerCallback) {
        state.mediaPickerCallback(val);
        closeMediaPicker();
      }
    });

    // Global Click Delegation
    document.addEventListener("click", async (e) => {
      // Drawer Tabs
      const tabBtn = e.target.closest(".drawer-tab");
      if (tabBtn) {
        const tab = tabBtn.dataset.tab;
        document.querySelectorAll(".drawer-tab").forEach((b) => b.classList.toggle("active", b === tabBtn));
        document.querySelectorAll(".drawer-pane").forEach((p) => p.classList.toggle("active", p.id === `pane-${tab}`));
        return;
      }

      // Canvas Theme Preview Toggle
      const themeBtn = e.target.closest("[data-canvas-theme]");
      if (themeBtn) {
        state.canvasTheme = themeBtn.getAttribute("data-canvas-theme");
        document.querySelectorAll("[data-canvas-theme]").forEach((b) => b.classList.toggle("active", b === themeBtn));
        applyCanvasVariables();
        return;
      }

      // Viewport Toggle
      const vpBtn = e.target.closest("[data-viewport]");
      if (vpBtn) {
        const vp = vpBtn.getAttribute("data-viewport");
        document.querySelectorAll("[data-viewport]").forEach((b) => b.classList.toggle("active", b === vpBtn));
        document.getElementById("canvas-paper")?.classList.toggle("mobile-preview", vp === "mobile");
        return;
      }

      // Insert Standard Empty Block
      const insertCard = e.target.closest("[data-insert-block]");
      if (insertCard) {
        const type = insertCard.getAttribute("data-insert-block");
        let blocks = getActiveBlocksArray();
        if (!blocks) {
          state.currentPage = "main";
          blocks = getActiveBlocksArray();
          renderPagesNavigation();
        }
        const newBlock = createEmptyBlock(type);
        blocks.push(newBlock);
        state.selectedBlockId = newBlock.id;
        renderPagesNavigation();
        renderCanvas();
        showToast("Пустой блок добавлен — заполните его прямо на холсте");
        return;
      }

      // Delete Custom Page (Requirement #4)
      const delCustomPageBtn = e.target.closest("[data-delete-custom-page]");
      if (delCustomPageBtn) {
        e.stopPropagation();
        const idx = Number(delCustomPageBtn.getAttribute("data-delete-custom-page"));
        const pg = (state.siteData.customPages || [])[idx];
        if (pg && confirm(`Удалить страницу "/page/${pg.slug}"?`)) {
          state.siteData.customPages.splice(idx, 1);
          if (state.currentPage === `page:${pg.slug}`) state.currentPage = "main";
          renderPagesNavigation();
          renderCanvas();
          showToast("Страница удалена");
        }
        return;
      }

      // Delete Release Page (Requirement #4)
      const delRelBtn = e.target.closest("[data-delete-release]");
      if (delRelBtn) {
        e.stopPropagation();
        const idx = Number(delRelBtn.getAttribute("data-delete-release"));
        const rel = (state.siteData.releases || [])[idx];
        if (rel && confirm(`Удалить страницу релиза "${rel.title}"?`)) {
          state.siteData.releases.splice(idx, 1);
          if (state.siteData.releases.length && !state.siteData.releases.some((r) => r.isLatest)) {
            state.siteData.releases[0].isLatest = true;
          }
          syncFeaturedReleaseToMainBlock(getFeaturedRelease());
          if (state.currentPage === `release:${rel.slug}`) state.currentPage = "main";
          renderPagesNavigation();
          renderCanvas();
          scheduleAutoSave();
          showToast("Страница релиза удалена");
        }
        return;
      }

      // Set Release as Latest / Featured on Main Page
      const setLatestBtn = e.target.closest("[data-set-latest-release]");
      if (setLatestBtn) {
        e.stopPropagation();
        const idx = Number(setLatestBtn.getAttribute("data-set-latest-release"));
        const releases = state.siteData.releases || [];
        const rel = releases[idx];
        if (rel) {
          releases.forEach((r, i) => {
            r.isLatest = i === idx;
          });
          syncFeaturedReleaseToMainBlock(rel);
          renderPagesNavigation();
          renderCanvas();
          scheduleAutoSave();
          showToast(`Релиз «${rel.title}» установлен как главный на витрине`);
        }
        return;
      }

      // Switch Page from Pages Tree
      const switchPageItem = e.target.closest("[data-switch-page]");
      if (switchPageItem) {
        state.currentPage = switchPageItem.getAttribute("data-switch-page");
        renderPagesNavigation();
        renderCanvas();
        return;
      }

      // Select Block Wrapper on Click
      const blockWrapper = e.target.closest("[data-block-wrapper]");
      if (blockWrapper) {
        state.selectedBlockId = blockWrapper.getAttribute("data-block-id");
        document.querySelectorAll(".vblock-wrapper").forEach((w) => w.classList.toggle("selected", w === blockWrapper));
      }

      // On-Block Controls
      const blocks = getActiveBlocksArray();

      const addImgBtn = e.target.closest("[data-add-block-img]");
      if (addImgBtn && blocks) {
        const idx = Number(addImgBtn.getAttribute("data-add-block-img"));
        if (!Array.isArray(blocks[idx].images)) blocks[idx].images = [];
        blocks[idx].images.push("");
        renderCanvas();
        return;
      }

      const remImgBtn = e.target.closest("[data-remove-block-img]");
      if (remImgBtn && blocks) {
        const idx = Number(remImgBtn.getAttribute("data-remove-block-img"));
        if (Array.isArray(blocks[idx].images) && blocks[idx].images.length > 1) {
          blocks[idx].images.pop();
          renderCanvas();
        }
        return;
      }

      const toggleLayoutBtn = e.target.closest("[data-toggle-layout]");
      if (toggleLayoutBtn && blocks) {
        const idx = Number(toggleLayoutBtn.getAttribute("data-toggle-layout"));
        blocks[idx].layout = blocks[idx].layout === "image-right" ? "image-left" : "image-right";
        renderCanvas();
        return;
      }

      const toggleFramedBtn = e.target.closest("[data-toggle-framed]");
      if (toggleFramedBtn && blocks) {
        const idx = Number(toggleFramedBtn.getAttribute("data-toggle-framed"));
        blocks[idx].framedHeading = blocks[idx].framedHeading === false ? true : false;
        renderCanvas();
        return;
      }

      const toggleTiltBtn = e.target.closest("[data-toggle-tilt]");
      if (toggleTiltBtn && blocks) {
        const idx = Number(toggleTiltBtn.getAttribute("data-toggle-tilt"));
        blocks[idx].tilt3d = blocks[idx].tilt3d === false ? true : false;
        renderCanvas();
        return;
      }

      const toggleBleedBtn = e.target.closest("[data-toggle-fullbleed]");
      if (toggleBleedBtn && blocks) {
        const idx = Number(toggleBleedBtn.getAttribute("data-toggle-fullbleed"));
        blocks[idx].fullBleed = !blocks[idx].fullBleed;
        if (blocks[idx].fullBleed) blocks[idx].widthPct = 100;
        renderCanvas();
        scheduleAutoSave();
        return;
      }

      const toggleBannerNoImgBtn = e.target.closest("[data-toggle-banner-noimg]");
      if (toggleBannerNoImgBtn && blocks) {
        const idx = Number(toggleBannerNoImgBtn.getAttribute("data-toggle-banner-noimg"));
        blocks[idx].noImage = !blocks[idx].noImage;
        renderCanvas();
        scheduleAutoSave();
        showToast(blocks[idx].noImage ? "Фото баннера отключено — текст подстраивается под тему сайта" : "Фото баннера включено");
        return;
      }

      const clearBgBtn = e.target.closest("[data-clear-bg]");
      if (clearBgBtn && blocks) {
        const idx = Number(clearBgBtn.getAttribute("data-clear-bg"));
        blocks[idx].bgColor = "transparent";
        blocks[idx].textColor = "";
        renderCanvas();
        return;
      }

      const moveBtn = e.target.closest("[data-move-block]");
      if (moveBtn && blocks) {
        const idx = Number(moveBtn.getAttribute("data-move-block"));
        const dir = Number(moveBtn.getAttribute("data-dir"));
        const target = idx + dir;
        if (target >= 0 && target < blocks.length) {
          const [item] = blocks.splice(idx, 1);
          blocks.splice(target, 0, item);
          renderCanvas();
        }
        return;
      }

      const dupBtn = e.target.closest("[data-dup-block]");
      if (dupBtn && blocks) {
        const idx = Number(dupBtn.getAttribute("data-dup-block"));
        const copy = JSON.parse(JSON.stringify(blocks[idx]));
        copy.id = `block-${Date.now()}`;
        blocks.splice(idx + 1, 0, copy);
        renderCanvas();
        return;
      }

      const visBtn = e.target.closest("[data-vis-block]");
      if (visBtn && blocks) {
        const idx = Number(visBtn.getAttribute("data-vis-block"));
        blocks[idx].visible = blocks[idx].visible === false ? true : false;
        renderCanvas();
        return;
      }

      const delBlockBtn = e.target.closest("[data-del-block]");
      if (delBlockBtn && blocks) {
        const idx = Number(delBlockBtn.getAttribute("data-del-block"));
        blocks.splice(idx, 1);
        renderPagesNavigation();
        renderCanvas();
        return;
      }

      // Media Picker Triggers on Blocks
      const pickBannerBtn = e.target.closest("[data-pick-banner-img]");
      if (pickBannerBtn && blocks) {
        const idx = Number(pickBannerBtn.getAttribute("data-pick-banner-img"));
        openMediaPicker((url) => {
          blocks[idx].image = url;
          blocks[idx].noImage = false;
          renderCanvas();
          scheduleAutoSave();
        });
        return;
      }

      const pickSplitImg = e.target.closest("[data-pick-split-img]");
      if (pickSplitImg && blocks) {
        const idx = Number(pickSplitImg.getAttribute("data-pick-split-img"));
        const imgIdx = Number(pickSplitImg.getAttribute("data-img-idx"));
        openMediaPicker((url) => {
          if (!Array.isArray(blocks[idx].images)) blocks[idx].images = [];
          blocks[idx].images[imgIdx] = url;
          renderCanvas();
        });
        return;
      }

      const clearSplitImg = e.target.closest("[data-clear-split-img]");
      if (clearSplitImg && blocks) {
        const idx = Number(clearSplitImg.getAttribute("data-clear-split-img"));
        const imgIdx = Number(clearSplitImg.getAttribute("data-img-idx"));
        if (Array.isArray(blocks[idx].images)) {
          blocks[idx].images[imgIdx] = "";
          renderCanvas();
        }
        return;
      }

      const pickVidBlock = e.target.closest("[data-pick-video-block]");
      if (pickVidBlock && blocks) {
        const idx = Number(pickVidBlock.getAttribute("data-pick-video-block"));
        openMediaPicker((url) => {
          blocks[idx].videoUrl = url;
          renderCanvas();
        });
        return;
      }

      // Release Page Controls
      const pickRelCover = e.target.closest("[data-pick-rel-cover]");
      if (pickRelCover) {
        const rIdx = Number(pickRelCover.getAttribute("data-pick-rel-cover"));
        openMediaPicker((url) => {
          const rel = state.siteData.releases[rIdx];
          if (rel) {
            rel.cover = url;
            const feat = getFeaturedRelease();
            if (feat && feat.slug === rel.slug) {
              syncFeaturedReleaseToMainBlock(rel);
            }
            renderCanvas();
            scheduleAutoSave();
          }
        });
        return;
      }

      const addPlatBtn = e.target.closest("[data-add-platform]");
      if (addPlatBtn) {
        const rIdx = Number(addPlatBtn.getAttribute("data-add-platform"));
        state.siteData.releases[rIdx].platforms.push({ name: "Platform", url: "", icon: "link" });
        renderCanvas();
        return;
      }

      const delPlatBtn = e.target.closest("[data-del-platform]");
      if (delPlatBtn) {
        const [rIdx, pIdx] = delPlatBtn.getAttribute("data-del-platform").split(":").map(Number);
        state.siteData.releases[rIdx].platforms.splice(pIdx, 1);
        renderCanvas();
        return;
      }

      // Toggle Video Attached to Release (Requirement #4)
      const toggleRelVidBtn = e.target.closest("[data-toggle-rel-video]");
      if (toggleRelVidBtn) {
        const raw = toggleRelVidBtn.getAttribute("data-toggle-rel-video");
        const colonIdx = raw.indexOf(":");
        const rIdx = Number(raw.slice(0, colonIdx));
        const vidId = raw.slice(colonIdx + 1);
        const rel = state.siteData.releases[rIdx];
        if (rel) {
          if (!Array.isArray(rel.videoIds)) rel.videoIds = [];
          const pos = rel.videoIds.indexOf(vidId);
          const vidObj = (state.siteData.videos || []).find((v) => v.id === vidId);
          if (pos >= 0) {
            rel.videoIds.splice(pos, 1);
            if (vidObj && vidObj.releaseSlug === rel.slug) vidObj.releaseSlug = "";
            showToast("Видео откреплено от релиза");
          } else {
            rel.videoIds.push(vidId);
            if (vidObj) vidObj.releaseSlug = rel.slug;
            showToast("Видео прикреплено к релизу");
          }
          renderCanvas();
        }
        return;
      }

      // Add New Video Directly to Current Release (Requirement #4)
      const addRelVidBtn = e.target.closest("[data-add-rel-video]");
      if (addRelVidBtn) {
        const rIdx = Number(addRelVidBtn.getAttribute("data-add-rel-video"));
        const rel = state.siteData.releases[rIdx];
        if (rel) {
          if (!Array.isArray(state.siteData.videos)) state.siteData.videos = [];
          if (!Array.isArray(rel.videoIds)) rel.videoIds = [];
          const newVidId = `vid-${Date.now()}`;
          state.siteData.videos.unshift({
            id: newVidId,
            title: { en: `${rel.title} — New Video`, ru: `${rel.title} — Новое видео` },
            desc: { en: "", ru: "" },
            type: "youtube",
            youtubeId: "",
            videoUrl: "",
            thumbnail: rel.cover || "",
            date: "2026",
            releaseSlug: rel.slug
          });
          rel.videoIds.push(newVidId);
          state.currentPage = "videos";
          renderPagesNavigation();
          renderCanvas();
          showToast("Видео создано и привязано к релизу — укажите ссылку или загрузите MP4");
        }
        return;
      }

      // Videos Page Controls
      if (e.target.closest("#canvas-add-video-btn")) {
        if (!Array.isArray(state.siteData.videos)) state.siteData.videos = [];
        state.siteData.videos.unshift({
          id: `vid-${Date.now()}`,
          title: { en: "", ru: "" },
          desc: { en: "", ru: "" },
          type: "youtube",
          youtubeId: "",
          videoUrl: "",
          thumbnail: "",
          date: "2026",
          releaseSlug: ""
        });
        renderPagesNavigation();
        renderCanvas();
        return;
      }

      const delVidBtn = e.target.closest("[data-del-video]");
      if (delVidBtn) {
        const vIdx = Number(delVidBtn.getAttribute("data-del-video"));
        state.siteData.videos.splice(vIdx, 1);
        renderPagesNavigation();
        renderCanvas();
        return;
      }

      const pickVidThumb = e.target.closest("[data-pick-vid-thumb]");
      if (pickVidThumb) {
        const vIdx = Number(pickVidThumb.getAttribute("data-pick-vid-thumb"));
        openMediaPicker((url) => {
          state.siteData.videos[vIdx].thumbnail = url;
          renderCanvas();
        });
        return;
      }

      const pickVidFile = e.target.closest("[data-pick-vid-file]");
      if (pickVidFile) {
        const vIdx = Number(pickVidFile.getAttribute("data-pick-vid-file"));
        openMediaPicker((url) => {
          state.siteData.videos[vIdx].type = "file";
          state.siteData.videos[vIdx].videoUrl = url;
          renderCanvas();
        });
        return;
      }

      // Thoughts / Posts Controls
      if (e.target.closest("#canvas-add-post-btn")) {
        if (!Array.isArray(state.siteData.posts)) state.siteData.posts = [];
        state.siteData.posts.unshift({
          id: `post-${Date.now()}`,
          date: new Date().toISOString(),
          pinned: false,
          title: { en: "", ru: "" },
          text: { en: "", ru: "" },
          mediaType: "image",
          mediaUrl: "",
          reactions: 0
        });
        renderPagesNavigation();
        renderCanvas();
        return;
      }

      const delPostBtn = e.target.closest("[data-del-post]");
      if (delPostBtn) {
        const pIdx = Number(delPostBtn.getAttribute("data-del-post"));
        state.siteData.posts.splice(pIdx, 1);
        renderPagesNavigation();
        renderCanvas();
        return;
      }

      const pickPostMedia = e.target.closest("[data-pick-post-media]");
      if (pickPostMedia) {
        const pIdx = Number(pickPostMedia.getAttribute("data-pick-post-media"));
        openMediaPicker((url) => {
          const isVid = /\.(mp4|webm|mov|ogg)$/i.test(url);
          state.siteData.posts[pIdx].mediaUrl = url;
          state.siteData.posts[pIdx].mediaType = isVid ? "video" : "image";
          renderCanvas();
        });
        return;
      }

      const clearPostMedia = e.target.closest("[data-clear-post-media]");
      if (clearPostMedia) {
        const pIdx = Number(clearPostMedia.getAttribute("data-clear-post-media"));
        state.siteData.posts[pIdx].mediaUrl = "";
        renderCanvas();
        return;
      }

      // Theme Presets
      const presetBtn = e.target.closest("[data-apply-preset]");
      if (presetBtn) {
        const pr = COLOR_PRESETS[Number(presetBtn.getAttribute("data-apply-preset"))];
        if (pr) {
          state.siteData.settings.lightColors = JSON.parse(JSON.stringify(pr.light));
          state.siteData.settings.darkColors = JSON.parse(JSON.stringify(pr.dark));
          renderThemesDrawer();
          applyCanvasVariables();
          showToast(`Применен пресет «${pr.name}»`);
        }
        return;
      }

      // Avatar Picker
      if (e.target.closest("#pick-avatar-btn")) {
        openMediaPicker((url) => {
          state.siteData.profile.avatar = url;
          const avIn = document.getElementById("prof-avatar");
          if (avIn) avIn.value = url;
        });
        return;
      }

      // Media Item Select or Delete
      const selMediaBtn = e.target.closest("[data-select-media]");
      if (selMediaBtn) {
        const url = selMediaBtn.getAttribute("data-select-media");
        if (state.mediaPickerCallback) {
          state.mediaPickerCallback(url);
          closeMediaPicker();
        } else {
          navigator.clipboard?.writeText(url);
          showToast("Ссылка скопирована в буфер обмена");
        }
        return;
      }

      const delMediaBtn = e.target.closest("[data-delete-media]");
      if (delMediaBtn) {
        const url = delMediaBtn.getAttribute("data-delete-media");
        try {
          const res = await fetch("/api/media", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${state.token}`
            },
            body: JSON.stringify({ url })
          });
          if (!res.ok) throw new Error("Static mode");
        } catch {
          try {
            const customMedia = JSON.parse(localStorage.getItem("1arutyun_custom_media") || "[]");
            localStorage.setItem(
              "1arutyun_custom_media",
              JSON.stringify(customMedia.filter((m) => m.url !== url))
            );
          } catch {}
        }
        await loadMediaLibrary();
        return;
      }

      // Update Admin Credentials
      if (e.target.closest("#update-credentials-btn")) {
        const newUsername = document.getElementById("sec-new-login")?.value.trim();
        const newPassword = document.getElementById("sec-new-pass")?.value;
        if (!newUsername || !newPassword || newPassword.length < 4) {
          showToast("Введите логин и пароль (минимум 4 символа)");
          return;
        }
        try {
          const res = await fetch("/api/auth/change-credentials", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${state.token}`
            },
            body: JSON.stringify({ newUsername, newPassword })
          });
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const data = await res.json();
            if (res.ok && data.ok) {
              state.token = data.token;
              localStorage.setItem("1arutyun_admin_token", data.token);
              showToast("Логин и пароль успешно обновлены");
              return;
            } else if (data.error) {
              showToast(data.error);
              return;
            }
          }
        } catch {}

        // Static / GitHub Pages fallback for updating credentials
        const saltBytes = new Uint8Array(16);
        window.crypto.getRandomValues(saltBytes);
        const salt = Array.from(saltBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const passwordHash = await hmacSha256Hex(salt, newPassword);
        const newAuth = { username: newUsername, salt, passwordHash };
        localStorage.setItem("1arutyun_local_auth_override", JSON.stringify(newAuth));

        const ghToken = (localStorage.getItem("1arutyun_gh_token") || "").trim();
        const ghRepo = (localStorage.getItem("1arutyun_gh_repo") || detectDefaultGithubRepo()).trim();
        const ghBranch = (localStorage.getItem("1arutyun_gh_branch") || "main").trim();
        if (ghToken && ghRepo) {
          try {
            const apiUrl = `https://api.github.com/repos/${ghRepo}/contents/data/auth.json`;
            const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(ghBranch)}`, {
              headers: {
                Authorization: `Bearer ${ghToken}`,
                Accept: "application/vnd.github+json"
              }
            });
            let sha = undefined;
            if (getRes.ok) {
              const info = await getRes.json();
              sha = info.sha;
            }
            const jsonText = JSON.stringify(newAuth, null, 2);
            const bytes = new TextEncoder().encode(jsonText);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            await fetch(apiUrl, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${ghToken}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: "Update admin credentials via Studio",
                content: btoa(binary),
                branch: ghBranch,
                ...(sha ? { sha } : {})
              })
            });
            showToast("Логин и пароль обновлены и сохранены в GitHub!");
            return;
          } catch {}
        }
        showToast("Логин и пароль сохранены в этом браузере");
      }
    });

    // Live ContentEditable Input Sync (per-language inline formatting)
    document.addEventListener("input", (e) => {
      scheduleAutoSave();
      const editable = e.target.closest("[contenteditable='true'][data-edit-field]");
      if (editable) {
        const field = editable.getAttribute("data-edit-field");
        const idx = Number(editable.getAttribute("data-block-idx"));
        const blocks = getActiveBlocksArray();
        if (blocks && blocks[idx]) {
          const val = sanitizeRichHtml(editable.innerHTML);
          setLoc(blocks[idx], field, val);
          // Keep Undefined manifesto text synced if editing the featured undefined block
          if (blocks[idx].id === "block-undefined-split" && field === "text") {
            const undefRel = (state.siteData.releases || []).find((r) => r.slug === "undefined");
            if (undefRel && blocks[idx].linkUrl === "/release/undefined") {
              undefRel.featuredText = JSON.parse(JSON.stringify(blocks[idx].text));
            }
          }
        }
        return;
      }

      // Block Text Inputs
      const blockInput = e.target.closest("[data-block-input]");
      if (blockInput) {
        const prop = blockInput.getAttribute("data-block-input");
        const idx = Number(blockInput.getAttribute("data-block-idx"));
        const blocks = getActiveBlocksArray();
        if (blocks && blocks[idx]) {
          blocks[idx][prop] = prop === "imageSize" ? Number(blockInput.value) || 400 : blockInput.value;
          if (prop === "imageSize") {
            const wrapper = blockInput.closest(".vblock-wrapper");
            const colEl = wrapper?.querySelector("[data-split-img-col]");
            if (colEl) colEl.style.maxWidth = `${blocks[idx].imageSize}px`;
          }
        }
        return;
      }

      // On-Block Color Pickers
      const blockColor = e.target.closest("[data-block-color]");
      if (blockColor) {
        const prop = blockColor.getAttribute("data-block-color");
        const idx = Number(blockColor.getAttribute("data-block-idx"));
        const blocks = getActiveBlocksArray();
        if (blocks && blocks[idx]) {
          blocks[idx][prop] = blockColor.value;
          const wrapper = blockColor.closest(".vblock-wrapper");
          if (wrapper) {
            if (prop === "bgColor") wrapper.style.background = blockColor.value;
            if (prop === "textColor") wrapper.style.color = blockColor.value;
          }
        }
        return;
      }

      // Custom Page Title & Slug
      const cpTitle = e.target.closest("[data-custom-page-title]");
      if (cpTitle) {
        const pIdx = Number(cpTitle.getAttribute("data-custom-page-title"));
        const pg = state.siteData.customPages[pIdx];
        if (pg) {
          setLoc(pg, "title", cpTitle.value);
          renderPagesNavigation();
        }
        return;
      }

      const cpSlug = e.target.closest("[data-custom-page-slug]");
      if (cpSlug) {
        const pIdx = Number(cpSlug.getAttribute("data-custom-page-slug"));
        const pg = state.siteData.customPages[pIdx];
        if (pg) {
          const clean = cpSlug.value.trim().replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase() || `page-${pIdx + 1}`;
          pg.slug = clean;
          state.currentPage = `page:${clean}`;
          renderPagesNavigation();
        }
        return;
      }

      // Release Page Inputs
      const relField = e.target.closest("[data-rel-field]");
      if (relField) {
        const rIdx = Number(relField.getAttribute("data-rel-idx"));
        const key = relField.getAttribute("data-rel-field");
        const rel = state.siteData.releases[rIdx];
        if (rel) {
          const wasFeatured = getFeaturedRelease() && getFeaturedRelease().id === rel.id;
          rel[key] = relField.value;
          if (key === "slug") state.currentPage = `release:${rel.slug}`;
          if (wasFeatured) syncFeaturedReleaseToMainBlock(rel);
          renderPagesNavigation();
        }
        return;
      }

      const relLoc = e.target.closest("[data-rel-loc]");
      if (relLoc) {
        const rIdx = Number(relLoc.getAttribute("data-rel-idx"));
        const key = relLoc.getAttribute("data-rel-loc");
        const rel = state.siteData.releases[rIdx];
        if (rel) {
          setLoc(rel, key, relLoc.value);
          const wasFeatured = getFeaturedRelease() && getFeaturedRelease().id === rel.id;
          if (wasFeatured) syncFeaturedReleaseToMainBlock(rel);
        }
        return;
      }

      const relTracks = e.target.closest("[data-rel-tracks]");
      if (relTracks) {
        const rIdx = Number(relTracks.getAttribute("data-rel-tracks"));
        state.siteData.releases[rIdx].tracks = relTracks.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        return;
      }

      const platName = e.target.closest("[data-plat-name]");
      if (platName) {
        const [rIdx, pIdx] = platName.getAttribute("data-plat-name").split(":").map(Number);
        state.siteData.releases[rIdx].platforms[pIdx].name = platName.value;
        return;
      }

      const platUrl = e.target.closest("[data-plat-url]");
      if (platUrl) {
        const [rIdx, pIdx] = platUrl.getAttribute("data-plat-url").split(":").map(Number);
        state.siteData.releases[rIdx].platforms[pIdx].url = platUrl.value;
        return;
      }

      // Videos Inputs
      const vidLoc = e.target.closest("[data-vid-loc]");
      if (vidLoc) {
        const vIdx = Number(vidLoc.getAttribute("data-vid-idx"));
        const key = vidLoc.getAttribute("data-vid-loc");
        setLoc(state.siteData.videos[vIdx], key, vidLoc.value);
        return;
      }

      const vidField = e.target.closest("[data-vid-field]");
      if (vidField) {
        const vIdx = Number(vidField.getAttribute("data-vid-idx"));
        const key = vidField.getAttribute("data-vid-field");
        state.siteData.videos[vIdx][key] = vidField.value;
        return;
      }

      // Posts Inputs
      const postLoc = e.target.closest("[data-post-loc]");
      if (postLoc) {
        const pIdx = Number(postLoc.getAttribute("data-post-idx"));
        const key = postLoc.getAttribute("data-post-loc");
        setLoc(state.siteData.posts[pIdx], key, postLoc.value);
        return;
      }

      const postMedia = e.target.closest("[data-post-media]");
      if (postMedia) {
        const pIdx = Number(postMedia.getAttribute("data-post-media"));
        state.siteData.posts[pIdx].mediaUrl = postMedia.value;
        return;
      }

      // Theme Color Pickers & Hex Inputs (Requirement #2)
      const themeColor = e.target.closest("[data-theme-color]");
      if (themeColor) {
        const [modeKey, colorKey] = themeColor.getAttribute("data-theme-color").split(":");
        state.siteData.settings[modeKey][colorKey] = themeColor.value;
        const hexInput = document.querySelector(`[data-theme-hex="${modeKey}:${colorKey}"]`);
        if (hexInput) hexInput.value = themeColor.value;
        applyCanvasVariables();
        return;
      }

      const themeHex = e.target.closest("[data-theme-hex]");
      if (themeHex) {
        const [modeKey, colorKey] = themeHex.getAttribute("data-theme-hex").split(":");
        state.siteData.settings[modeKey][colorKey] = themeHex.value;
        if (/^#[0-9a-fA-F]{6}$/.test(themeHex.value)) {
          const colorInput = document.querySelector(`[data-theme-color="${modeKey}:${colorKey}"]`);
          if (colorInput) colorInput.value = themeHex.value;
        }
        applyCanvasVariables();
        return;
      }

      // Profile Inputs
      if (e.target.id === "prof-artist-name") state.siteData.profile.artistName = e.target.value;
      if (e.target.id === "prof-avatar") state.siteData.profile.avatar = e.target.value;
      if (e.target.id === "prof-ig-url") state.siteData.profile.socials.instagram = e.target.value;
      if (e.target.id === "prof-tg-url") state.siteData.profile.socials.telegram = e.target.value;
    });

    // Change Events for Selects & Checkboxes
    document.addEventListener("change", (e) => {
      scheduleAutoSave();
      const shapeSel = e.target.closest("[data-block-prop='shape']");
      if (shapeSel) {
        const idx = Number(shapeSel.getAttribute("data-block-idx"));
        const blocks = getActiveBlocksArray();
        if (blocks && blocks[idx]) {
          blocks[idx].shape = shapeSel.value;
          renderCanvas();
        }
        return;
      }

      const blockCheck = e.target.closest("[data-block-check]");
      if (blockCheck) {
        const prop = blockCheck.getAttribute("data-block-check");
        const idx = Number(blockCheck.getAttribute("data-block-idx"));
        const blocks = getActiveBlocksArray();
        if (blocks && blocks[idx]) {
          blocks[idx][prop] = blockCheck.checked;
        }
        return;
      }

      const cpNav = e.target.closest("[data-custom-page-nav]");
      if (cpNav) {
        const pIdx = Number(cpNav.getAttribute("data-custom-page-nav"));
        state.siteData.customPages[pIdx].showInNav = cpNav.checked;
        return;
      }

      const platIcon = e.target.closest("[data-plat-icon]");
      if (platIcon) {
        const [rIdx, pIdx] = platIcon.getAttribute("data-plat-icon").split(":").map(Number);
        state.siteData.releases[rIdx].platforms[pIdx].icon = platIcon.value;
        return;
      }

      const postPin = e.target.closest("[data-post-pin]");
      if (postPin) {
        const pIdx = Number(postPin.getAttribute("data-post-pin"));
        state.siteData.posts[pIdx].pinned = postPin.checked;
        return;
      }

      if (e.target.id === "font-banner-select") {
        state.siteData.settings.fonts.banner = e.target.value;
        applyCanvasVariables();
      }
      if (e.target.id === "font-heading-select") {
        state.siteData.settings.fonts.heading = e.target.value;
        applyCanvasVariables();
      }
      if (e.target.id === "font-body-select") {
        state.siteData.settings.fonts.body = e.target.value;
        applyCanvasVariables();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initAdmin);
})();
