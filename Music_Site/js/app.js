/**
 * 1arutyun — Seamless Block-Based Official Website Engine
 * Default Language: EN | Default Theme: Light | Seamless Block Architecture
 */

(function () {
  "use strict";

  // Clean up legacy unversioned localStorage keys from previous site version
  localStorage.removeItem("1arutyun_lang");
  localStorage.removeItem("1arutyun_lang_v3");
  localStorage.removeItem("1arutyun_theme");

  const state = {
    siteData: window.DEFAULT_SITE_DATA || {},
    lang: "en",
    theme: localStorage.getItem("1arutyun_theme_v3") || "light",
    activeVideoId: null,
    reactedPosts: JSON.parse(localStorage.getItem("1arutyun_reacted_posts") || "{}")
  };

  const ICONS = {
    sun: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    instagramColor: `<svg width="34" height="34" viewBox="0 0 48 48" fill="none"><defs><radialGradient id="igGrad1" cx="30%" cy="107%" r="125%"><stop offset="0%" stop-color="#fdf497"/><stop offset="5%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></radialGradient></defs><rect x="4" y="4" width="40" height="40" rx="11" fill="url(#igGrad1)"/><rect x="11.5" y="11.5" width="25" height="25" rx="6.5" stroke="#fff" stroke-width="2.6" fill="none"/><circle cx="24" cy="24" r="6" stroke="#fff" stroke-width="2.6" fill="none"/><circle cx="31.2" cy="16.8" r="1.6" fill="#fff"/></svg>`,
    telegramColor: `<svg width="34" height="34" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#2AABEE"/><path d="M13.6 23.6L32.8 16.2C33.7 15.9 34.5 16.4 34.2 17.7L30.9 33.2C30.7 34.3 30 34.6 29.1 34.1L24.1 30.4L21.7 32.7C21.4 33 21.2 33.2 20.7 33.2L21.1 28.1L30.4 19.7C30.8 19.3 30.3 19.1 29.8 19.5L18.3 26.7L13.4 25.2C12.3 24.8 12.3 24.1 13.6 23.6Z" fill="#fff"/></svg>`,
    spotify: `<svg viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`,
    apple: `<svg viewBox="0 0 24 24" fill="#FA243C"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.8-.335-2.22-1.092-.413-.746-.29-1.693.307-2.322.39-.41.88-.64 1.418-.765.46-.107.927-.173 1.39-.266.27-.053.47-.197.535-.483.02-.087.028-.178.028-.268V9.26c0-.29-.127-.42-.412-.365-.245.047-.49.1-.735.148l-4.27.835c-.065.013-.13.03-.193.052-.21.072-.313.225-.313.448v7.015c0 .442-.063.875-.262 1.274-.295.59-.774.96-1.406 1.132-.376.103-.76.154-1.15.16-.92.012-1.74-.385-2.14-1.143-.39-.74-.274-1.662.302-2.28.414-.445.936-.68 1.515-.802.433-.09.87-.156 1.304-.238.308-.058.504-.223.56-.534.014-.078.02-.158.02-.238V7.63c0-.508.282-.855.78-.955l6.625-1.304c.19-.037.38-.068.573-.08.43-.027.717.224.742.655.005.09.004.18.004.27v3.9z"/></svg>`,
    youtube: `<svg viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    deezer: `<svg viewBox="0 0 24 24" fill="#A238FF"><path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.594v3.027h5.189v-3.027h-5.19zm6.271 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03h-5.19zm6.271 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/></svg>`,
    tidal: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996 4.004 12l4.004-4.004L12.012 12l-4.004 4.004 4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zM16.042 7.996l3.979-3.979L24 7.996l-3.979 3.979-3.979-3.979z"/></svg>`,
    soundcloud: `<svg viewBox="0 0 24 24" fill="#FF5500"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.054-.049-.1-.084-.1zm1.896-.89c-.06 0-.108.052-.115.115l-.212 2.93.212 2.866c.007.063.055.114.115.114.058 0 .105-.051.114-.114l.24-2.866-.24-2.93c-.009-.063-.056-.115-.114-.115zm1.966-.65c-.07 0-.124.057-.131.132l-.225 3.448.225 3.216c.007.074.061.131.131.131.068 0 .122-.057.131-.131l.254-3.216-.254-3.448c-.009-.075-.063-.132-.131-.132zm1.979-.897c-.08 0-.143.065-.15.149l-.204 4.198.204 3.394c.007.084.07.149.15.149.078 0 .141-.065.15-.149l.232-3.394-.232-4.198c-.009-.084-.072-.149-.15-.149zm2.011-.642c-.09 0-.161.073-.169.168l-.189 4.672.189 3.495c.008.094.079.167.169.167.088 0 .159-.073.168-.167l.214-3.495-.214-4.672c-.009-.095-.08-.168-.168-.168zm2.03-.424c-.1 0-.178.081-.186.186l-.171 4.91.171 3.553c.008.104.086.185.186.185.098 0 .176-.081.185-.185l.195-3.553-.195-4.91c-.009-.105-.087-.186-.185-.186zm10.186 2.865c-.433 0-.845.087-1.222.244-.247-2.801-2.595-4.996-5.461-4.996-.705 0-1.38.136-1.999.38-.235.092-.298.188-.3.373v9.784c.003.192.155.349.349.352h8.633c1.528 0 2.767-1.239 2.767-2.768 0-1.529-1.239-2.769-2.767-2.769z"/></svg>`,
    link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    arrowUpRight: `<svg class="arrow-up-right-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>`
  };

  function t(key) {
    const dict = (window.UI_TRANSLATIONS && window.UI_TRANSLATIONS.en) || {};
    return dict[key] || key;
  }

  function loc(field) {
    if (field === null || field === undefined) return "";
    if (typeof field === "string") return field;
    if (typeof field === "object") {
      if (field.en !== undefined && field.en !== null && String(field.en).trim() !== "") {
        return field.en;
      }
      return field.ru || "";
    }
    return String(field);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderRichText(str) {
    if (!str) return "";
    const raw = String(str);
    // If string contains no HTML tags, escape and return
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
          // Preserve align attribute by converting it to style="text-align:..."
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
          // Strip unsafe attributes
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

  function getFieldAlignStyle(block, field) {
    if (block && block.fieldAlign && block.fieldAlign[field]) {
      return `text-align:${block.fieldAlign[field]};`;
    }
    return "";
  }

  function extractYoutubeId(input) {
    if (!input) return "";
    const str = String(input).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const m = str.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : "";
  }

  function applyCustomThemeAndFonts() {
    document.documentElement.setAttribute("data-theme", state.theme);
    document.documentElement.setAttribute("lang", state.lang);

    const settings = state.siteData.settings || {};
    const colors =
      state.theme === "dark"
        ? settings.darkColors || {
            bg: "#191919",
            text: "#f0f0f0",
            muted: "#a8a8a8",
            accent: "#f0f0f0",
            btnBg: "#f0f0f0",
            btnText: "#191919",
            line: "#363636"
          }
        : settings.lightColors || {
            bg: "#ffffff",
            text: "#212121",
            muted: "#5f5f5f",
            accent: "#212121",
            btnBg: "#212121",
            btnText: "#ffffff",
            line: "#dcdcdc"
          };

    const rootStyle = document.documentElement.style;
    if (colors.bg) rootStyle.setProperty("--bg", colors.bg);
    if (colors.text) rootStyle.setProperty("--text", colors.text);
    if (colors.muted) rootStyle.setProperty("--muted", colors.muted);
    if (colors.accent) rootStyle.setProperty("--accent", colors.accent);
    if (colors.btnBg) rootStyle.setProperty("--btn-bg", colors.btnBg);
    if (colors.btnText) rootStyle.setProperty("--btn-text", colors.btnText);
    if (colors.line) rootStyle.setProperty("--line", colors.line);

    const fonts = settings.fonts || {};
    if (fonts.banner) rootStyle.setProperty("--font-banner", fonts.banner);
    if (fonts.heading) rootStyle.setProperty("--font-heading", fonts.heading);
    if (fonts.body) rootStyle.setProperty("--font-body", fonts.body);

    const iconEl = document.getElementById("theme-icon");
    if (iconEl) {
      iconEl.innerHTML = state.theme === "light" ? ICONS.moon : ICONS.sun;
    }
  }

  function renderHeaderAndFooter() {
    const profile = state.siteData.profile || {};
    const brandNameEl = document.getElementById("header-brand-name");
    const avatarEl = document.getElementById("header-avatar");
    if (brandNameEl && profile.artistName) brandNameEl.textContent = profile.artistName;
    if (avatarEl && profile.avatar) avatarEl.src = profile.avatar;

    const navEl = document.getElementById("main-nav");
    if (navEl) {
      const customPages = (state.siteData.customPages || []).filter((p) => p.showInNav !== false);

      let navHtml = `<a href="/" class="nav-item" data-route="/">${escapeHtml(t("navMain"))}</a>`;

      customPages.forEach((pg) => {
        navHtml += `<a href="/page/${encodeURIComponent(pg.slug)}" class="nav-item" data-route="/page/${escapeHtml(pg.slug)}">${escapeHtml(loc(pg.title))}</a>`;
      });

      navHtml += `
        <a href="/videos" class="nav-item" data-route="/videos">${escapeHtml(t("navVideos"))}</a>
        <a href="/thoughts" class="nav-item" data-route="/thoughts">${escapeHtml(t("navThoughts"))}</a>
      `;
      navEl.innerHTML = navHtml;
    }

    const socials = profile.socials || {};
    const footerSocials = document.getElementById("footer-socials");
    if (footerSocials) {
      let html = "";
      if (socials.instagram) {
        html += `<a href="${escapeHtml(socials.instagram)}" target="_blank" rel="noopener">Instagram (${escapeHtml(socials.instagramHandle || "@1arutyun")})</a>`;
      }
      if (socials.telegram) {
        html += `<a href="${escapeHtml(socials.telegram)}" target="_blank" rel="noopener">Telegram (${escapeHtml(socials.telegramHandle || "@u_aruta")})</a>`;
      }
      footerSocials.innerHTML = html;
    }
  }

  function bind3DCoverTilt(root = document) {
    const cards = root.querySelectorAll(".cover-3d-card[data-tilt='true']");
    cards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const pctX = x / rect.width;
        const pctY = y / rect.height;
        const rotateY = (pctX - 0.5) * 18;
        const rotateX = (0.5 - pctY) * 18;

        card.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
        card.style.setProperty("--glare-x", `${(pctX * 100).toFixed(1)}%`);
        card.style.setProperty("--glare-y", `${(pctY * 100).toFixed(1)}%`);
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      });
    });
  }

  /* ==========================================================================
     SEAMLESS BLOCK RENDERER (Supports all 13 standard blocks)
     ========================================================================== */

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

  function renderBlock(block) {
    if (!block || block.visible === false) return "";

    const widthPct = Number(block.widthPct) || 84;
    const padY = block.padY !== undefined ? Number(block.padY) : 28;
    const bgColor = block.bgColor && block.bgColor !== "transparent" ? block.bgColor : "transparent";
    const textColor = block.textColor ? `color:${block.textColor};` : "";
    const shapeClass = `shape-${block.shape || "sharp"}`;
    const maxPx = Math.round((1180 * widthPct) / 100);
    const isFullBleed = block.fullBleed || (block.type === "hero-banner" && block.fullBleed !== false);
    const fullBleedClass = isFullBleed ? "site-block-fullbleed" : "";

    const wrapStyle = `max-width:${isFullBleed ? "100%" : maxPx + "px"};width:${isFullBleed ? "100%" : widthPct + "%"};padding:${padY}px ${isFullBleed ? "0" : "24px"};background:${bgColor};${textColor}`;

    switch (block.type) {
      case "hero-banner": {
        const noImg = block.noImage === true || (!block.image && block.noImage !== false && block.id !== "block-banner");
        const bannerImg = noImg ? "" : block.image || (state.siteData.profile && state.siteData.profile.bannerImage) || "/assets/header_banner.jpg";
        const height = Number(block.height) || 230;
        const title = loc(block.title);
        const subtitle = loc(block.subtitle);
        const overlayOp = block.overlayOpacity !== undefined ? block.overlayOpacity : 0.18;
        const bannerStyle = noImg
          ? `min-height:${height}px;`
          : `min-height:${height}px;background-image:url('${escapeHtml(bannerImg)}');`;

        return `
          <section class="site-block ${fullBleedClass}" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            <div class="hero-banner-block ${noImg ? "no-banner-image" : ""} ${isFullBleed ? "" : shapeClass}" style="${bannerStyle}">
              ${noImg ? "" : `<div class="hero-banner-overlay" style="opacity:${overlayOp};"></div>`}
              <div class="hero-banner-content">
                ${title ? `<h1 class="hero-banner-title" style="${block.textColor ? `color:${block.textColor};` : ""}${getFieldAlignStyle(block, "title")}">${renderRichText(title)}</h1>` : ""}
                ${subtitle ? `<div class="hero-banner-subtitle" style="${getFieldAlignStyle(block, "subtitle")}">${renderRichText(subtitle)}</div>` : ""}
              </div>
            </div>
          </section>
        `;
      }

      case "socials-row": {
        const socials = (state.siteData.profile && state.siteData.profile.socials) || {};
        const heading = loc(block.title) || t("socialsHeading");
        const sub = loc(block.subtitle) || t("socialsSub");
        const igHandle = socials.instagramHandle || "@1arutyun";
        const tgHandle = socials.telegramHandle || "@u_aruta";

        return `
          <section class="site-block" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            <div class="socials-creative-wrap">
              <div class="socials-creative-header">
                <div class="socials-creative-title-group">
                  <div class="socials-wave-eq" aria-hidden="true">
                    <span></span><span></span><span></span><span></span><span></span>
                  </div>
                  <h2 class="socials-creative-heading" style="${getFieldAlignStyle(block, "title")}">${renderRichText(heading)}</h2>
                </div>
                <div class="socials-creative-sub" style="${getFieldAlignStyle(block, "subtitle")}">${renderRichText(sub)}</div>
              </div>

              <div class="socials-creative-grid">
                ${
                  socials.instagram
                    ? `<a href="${escapeHtml(socials.instagram)}" target="_blank" rel="noopener" class="social-portal-card">
                        <div class="social-portal-left">
                          <div class="social-orbit-ring">${ICONS.instagramColor}</div>
                          <div class="social-portal-info">
                            <span class="social-portal-tag">01 // ${escapeHtml(t("igCreativeTag"))}</span>
                            <span class="social-portal-handle">Instagram · ${escapeHtml(igHandle)}</span>
                            <span class="social-portal-desc">${escapeHtml(t("igCreativeDesc"))}</span>
                          </div>
                        </div>
                        <span class="social-portal-arrow">${ICONS.arrowUpRight}</span>
                      </a>`
                    : ""
                }
                ${
                  socials.telegram
                    ? `<a href="${escapeHtml(socials.telegram)}" target="_blank" rel="noopener" class="social-portal-card">
                        <div class="social-portal-left">
                          <div class="social-orbit-ring">${ICONS.telegramColor}</div>
                          <div class="social-portal-info">
                            <span class="social-portal-tag">02 // ${escapeHtml(t("tgCreativeTag"))}</span>
                            <span class="social-portal-handle">Telegram · ${escapeHtml(tgHandle)}</span>
                            <span class="social-portal-desc">${escapeHtml(t("tgCreativeDesc"))}</span>
                          </div>
                        </div>
                        <span class="social-portal-arrow">${ICONS.arrowUpRight}</span>
                      </a>`
                    : ""
                }
              </div>
            </div>
          </section>
        `;
      }

      case "split-content": {
        const isFeaturedRelBlock = block.id === "block-undefined-split" || block.isLatestReleaseBlock;
        const featRel = isFeaturedRelBlock ? getFeaturedRelease() : null;
        const ratio = Number(block.splitRatio) || 42;
        const isRight = block.layout === "image-right";
        const gridCols = isRight
          ? `minmax(0, ${100 - ratio}fr) minmax(0, ${ratio}fr)`
          : `minmax(0, ${ratio}fr) minmax(0, ${100 - ratio}fr)`;
        let images = Array.isArray(block.images) && block.images.length ? block.images : block.image ? [block.image] : [];
        if ((!images.length || !images[0]) && featRel && featRel.cover) {
          images = [featRel.cover];
        }
        const imgCountClass = images.length >= 3 ? "cols-3" : images.length === 2 ? "cols-2" : "cols-1";
        const nearAlignClass = isRight ? "align-near-left" : "align-near-right";
        const title = loc(block.title) || (featRel && featRel.title) || "";
        const subtitle =
          loc(block.subtitle) ||
          (featRel
            ? `${state.lang === "ru" ? "Последний релиз" : "Latest Release"}${featRel.releaseDate ? " - " + featRel.releaseDate : ""}`
            : "");
        const text =
          loc(block.text) ||
          (featRel && (loc(featRel.fullDesc) || loc(featRel.shortDesc))) ||
          "";
        const btnText = loc(block.buttonText);
        const linkUrl = block.linkUrl || (featRel && featRel.slug ? `/release/${featRel.slug}` : "");
        const tiltAttr = block.tilt3d !== false ? "true" : "false";
        const maxImgWidth = block.imageSize ? `max-width:${Number(block.imageSize)}px;` : "";
        const effectiveShapeClass = block.shape ? `shape-${block.shape}` : featRel && featRel.coverShape ? `shape-${featRel.coverShape}` : shapeClass;

        const imagesHtml = images.length
          ? `<div class="split-images-col ${imgCountClass} ${nearAlignClass}" style="${maxImgWidth}">
              ${images
                .filter(Boolean)
                .map((imgUrl) => {
                  const cardInner = `
                    <div class="cover-3d-stage">
                      <div class="cover-3d-card ${effectiveShapeClass}" data-tilt="${tiltAttr}">
                        <img src="${escapeHtml(imgUrl)}" alt="">
                        <div class="cover-3d-glare"></div>
                      </div>
                    </div>
                  `;
                  return linkUrl
                    ? `<a href="${escapeHtml(linkUrl)}" data-route="${escapeHtml(linkUrl)}">${cardInner}</a>`
                    : cardInner;
                })
                .join("")}
            </div>`
          : `<div></div>`;

        const textHtml = `
          <div class="split-text-col">
            ${
              title
                ? `<div class="${block.framedHeading !== false ? "framed-heading-box" : "unframed-heading-box"}" style="${getFieldAlignStyle(block, "title")}">
                    <h2 class="split-heading">${
                      linkUrl
                        ? `<a href="${escapeHtml(linkUrl)}" data-route="${escapeHtml(linkUrl)}">${renderRichText(title)}</a>`
                        : renderRichText(title)
                    }</h2>
                  </div>`
                : ""
            }
            ${subtitle ? `<div class="split-subtitle" style="${getFieldAlignStyle(block, "subtitle")}">${renderRichText(subtitle)}</div>` : ""}
            ${text ? `<div class="split-body-text" style="${getFieldAlignStyle(block, "text")}">${renderRichText(text)}</div>` : ""}
            ${
              btnText && linkUrl
                ? `<div style="margin-top:24px;${getFieldAlignStyle(block, "buttonText")}">
                    <a href="${escapeHtml(linkUrl)}" data-route="${escapeHtml(linkUrl)}" class="btn-flat">${renderRichText(btnText)}</a>
                  </div>`
                : ""
            }
          </div>
        `;

        return `
          <section class="site-block ${fullBleedClass}" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            <div class="split-content-inner" style="grid-template-columns:${gridCols};">
              ${isRight ? textHtml + imagesHtml : imagesHtml + textHtml}
            </div>
          </section>
        `;
      }

      case "text-block": {
        const title = loc(block.title);
        const text = loc(block.text);
        const align = block.align || "left";
        if (!title && !text) return "";
        return `
          <section class="site-block ${fullBleedClass}" style="${wrapStyle};text-align:${align};" data-block-id="${escapeHtml(block.id)}">
            ${
              title
                ? `<div class="${block.framedHeading ? "framed-heading-box" : "unframed-heading-box"}" style="${getFieldAlignStyle(block, "title")}">
                    <h2 class="split-heading" style="font-size:clamp(1.6rem, 3vw, 2.3rem);">${renderRichText(title)}</h2>
                  </div>`
                : ""
            }
            ${text ? `<div class="split-body-text" style="${getFieldAlignStyle(block, "text")}">${renderRichText(text)}</div>` : ""}
          </section>
        `;
      }

      case "multi-image": {
        const images = Array.isArray(block.images) ? block.images.filter(Boolean) : [];
        if (!images.length) return "";
        const cols = Number(block.columns) || Math.min(images.length, 3) || 1;
        const caption = loc(block.caption);
        return `
          <section class="site-block ${fullBleedClass}" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            <div class="gallery-grid" style="grid-template-columns:repeat(${cols}, 1fr);">
              ${images
                .map(
                  (src) => `
                <div class="cover-3d-stage">
                  <div class="cover-3d-card ${shapeClass}" data-tilt="${block.tilt3d ? "true" : "false"}">
                    <img src="${escapeHtml(src)}" alt="">
                    <div class="cover-3d-glare"></div>
                  </div>
                </div>`
                )
                .join("")}
            </div>
            ${caption ? `<div style="text-align:center;color:var(--muted);font-size:0.88rem;margin-top:12px;font-style:italic;${getFieldAlignStyle(block, "caption")}">${renderRichText(caption)}</div>` : ""}
          </section>
        `;
      }

      case "releases-list": {
        const allReleases = state.siteData.releases || [];
        const featRel = getFeaturedRelease();
        const hasFeaturedSplit = (state.siteData.blocks || []).some(
          (b) => b.visible !== false && b.type === "split-content" && (b.id === "block-undefined-split" || b.isLatestReleaseBlock)
        );
        const releasesToRender =
          hasFeaturedSplit && !block.showAll && featRel
            ? allReleases.filter((r) => r.slug !== featRel.slug)
            : allReleases;

        if (!releasesToRender.length) return "";

        const heading = loc(block.title);
        // When 3 or more releases exist, render a compact Discography Grid with Show More toggle to avoid page clutter!
        if (releasesToRender.length >= 3) {
          const initialLimit = 6;
          const isExpanded = !!state.expandedReleasesList;
          const visibleList = isExpanded ? releasesToRender : releasesToRender.slice(0, initialLimit);
          const hiddenCount = releasesToRender.length - visibleList.length;

          return `
            <section class="site-block ${fullBleedClass}" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
              ${heading ? `<div class="framed-heading-box" style="${getFieldAlignStyle(block, "title")}"><h2 class="split-heading" style="font-size:1.85rem;">${renderRichText(heading)}</h2></div>` : ""}
              <div class="releases-compact-grid">
                ${visibleList
                  .map(
                    (rel) => `
                  <a href="/release/${encodeURIComponent(rel.slug)}" data-route="/release/${escapeHtml(rel.slug)}" class="release-compact-card">
                    <div class="release-compact-cover shape-${escapeHtml(rel.coverShape || block.shape || "sharp")}">
                      ${
                        rel.cover
                          ? `<img src="${escapeHtml(rel.cover)}" alt="${escapeHtml(rel.title)}">`
                          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;color:var(--muted);">♪</div>`
                      }
                    </div>
                    <div>
                      <div class="release-compact-title">${escapeHtml(rel.title)}</div>
                      <div class="release-compact-meta">${escapeHtml(loc(rel.type))} · ${escapeHtml(rel.releaseDate || "")}</div>
                    </div>
                  </a>
                `
                  )
                  .join("")}
              </div>
              ${
                releasesToRender.length > initialLimit
                  ? `<div style="text-align:center;margin-top:24px;">
                      <button type="button" class="btn-outline" data-toggle-all-releases="true">
                        ${
                          isExpanded
                            ? state.lang === "ru"
                              ? "Свернуть список релизов ▴"
                              : "Show Fewer Releases ▴"
                            : state.lang === "ru"
                            ? `Показать все релизы (ещё ${hiddenCount}) ▾`
                            : `Show All Releases (+${hiddenCount} more) ▾`
                        }
                      </button>
                    </div>`
                  : ""
              }
            </section>
          `;
        }

        return `
          <section class="site-block ${fullBleedClass}" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            ${heading ? `<div class="framed-heading-box" style="${getFieldAlignStyle(block, "title")}"><h2 class="split-heading" style="font-size:1.85rem;">${renderRichText(heading)}</h2></div>` : ""}
            <div class="releases-seamless-list">
              ${releasesToRender
                .map(
                  (rel) => `
                <div class="release-seamless-row">
                  <a href="/release/${encodeURIComponent(rel.slug)}" data-route="/release/${escapeHtml(rel.slug)}" class="cover-3d-stage">
                    <div class="cover-3d-card shape-${escapeHtml(rel.coverShape || block.shape || "sharp")}" data-tilt="true">
                      <img src="${escapeHtml(rel.cover)}" alt="${escapeHtml(rel.title)}">
                      <div class="cover-3d-glare"></div>
                    </div>
                  </a>
                  <div>
                    <div class="framed-heading-box" style="margin-bottom:14px;padding:12px 0;">
                      <h3 class="split-heading" style="font-size:1.9rem;">
                        <a href="/release/${encodeURIComponent(rel.slug)}" data-route="/release/${escapeHtml(rel.slug)}">${escapeHtml(rel.title)}</a>
                      </h3>
                    </div>
                    <div class="split-subtitle" style="margin-bottom:12px;">${escapeHtml(loc(rel.type))} — ${escapeHtml(rel.releaseDate)}</div>
                    <div class="split-body-text" style="margin-bottom:18px;">${renderRichText(loc(rel.shortDesc))}</div>
                    <a href="/release/${encodeURIComponent(rel.slug)}" data-route="/release/${escapeHtml(rel.slug)}" class="btn-flat">${escapeHtml(t("exploreRelease"))} →</a>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </section>
        `;
      }

      case "streaming-links": {
        const relSlug = block.releaseSlug || ((state.siteData.releases || [])[0] && state.siteData.releases[0].slug);
        const rel = (state.siteData.releases || []).find((r) => r.slug === relSlug) || (state.siteData.releases || [])[0];
        const platforms = (block.platforms && block.platforms.length ? block.platforms : rel ? rel.platforms : []) || [];
        const title = loc(block.title);
        if (!platforms.length) return "";
        return `
          <section class="site-block ${fullBleedClass}" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            ${title ? `<h3 style="font-family:var(--font-heading);font-size:1.25rem;margin-bottom:14px;${getFieldAlignStyle(block, "title")}">${renderRichText(title)}</h3>` : ""}
            <div class="platforms-grid-clean">
              ${platforms
                .map(
                  (p) => `
                <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="platform-clean-link">
                  <span class="platform-clean-left">
                    ${ICONS[p.icon] || ICONS.link}
                    <span>${escapeHtml(p.name)}</span>
                  </span>
                  <span class="platform-clean-arrow">${ICONS.arrowUpRight}</span>
                </a>`
                )
                .join("")}
            </div>
          </section>
        `;
      }

      case "video-block": {
        const title = loc(block.title);
        const desc = loc(block.text);
        const ytId = extractYoutubeId(block.videoUrl || block.youtubeId);
        if (!ytId && !block.videoUrl) return "";
        return `
          <section class="site-block ${fullBleedClass}" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            ${title ? `<h3 style="font-family:var(--font-heading);font-size:1.35rem;margin-bottom:14px;${getFieldAlignStyle(block, "title")}">${renderRichText(title)}</h3>` : ""}
            <div class="video-player-frame ${shapeClass}">
              ${
                ytId
                  ? `<iframe src="https://www.youtube.com/embed/${escapeHtml(ytId)}?rel=0" title="${escapeHtml(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
                  : `<video src="${escapeHtml(block.videoUrl)}" controls playsinline preload="metadata"></video>`
              }
            </div>
            ${desc ? `<div class="split-body-text" style="margin-top:12px;color:var(--muted);${getFieldAlignStyle(block, "text")}">${renderRichText(desc)}</div>` : ""}
          </section>
        `;
      }

      case "next-release": {
        const title = loc(block.title);
        if (!title) return "";
        return `
          <section class="site-block ${fullBleedClass}" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            <div class="next-release-line" style="${getFieldAlignStyle(block, "title")}">${renderRichText(title)}</div>
          </section>
        `;
      }

      case "framed-quote": {
        const quote = loc(block.text || block.title);
        const author = loc(block.subtitle);
        if (!quote) return "";
        return `
          <section class="site-block ${fullBleedClass}" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            <blockquote class="framed-quote-block" style="${getFieldAlignStyle(block, "text")}">
              ${renderRichText(quote)}
              ${author ? `<footer style="margin-top:10px;font-size:0.9rem;color:var(--muted);font-style:normal;${getFieldAlignStyle(block, "subtitle")}">${renderRichText(author)}</footer>` : ""}
            </blockquote>
          </section>
        `;
      }

      case "two-col-text": {
        const title = loc(block.title);
        const leftText = loc(block.leftText || block.text);
        const rightText = loc(block.rightText || block.subtitle);
        if (!title && !leftText && !rightText) return "";
        return `
          <section class="site-block ${fullBleedClass}" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            ${title ? `<div class="framed-heading-box" style="${getFieldAlignStyle(block, "title")}"><h2 class="split-heading" style="font-size:1.8rem;">${renderRichText(title)}</h2></div>` : ""}
            <div class="two-col-text-grid">
              <div class="split-body-text" style="${getFieldAlignStyle(block, "leftText")}">${renderRichText(leftText)}</div>
              <div class="split-body-text" style="${getFieldAlignStyle(block, "rightText")}">${renderRichText(rightText)}</div>
            </div>
          </section>
        `;
      }

      case "action-button": {
        const label = loc(block.buttonText || block.title);
        const url = block.linkUrl || "/";
        const align = (block.fieldAlign && block.fieldAlign.buttonText) || block.align || "center";
        const styleClass = block.btnStyle === "outline" ? "btn-outline" : "btn-flat";
        if (!label) return "";
        const isExternal = /^https?:\/\//i.test(url);
        return `
          <section class="site-block" style="${wrapStyle};text-align:${align};" data-block-id="${escapeHtml(block.id)}">
            <a href="${escapeHtml(url)}" ${isExternal ? 'target="_blank" rel="noopener"' : `data-route="${escapeHtml(url)}"`} class="${styleClass}">
              ${renderRichText(label)}
            </a>
          </section>
        `;
      }

      case "divider-spacer": {
        const showLine = block.showLine !== false;
        return `
          <section class="site-block" style="${wrapStyle}" data-block-id="${escapeHtml(block.id)}">
            ${showLine ? `<hr style="border:none;border-top:1px solid var(--line);">` : ""}
          </section>
        `;
      }

      default:
        return "";
    }
  }

  /* ==========================================================================
     PAGE VIEWS: MAIN, CUSTOM PAGE, RELEASE PAGE, VIDEOS, THOUGHTS
     ========================================================================== */

  function renderMainPage() {
    const blocks = state.siteData.blocks || [];
    return `
      <div class="seamless-blocks-flow">
        ${blocks.map((b) => renderBlock(b)).join("")}
      </div>
    `;
  }

  function renderCustomPage(slug) {
    const pages = state.siteData.customPages || [];
    const page = pages.find((p) => p.slug === slug);
    if (!page) return renderMainPage();

    const blocks = page.blocks || [];
    return `
      <div class="seamless-blocks-flow">
        ${
          blocks.length
            ? blocks.map((b) => renderBlock(b)).join("")
            : `<div class="container" style="padding:64px 28px;text-align:center;color:var(--muted);">
                <h1 class="split-heading" style="margin-bottom:14px;">${escapeHtml(loc(page.title))}</h1>
                <p>${state.lang === "ru" ? "Страница пока пуста." : "This page has no blocks yet."}</p>
              </div>`
        }
      </div>
    `;
  }

  function renderReleasePage(slug) {
    const releases = state.siteData.releases || [];
    const rel = releases.find((r) => r.slug === slug) || releases[0];
    if (!rel) return renderMainPage();

    const allVideos = state.siteData.videos || [];
    const rawRelVideos = Array.isArray(rel.videoIds)
      ? rel.videoIds.map((vidId) => allVideos.find((v) => v.id === vidId)).filter(Boolean)
      : allVideos.filter((v) => v.releaseSlug === rel.slug);

    const relVideos = rawRelVideos.filter((v) => {
      if (v.type === "file") return !!v.videoUrl;
      return !!extractYoutubeId(v.youtubeId || v.videoUrl);
    });

    const extraBlocks = rel.extraBlocks || [];
    const shapeClass = `shape-${rel.coverShape || "sharp"}`;

    return `
      <div class="release-page-wrap container">
        <div style="margin-bottom:18px;">
          <a href="/" data-route="/" class="btn-outline">${escapeHtml(t("backToMain"))}</a>
        </div>

        <div class="release-top-split">
          <div class="cover-3d-stage">
            <div class="cover-3d-card ${shapeClass}" data-tilt="true">
              <img src="${escapeHtml(rel.cover)}" alt="${escapeHtml(rel.title)}">
              <div class="cover-3d-glare"></div>
            </div>
          </div>

          <div>
            <div class="framed-heading-box">
              <h1 class="split-heading">${escapeHtml(rel.title)}</h1>
            </div>
            <div class="split-subtitle">
              ${escapeHtml(loc(rel.type))} — ${escapeHtml(rel.releaseDate)}
              ${loc(rel.recordedInfo) ? ` · ${escapeHtml(loc(rel.recordedInfo))}` : ""}
            </div>

            <div class="split-body-text" style="margin-bottom:20px;">${renderRichText(loc(rel.fullDesc || rel.shortDesc))}</div>

            ${
              (rel.tracks || []).length
                ? `<div style="margin-bottom:24px;">
                    <div style="font-family:var(--font-mono);font-size:0.76rem;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">${escapeHtml(t("tracksLabel"))}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                      ${rel.tracks.map((tr, i) => `<span style="padding:4px 12px;border:1px solid var(--line);font-size:0.86rem;">0${i + 1}. ${escapeHtml(tr)}</span>`).join("")}
                    </div>
                  </div>`
                : ""
            }

            <div style="font-family:var(--font-mono);font-size:0.76rem;color:var(--muted);text-transform:uppercase;">
              ${escapeHtml(t("tapPlatform"))}
            </div>
            <div class="platforms-grid-clean">
              ${(rel.platforms || [])
                .map(
                  (p) => `
                <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="platform-clean-link">
                  <span class="platform-clean-left">
                    ${ICONS[p.icon] || ICONS.link}
                    <span>${escapeHtml(p.name)}</span>
                  </span>
                  <span class="platform-clean-arrow">${ICONS.arrowUpRight}</span>
                </a>
              `
                )
                .join("")}
            </div>

            ${
              loc(rel.thanksMessage)
                ? `<div style="margin-top:24px;font-style:italic;color:var(--muted);">${renderRichText(loc(rel.thanksMessage))}</div>`
                : ""
            }
          </div>
        </div>

        ${
          extraBlocks.length
            ? `<div class="seamless-blocks-flow" style="margin:32px 0;">
                ${extraBlocks.map((b) => renderBlock(b)).join("")}
              </div>`
            : ""
        }

        ${
          relVideos.length
            ? `<div style="margin-top:48px;">
                <div class="framed-heading-box">
                  <h2 class="split-heading" style="font-size:1.75rem;">${escapeHtml(t("releaseVideosHeading"))}</h2>
                </div>
                <div class="video-catalog-grid" style="margin-top:24px;">
                  ${relVideos
                    .map((v) => {
                      const ytId = extractYoutubeId(v.youtubeId || v.videoUrl);
                      return `
                        <div>
                          <div class="video-player-frame">
                            ${
                              v.type === "file"
                                ? `<video src="${escapeHtml(v.videoUrl)}" poster="${escapeHtml(v.thumbnail || "")}" controls playsinline preload="metadata"></video>`
                                : `<iframe src="https://www.youtube.com/embed/${escapeHtml(ytId)}?rel=0" title="${escapeHtml(loc(v.title))}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
                            }
                          </div>
                          <div style="margin-top:10px;font-family:var(--font-heading);font-weight:600;font-size:0.95rem;">
                            ${escapeHtml(loc(v.title))}
                          </div>
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              </div>`
            : ""
        }
      </div>
    `;
  }

  function renderVideosPage() {
    const videos = state.siteData.videos || [];
    if (!videos.length) {
      return `<div class="container videos-page-wrap"><p>${escapeHtml(t("emptyVideos"))}</p></div>`;
    }

    const activeVid = videos.find((v) => v.id === state.activeVideoId) || videos[0];
    state.activeVideoId = activeVid.id;
    const activeYtId = extractYoutubeId(activeVid.youtubeId || activeVid.videoUrl);

    return `
      <div class="container videos-page-wrap">
        <div class="framed-heading-box">
          <h1 class="split-heading">${escapeHtml(t("videosPageTitle"))}</h1>
        </div>

        <div style="margin-top:24px;">
          <div class="video-player-frame" id="cinema-stage">
            ${
              activeVid.type === "file"
                ? `<video src="${escapeHtml(activeVid.videoUrl)}" poster="${escapeHtml(activeVid.thumbnail || "")}" controls autoplay playsinline></video>`
                : `<iframe src="https://www.youtube.com/embed/${escapeHtml(activeYtId)}?rel=0" title="${escapeHtml(loc(activeVid.title))}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
            }
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:16px;">
            <div>
              <h2 style="font-family:var(--font-heading);font-size:1.3rem;font-weight:700;">${escapeHtml(loc(activeVid.title))}</h2>
              ${loc(activeVid.desc) ? `<p style="color:var(--muted);margin-top:4px;">${escapeHtml(loc(activeVid.desc))}</p>` : ""}
            </div>
            ${
              activeVid.type !== "file" && activeYtId
                ? `<a href="https://www.youtube.com/watch?v=${escapeHtml(activeYtId)}" target="_blank" rel="noopener" class="btn-outline" style="display:inline-flex;align-items:center;gap:6px;"><span>${escapeHtml(t("watchOnYoutube"))}</span>${ICONS.arrowUpRight}</a>`
                : ""
            }
          </div>
        </div>

        <div class="video-catalog-grid">
          ${videos
            .map((v) => {
              const isPlaying = v.id === activeVid.id;
              const ytId = extractYoutubeId(v.youtubeId || v.videoUrl);
              const thumb = v.thumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : "/assets/undefined_album_cover.jpg");
              return `
                <div class="video-card-clean" data-video-select="${escapeHtml(v.id)}">
                  <div class="video-card-thumb" style="${isPlaying ? "outline:2px solid var(--text);" : ""}">
                    <img src="${escapeHtml(thumb)}" alt="${escapeHtml(loc(v.title))}">
                    <span class="video-badge-status">${escapeHtml(isPlaying ? t("nowPlayingVideo") : t("selectToPlay"))}</span>
                  </div>
                  <div style="font-family:var(--font-heading);font-weight:600;font-size:0.95rem;">${escapeHtml(loc(v.title))}</div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  /* Requirement #10: Thoughts / Posts page keeps clear borders around post blocks */
  function renderThoughtsPage() {
    const profile = state.siteData.profile || {};
    const socials = profile.socials || {};
    const rawPosts = (state.siteData.posts || []).slice();
    rawPosts.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date) - new Date(a.date);
    });

    return `
      <div class="container thoughts-page-wrap">
        <div class="framed-heading-box" style="margin-bottom:28px;">
          <h1 class="split-heading">${escapeHtml(t("thoughtsPageTitle"))}</h1>
        </div>

        <div class="thoughts-grid">
          <aside class="channel-profile-box">
            <img src="${escapeHtml(profile.avatar || "/assets/logo_or_avatar.jpg")}" alt="${escapeHtml(profile.artistName)}" style="width:64px;height:64px;object-fit:cover;margin-bottom:12px;">
            <div style="font-family:var(--font-heading);font-weight:700;font-size:1.15rem;">${escapeHtml(profile.artistName || "1arutyun")}</div>
            <div style="font-family:var(--font-mono);font-size:0.78rem;color:var(--muted);margin-bottom:16px;">${escapeHtml(socials.telegramHandle || "@u_aruta")}</div>
            ${
              socials.telegram
                ? `<a href="${escapeHtml(socials.telegram)}" target="_blank" rel="noopener" class="btn-flat" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:6px;"><span>${escapeHtml(t("openTelegram"))}</span>${ICONS.arrowUpRight}</a>`
                : ""
            }
          </aside>

          <div class="posts-bordered-list">
            ${
              rawPosts.length
                ? rawPosts
                    .map((post) => {
                      const d = new Date(post.date);
                      const dateStr = isNaN(d.getTime())
                        ? post.date
                        : d.toLocaleDateString(state.lang === "ru" ? "ru-RU" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          });
                      const reacted = !!state.reactedPosts[post.id];
                      return `
                        <article class="post-bordered-card">
                          <div class="post-meta-line">
                            <span>${escapeHtml(dateStr)}</span>
                            ${post.pinned ? `<span style="padding:2px 8px;border:1px solid var(--line);">📌 ${escapeHtml(t("pinnedPost"))}</span>` : ""}
                          </div>
                          ${loc(post.title) ? `<h2 class="post-card-title">${renderRichText(loc(post.title))}</h2>` : ""}
                          <div class="post-card-text">${renderRichText(loc(post.text))}</div>
                          ${
                            post.mediaUrl
                              ? `<div class="post-card-media">
                                  ${
                                    post.mediaType === "video"
                                      ? `<video src="${escapeHtml(post.mediaUrl)}" controls playsinline preload="metadata"></video>`
                                      : `<img src="${escapeHtml(post.mediaUrl)}" alt="">`
                                  }
                                </div>`
                              : ""
                          }
                          <button type="button" class="reaction-flat-btn ${reacted ? "reacted" : ""}" data-react-post="${escapeHtml(post.id)}">
                            <span>🤍</span>
                            <span>${Number(post.reactions || 0)}</span>
                          </button>
                        </article>
                      `;
                    })
                    .join("")
                : `<div class="post-bordered-card">${escapeHtml(t("emptyPosts"))}</div>`
            }
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     ROUTER, SCROLL MEMORY & EVENT DELEGATION
     ========================================================================== */

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  let scrollPositions = {};
  try {
    scrollPositions = JSON.parse(sessionStorage.getItem("1arutyun_scroll_positions_v1") || "{}") || {};
  } catch (e) {
    scrollPositions = {};
  }
  let isRestoringScroll = false;

  function normalizePath(p) {
    if (!p || p === "/") return "/";
    return p.replace(/\/$/, "");
  }

  function saveScrollPosition(path = window.location.pathname) {
    if (isRestoringScroll) return;
    const key = normalizePath(path);
    scrollPositions[key] = window.scrollY;
    try {
      sessionStorage.setItem("1arutyun_scroll_positions_v1", JSON.stringify(scrollPositions));
    } catch (e) {}
  }

  function restoreScrollForPath(path = window.location.pathname) {
    const key = normalizePath(path);
    const targetY = typeof scrollPositions[key] === "number" ? scrollPositions[key] : 0;
    isRestoringScroll = true;
    window.scrollTo(0, targetY);
    requestAnimationFrame(() => {
      window.scrollTo(0, targetY);
      setTimeout(() => {
        isRestoringScroll = false;
      }, 60);
    });
  }

  function getRoute() {
    const path = window.location.pathname || "/";
    if (path.startsWith("/release/")) {
      return { view: "release", slug: decodeURIComponent(path.replace("/release/", "").replace(/\/$/, "")) };
    }
    if (path.startsWith("/page/")) {
      return { view: "page", slug: decodeURIComponent(path.replace("/page/", "").replace(/\/$/, "")) };
    }
    if (path === "/videos" || path === "/videos/") return { view: "videos" };
    if (path === "/thoughts" || path === "/thoughts/") return { view: "thoughts" };
    return { view: "main" };
  }

  function renderCurrentRoute(options = {}) {
    const root = document.getElementById("app-root");
    if (!root) return;

    const prevScrollY = window.scrollY;
    renderHeaderAndFooter();
    applyCustomThemeAndFonts();

    const route = getRoute();
    const currentPath = normalizePath(window.location.pathname);

    document.querySelectorAll("#main-nav .nav-item").forEach((a) => {
      const r = normalizePath(a.getAttribute("data-route"));
      a.classList.toggle("active", r === currentPath);
    });

    if (route.view === "release") {
      root.innerHTML = renderReleasePage(route.slug);
    } else if (route.view === "page") {
      root.innerHTML = renderCustomPage(route.slug);
    } else if (route.view === "videos") {
      root.innerHTML = renderVideosPage();
    } else if (route.view === "thoughts") {
      root.innerHTML = renderThoughtsPage();
    } else {
      root.innerHTML = renderMainPage();
    }

    bind3DCoverTilt(root);

    if (options.preserveScroll) {
      isRestoringScroll = true;
      window.scrollTo(0, prevScrollY);
      requestAnimationFrame(() => {
        window.scrollTo(0, prevScrollY);
        isRestoringScroll = false;
      });
    } else if (options.restoreScroll !== false) {
      restoreScrollForPath(currentPath);
    }
  }

  function navigateTo(url) {
    if (!url) return;
    const fromPath = normalizePath(window.location.pathname);
    const toPath = normalizePath(url);
    saveScrollPosition(fromPath);
    if (fromPath === toPath) {
      renderCurrentRoute({ preserveScroll: true });
      return;
    }
    window.history.pushState({ path: url }, "", url);
    renderCurrentRoute({ restoreScroll: true });
  }

  async function init() {
    try {
      const res = await fetch(`/api/site?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        state.siteData = await res.json();
      }
    } catch (e) {
      // Uses fallback window.DEFAULT_SITE_DATA
    }

    state.lang = "en";
    if (!localStorage.getItem("1arutyun_theme_v3")) {
      state.theme = (state.siteData.settings && state.siteData.settings.defaultTheme) || "light";
    }

    renderCurrentRoute({ restoreScroll: true });

    window.addEventListener("popstate", () => {
      renderCurrentRoute({ restoreScroll: true });
    });

    window.addEventListener(
      "scroll",
      () => {
        const header = document.getElementById("site-header");
        if (header) header.classList.toggle("scrolled", window.scrollY > 10);
        saveScrollPosition(window.location.pathname);
      },
      { passive: true }
    );

    document.addEventListener("click", async (e) => {
      const toggleAllRel = e.target.closest("[data-toggle-all-releases]");
      if (toggleAllRel) {
        state.expandedReleasesList = !state.expandedReleasesList;
        renderCurrentRoute({ preserveScroll: true });
        return;
      }

      const routeLink = e.target.closest("[data-route]");
      if (routeLink) {
        e.preventDefault();
        const nav = document.getElementById("main-nav");
        if (nav) nav.classList.remove("open");
        navigateTo(routeLink.getAttribute("data-route"));
        return;
      }

      const themeBtn = e.target.closest("#theme-toggle-btn");
      if (themeBtn) {
        state.theme = state.theme === "light" ? "dark" : "light";
        localStorage.setItem("1arutyun_theme_v3", state.theme);
        applyCustomThemeAndFonts();
        return;
      }

      const mobileBtn = e.target.closest("#mobile-menu-btn");
      if (mobileBtn) {
        const nav = document.getElementById("main-nav");
        if (nav) nav.classList.toggle("open");
        return;
      }

      const vidSelect = e.target.closest("[data-video-select]");
      if (vidSelect) {
        state.activeVideoId = vidSelect.getAttribute("data-video-select");
        renderCurrentRoute({ preserveScroll: true });
        const stage = document.getElementById("cinema-stage");
        if (stage) stage.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const reactBtn = e.target.closest("[data-react-post]");
      if (reactBtn) {
        const postId = reactBtn.getAttribute("data-react-post");
        if (state.reactedPosts[postId]) return;
        state.reactedPosts[postId] = true;
        localStorage.setItem("1arutyun_reacted_posts", JSON.stringify(state.reactedPosts));
        const post = (state.siteData.posts || []).find((p) => p.id === postId);
        if (post) post.reactions = (post.reactions || 0) + 1;
        renderCurrentRoute({ preserveScroll: true });
        try {
          await fetch("/api/reaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId })
          });
        } catch (err) {}
      }
    });

    // Secret Owner Shortcuts to /admin (Requirement #1: No visible Admin button)
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a" || e.key === "Ф" || e.key === "ф")) {
        e.preventDefault();
        window.location.href = "/admin";
      }
    });

    let copyClicks = 0;
    let copyTimer = null;
    const footerCopy = document.getElementById("footer-copy");
    if (footerCopy) {
      footerCopy.addEventListener("click", () => {
        copyClicks += 1;
        clearTimeout(copyTimer);
        if (copyClicks >= 3) {
          copyClicks = 0;
          window.location.href = "/admin";
        } else {
          copyTimer = setTimeout(() => {
            copyClicks = 0;
          }, 700);
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
