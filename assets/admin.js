/* CMS: tạo, sửa, xóa thiệp; tải ảnh; xem trước trực tiếp; quản lý lời chúc.
   Admin: toàn quyền + cấp mã kích hoạt. Khách: đăng ký → nhập mã → chỉ sửa đúng 1 thiệp của mình. */
(function () {
  const S = window.Store;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const COLORS = ["#010e52", "#7a1f2b", "#2f5d50", "#5b3a7a", "#8a5a22", "#c2577a", "#2b2b2b"];

  // [khóa, nhãn, kiểu, gợi ý, "half" = xếp 2 cột]
  // khóa bắt đầu bằng "_" là cột của bảng (slug, published), còn lại nằm trong data
  const GROUPS = [
    { title: "Thông tin thiệp", open: true, items: [
      ["name", "Tên người tốt nghiệp", "text"],
      ["_slug", "Tên link", "slug", "Chữ thường không dấu, số và dấu gạch ngang. Ví dụ: bich-ngoc"],
      ["_published", "Hiện công khai", "toggle", "Tắt đi thì người khác mở link sẽ không thấy thiệp."],
      ["accent", "Màu chủ đạo", "color"]
    ] },
    { title: "Trường học", items: [
      ["logo", "Logo trường", "image"],
      ["schoolVi", "Tên trường (tiếng Việt)", "text", "", "half"],
      ["schoolEn", "Tên trường (tiếng Anh)", "text", "", "half"]
    ] },
    { title: "Ảnh bìa", items: [
      ["hero", "Ảnh chính", "image", "Ảnh dọc đẹp nhất (khoảng 2:3)."],
      ["titleBig", "Chữ lớn", "text", "", "half"],
      ["titleScript", "Chữ viết tay", "text", "", "half"],
      ["tagline", "Câu dưới ảnh", "textarea"]
    ] },
    { title: "Ngày giờ", items: [
      ["date", "Ngày tốt nghiệp", "date", "", "half"],
      ["timeText", "Giờ", "text", "Ví dụ: 17:30 - 19:30", "half"],
      ["wide", "Ảnh ngang dưới lịch", "image"]
    ] },
    { title: "Thanh Xuân (cuộn phim)", items: [
      ["youthTitle1", "Tiêu đề dòng 1", "text", "", "half"],
      ["youthTitle2", "Tiêu đề dòng 2", "text", "", "half"],
      ["film", "Ảnh trong cuộn phim", "images", "Nên từ 4 ảnh trở lên, ảnh ngang đẹp nhất."],
      ["filmBig", "Ảnh lớn bên phải", "image", "Ảnh dọc."]
    ] },
    { title: "Địa điểm", items: [
      ["venue", "Tên địa điểm", "text"],
      ["address", "Địa chỉ", "textarea"],
      ["mapQuery", "Từ khóa bản đồ", "text", "Để trống sẽ tìm theo tên + địa chỉ. Có thể dán toạ độ, ví dụ: 10.7626, 106.6602"]
    ] },
    { title: "Lưu bút", items: [
      ["letter", "Nội dung", "textarea-tall", "Cách một dòng trống để sang đoạn mới. Để trống sẽ ẩn phần này."],
      ["signature", "Chữ ký", "text", "Để trống sẽ dùng tên người tốt nghiệp."]
    ] },
    { title: "Album ảnh", items: [
      ["albumTitle", "Tiêu đề", "text"],
      ["album", "Ảnh album", "images", "Cứ 3 ảnh thành một cụm: 2 ảnh nhỏ ở trên, 1 ảnh ngang ở dưới."]
    ] },
    { title: "Lời nhắn", items: [
      ["wishTitle", "Tiêu đề", "text"],
      ["_wishes", "Lời chúc đã nhận", "wishes"]
    ] },
    { title: "Lời cảm ơn cuối thiệp", items: [
      ["thanksImage", "Ảnh nền", "image"],
      ["thanksTitle", "Tiêu đề", "text"],
      ["thanksText", "Nội dung", "textarea"]
    ] },
    { title: "Nhạc nền", items: [
      ["music", "File nhạc", "audio", "MP3, nên dưới 10MB. Nhạc phát khi khách chạm vào thiệp lần đầu."]
    ] }
  ];
  const ITEM = Object.fromEntries(GROUPS.flatMap(g => g.items).map(it => [it[0], it]));

  const state = { list: [], cur: null, dirty: false, busy: {}, wishes: [], previewReady: false, role: "admin", codes: [] };
  const isCustomer = () => state.role === "customer";

  /* ---------- tiện ích ---------- */
  let toastT;
  function toast(msg, bad) {
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (bad ? " bad" : "");
    clearTimeout(toastT);
    toastT = setTimeout(() => (t.className = "toast"), bad ? 4500 : 2200);
  }
  function friendlyError(e) {
    const m = String((e && (e.message || e.error_description)) || e);
    if (/duplicate|unique/i.test(m)) return "Tên link này đã có thiệp khác dùng rồi, hãy đổi tên link.";
    if (/row-level security|permission|not authorized|403/i.test(m)) return isCustomer() ? "Bạn không có quyền làm việc này." : "Tài khoản này chưa có quyền admin. Xem bước 4 trong HUONG-DAN.md.";
    if (/Invalid login/i.test(m)) return "Sai email hoặc mật khẩu.";
    if (/already registered|already been registered/i.test(m)) return "Email này đã đăng ký rồi, hãy chuyển sang Đăng nhập.";
    if (/Signups not allowed|signup.*disabled/i.test(m)) return "Trang chưa mở đăng ký. Admin cần bật cho phép đăng ký trong Supabase.";
    if (/Email not confirmed/i.test(m)) return "Email chưa được xác nhận. Mở hộp thư và bấm link xác nhận trước nhé.";
    if (/Password should be at least|weak password/i.test(m)) return "Mật khẩu tối thiểu 6 ký tự.";
    if (/rate limit/i.test(m)) return "Thao tác quá nhiều lần, đợi một lát rồi thử lại.";
    if (/Failed to fetch|NetworkError/i.test(m)) return "Mất kết nối mạng, thử lại nhé.";
    if (/exceeded the maximum allowed size|too large/i.test(m)) return "File quá lớn.";
    return m;
  }
  const baseUrl = () => location.origin + location.pathname.replace(/[^/]*$/, "");
  const publicLink = slug => (location.hostname.endsWith("github.io") ? baseUrl() + slug : baseUrl() + "?id=" + encodeURIComponent(slug));

  function pickFiles(accept, multiple) {
    return new Promise(resolve => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = accept; inp.multiple = !!multiple;
      inp.onchange = () => resolve([...inp.files]);
      inp.click();
    });
  }

  const get = k => (k[0] === "_" ? state.cur[k.slice(1)] : state.cur.data[k]);
  function set(k, v) {
    if (k[0] === "_") state.cur[k.slice(1)] = v; else state.cur.data[k] = v;
    markDirty();
  }
  function markDirty(on = true) {
    state.dirty = on;
    $("dirtyDot").hidden = !on;
    if (on) sendPreview();
  }

  /* ---------- danh sách thiệp ---------- */
  function renderList() {
    const box = $("invList");
    if (!state.list.length) { box.innerHTML = `<div class="list-empty">Chưa có thiệp nào.</div>`; return; }
    box.innerHTML = state.list.map(i => `
      <button class="inv-item${state.cur && state.cur.id === i.id ? " active" : ""}" data-id="${i.id}">
        <b>${esc((i.data && i.data.name) || i.title || i.slug)}</b>
        <small><span class="dot${i.published ? "" : " off"}"></span>${esc(i.slug)}</small>
        ${i.owner_email ? `<span class="owner">👤 ${esc(i.owner_email)}</span>` : ""}
      </button>`).join("");
  }
  $("invList").addEventListener("click", e => {
    const b = e.target.closest(".inv-item");
    if (!b || (state.cur && b.dataset.id === state.cur.id)) return;
    if (state.dirty && !confirm("Thiệp đang sửa chưa lưu. Bỏ các thay đổi?")) return;
    select(state.list.find(i => i.id === b.dataset.id));
  });

  async function loadList() {
    try { state.list = await S.listInvitations(); }
    catch (e) { toast(friendlyError(e), true); state.list = []; }
    renderList();
  }

  function uniqueSlug(name) {
    const base = S.slugify(name) || "thiep";
    let s = base, n = 2;
    while (state.list.some(i => i.slug === s)) s = `${base}-${n++}`;
    return s;
  }

  /* ---------- chọn thiệp ---------- */
  function select(inv) {
    state.cur = inv ? JSON.parse(JSON.stringify({ ...inv, data: S.withDefaults(inv.data) })) : null;
    state.busy = {};
    markDirty(false);
    $("codesBody").hidden = true;
    $("emptyState").hidden = !!inv;
    $("editorBody").hidden = !inv;
    renderList();
    if (!inv) return;
    renderForm();
    renderHeader();
    loadWishes();
    sendPreview(true);
  }
  function renderHeader() {
    $("edTitle").textContent = state.cur.data.name || state.cur.slug;
    const link = publicLink(state.cur.slug);
    $("linkText").textContent = link;
    $("linkText").href = link;
    $("openBtn").href = link;
  }

  /* ---------- form ---------- */
  function fieldHtml(it) {
    const [k, label, type, hint] = it;
    const v = get(k);
    const h = hint ? `<small class="hint">${esc(hint)}</small>` : "";
    let inner = "";
    switch (type) {
      case "text":
        inner = `<input type="text" data-k="${k}" value="${esc(v)}">`; break;
      case "date":
        inner = `<input type="date" data-k="${k}" value="${esc(v)}">`; break;
      case "textarea":
      case "textarea-tall":
        inner = `<textarea data-k="${k}" class="${type === "textarea-tall" ? "tall" : ""}">${esc(v)}</textarea>`; break;
      case "slug":
        inner = `<div class="slug-wrap"><span title="${esc(baseUrl())}">${esc(baseUrl().replace(/^https?:\/\//, ""))}</span><input type="text" data-k="${k}" value="${esc(v)}" spellcheck="false" ${isCustomer() ? "disabled" : ""}></div>`;
        if (isCustomer()) return `<div class="f" data-field="${k}"><span>${esc(label)}</span>${inner}<small class="hint">Tên link đã cố định. Liên hệ admin nếu cần đổi.</small></div>`;
        break;
      case "toggle":
        inner = `<label class="toggle"><input type="checkbox" data-k="${k}" ${v ? "checked" : ""}><i></i><span>${v ? "Đang hiện" : "Đang ẩn"}</span></label>`; break;
      case "color":
        inner = `<div class="colors">${COLORS.map(c => `<button type="button" class="swatch${c === v ? " on" : ""}" style="background:${c}" data-act="color" data-c="${c}" aria-label="${c}"></button>`).join("")}
          <input type="color" data-k="${k}" value="${esc(v)}" title="Chọn màu khác"></div>`; break;
      case "image": {
        const busy = state.busy[k];
        inner = `<div class="img-one">
          <div class="thumb${v ? " has" : ""}" data-act="pick" data-drop="${k}" tabindex="0">${v ? `<img src="${esc(v)}" alt="" style="width:100%;height:100%;object-fit:cover">` : "Bấm hoặc kéo ảnh vào đây"}${busy ? '<div class="busy"></div>' : ""}</div>
          <div class="img-actions">
            <button type="button" class="ghost sm" data-act="pick">${v ? "Đổi ảnh" : "Chọn ảnh"}</button>
            ${v ? `<button type="button" class="danger sm" data-act="clear">Xóa ảnh</button>` : ""}
          </div></div>`;
        break;
      }
      case "images": {
        const arr = v || [];
        inner = `<div class="multi">${arr.map((src, i) => `
          <div class="thumb has"><img src="${esc(src)}" alt="" style="width:100%;height:100%;object-fit:cover"><span class="num">${i + 1}</span>
            <div class="ctrl"><button type="button" data-act="left" data-i="${i}" aria-label="Sang trái">←</button><button type="button" class="rm" data-act="remove" data-i="${i}" aria-label="Xóa">×</button><button type="button" data-act="right" data-i="${i}" aria-label="Sang phải">→</button></div>
          </div>`).join("")}
          <div class="thumb add-tile" data-act="add" data-drop="${k}" tabindex="0">${state.busy[k] ? `Đang tải ${state.busy[k]}…<div class="busy"></div>` : "+ Thêm ảnh"}</div>
        </div>`;
        break;
      }
      case "audio":
        inner = `${v ? `<audio controls src="${esc(v)}"></audio>` : ""}
          <div class="img-actions" style="grid-auto-flow:column;justify-content:start">
            <button type="button" class="ghost sm" data-act="pick">${state.busy[k] ? "Đang tải…" : v ? "Đổi nhạc" : "Chọn file nhạc"}</button>
            ${v ? `<button type="button" class="danger sm" data-act="clear">Bỏ nhạc</button>` : ""}
          </div>
          <input type="url" data-k="${k}" value="${esc(v && !v.startsWith("data:") ? v : "")}" placeholder="hoặc dán link file mp3">`;
        break;
      case "wishes":
        inner = wishesHtml(); break;
    }
    return `<div class="f" data-field="${k}"><span>${esc(label)}</span>${inner}${h}</div>`;
  }

  function renderForm() {
    const form = $("form");
    const opened = new Set([...form.querySelectorAll("details[open]")].map(d => d.dataset.g));
    form.innerHTML = GROUPS.map((g, gi) => {
      let body = "", i = 0;
      while (i < g.items.length) {
        const it = g.items[i];
        if (it[4] === "half" && g.items[i + 1] && g.items[i + 1][4] === "half") {
          body += `<div class="row2">${fieldHtml(it)}${fieldHtml(g.items[i + 1])}</div>`; i += 2;
        } else { body += fieldHtml(it); i++; }
      }
      const isOpen = opened.size ? opened.has(String(gi)) : g.open;
      return `<details class="grp" data-g="${gi}" ${isOpen ? "open" : ""}><summary>${esc(g.title)}</summary><div class="grp-body">${body}</div></details>`;
    }).join("");
  }
  function rerenderField(k) {
    const el = $("form").querySelector(`[data-field="${k}"]`);
    if (el) el.outerHTML = fieldHtml(ITEM[k]);
  }

  $("form").addEventListener("input", e => {
    const el = e.target, k = el.dataset.k;
    if (!k) return;
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (k === "_slug") {
      v = v.toLowerCase().replace(/\s+/g, "-");
      if (v !== el.value) el.value = v;
    }
    set(k, v);
    if (k === "_published") rerenderField(k);
    if (k === "name" || k === "_slug") renderHeader();
  });
  $("form").addEventListener("change", e => {
    if (e.target.dataset.k === "music" || e.target.dataset.k === "accent") rerenderField(e.target.dataset.k);
    if (e.target.dataset.k === "_slug") {
      const v = S.slugify(e.target.value);
      e.target.value = v;
      set("_slug", v);
      renderHeader();
    }
  });

  $("form").addEventListener("click", async e => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    e.preventDefault();
    const k = btn.closest("[data-field]").dataset.field;
    const type = ITEM[k][2];
    const act = btn.dataset.act;
    if (act === "delwish") return deleteWish(btn.dataset.id);
    if (act === "color") { set(k, btn.dataset.c); rerenderField(k); return; }
    if (act === "clear") { set(k, ""); rerenderField(k); return; }
    if (act === "pick") {
      const files = await pickFiles(type === "audio" ? "audio/*" : "image/*");
      if (files[0]) upload(k, files.slice(0, 1));
      return;
    }
    if (act === "add") {
      const files = await pickFiles("image/*", true);
      if (files.length) upload(k, files);
      return;
    }
    const arr = [...(get(k) || [])], i = +btn.dataset.i;
    if (act === "remove") arr.splice(i, 1);
    if (act === "left" && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    if (act === "right" && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    set(k, arr);
    rerenderField(k);
  });
  $("form").addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".thumb[data-act]")) { e.preventDefault(); e.target.click(); }
  });

  // kéo thả ảnh
  $("form").addEventListener("dragover", e => {
    const t = e.target.closest("[data-drop]");
    if (!t) return;
    e.preventDefault();
    t.classList.add("drag");
  });
  $("form").addEventListener("dragleave", e => { const t = e.target.closest("[data-drop]"); if (t) t.classList.remove("drag"); });
  $("form").addEventListener("drop", e => {
    const t = e.target.closest("[data-drop]");
    if (!t) return;
    e.preventDefault();
    t.classList.remove("drag");
    const k = t.dataset.drop;
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith("image/"));
    if (files.length) upload(k, ITEM[k][2] === "images" ? files : files.slice(0, 1));
  });

  async function upload(k, files) {
    const multi = ITEM[k][2] === "images";
    const invId = state.cur.id;
    state.busy[k] = files.length;
    rerenderField(k);
    for (const f of files) {
      try {
        const url = await S.uploadFile(f, invId || "moi");
        if (!state.cur || state.cur.id !== invId) return; // đã chuyển sang thiệp khác
        set(k, multi ? [...(get(k) || []), url] : url);
      } catch (err) {
        console.error(err);
        toast(`Tải "${f.name}" không được: ${friendlyError(err)}`, true);
      }
      state.busy[k]--;
      rerenderField(k);
    }
    delete state.busy[k];
    rerenderField(k);
  }

  /* ---------- lời chúc ---------- */
  function wishesHtml() {
    if (!state.wishes.length) return `<div class="hint">Chưa có lời chúc nào.</div>`;
    const fmt = t => new Date(t).toLocaleString("vi-VN");
    return `<div class="hint">${state.wishes.length} lời chúc</div><div class="wishes">${state.wishes.map(w => `
      <div class="w-item"><div><b>${esc(w.name)}</b> <small>${esc(fmt(w.created_at))}</small><p>${esc(w.message)}</p></div>
      <button type="button" class="danger sm" data-act="delwish" data-id="${esc(w.id)}">Xóa</button></div>`).join("")}</div>`;
  }
  async function loadWishes() {
    const id = state.cur && state.cur.id;
    state.wishes = [];
    if (!id) return;
    try {
      const list = await S.listWishes(id);
      if (state.cur && state.cur.id === id) { state.wishes = list; rerenderField("_wishes"); }
    } catch (e) { console.warn(e); }
  }
  async function deleteWish(id) {
    if (!confirm("Xóa lời chúc này?")) return;
    try {
      await S.deleteWish(id);
      state.wishes = state.wishes.filter(w => w.id !== id);
      rerenderField("_wishes");
      toast("Đã xóa lời chúc");
    } catch (e) { toast(friendlyError(e), true); }
  }

  /* ---------- lưu / tạo / nhân bản / xóa ---------- */
  async function save() {
    if (!state.cur) return;
    const c = state.cur;
    if (!SLUG_RE.test(c.slug || "")) { toast("Tên link chỉ gồm chữ thường không dấu, số và dấu gạch ngang.", true); return; }
    if (Object.keys(state.busy).length) { toast("Đợi tải ảnh xong rồi lưu nhé.", true); return; }
    const btn = $("saveBtn");
    btn.disabled = true; btn.textContent = "Đang lưu…";
    try {
      const saved = await S.saveInvitation({ id: c.id, slug: c.slug, title: c.data.name, published: c.published, data: c.data });
      state.list = [saved, ...state.list.filter(i => i.id !== saved.id)];
      state.cur.id = saved.id;
      markDirty(false);
      renderList();
      toast("Đã lưu ✓");
    } catch (e) {
      console.error(e);
      toast(friendlyError(e), true);
    } finally { btn.disabled = false; btn.textContent = "Lưu"; }
  }

  async function createFrom(data, name) {
    const inv = { slug: uniqueSlug(name), title: name, published: true, data: { ...data, name } };
    try {
      const saved = await S.saveInvitation(inv);
      state.list = [saved, ...state.list];
      select(saved);
      toast("Đã tạo thiệp mới");
    } catch (e) { toast(friendlyError(e), true); }
  }

  $("newBtn").onclick = () => {
    if (state.dirty && !confirm("Thiệp đang sửa chưa lưu. Bỏ các thay đổi?")) return;
    const name = (prompt("Tên người tốt nghiệp?") || "").trim();
    if (name) createFrom(JSON.parse(JSON.stringify(S.DEFAULT_DATA)), name);
  };
  $("dupBtn").onclick = () => {
    if (state.dirty && !confirm("Thiệp đang sửa chưa lưu. Nhân bản bản đã lưu?")) return;
    const src = state.list.find(i => i.id === state.cur.id);
    const name = (prompt("Nhân bản cho ai? (giữ nguyên trường, giờ, địa điểm… để bạn sửa tiếp)") || "").trim();
    if (name && src) createFrom(JSON.parse(JSON.stringify(S.withDefaults(src.data))), name);
  };
  $("delBtn").onclick = async () => {
    const c = state.cur;
    if (!confirm(`Xóa thiệp "${c.data.name}"? Lời chúc của thiệp này cũng bị xóa và không lấy lại được.`)) return;
    try {
      await S.deleteInvitation(c.id);
      state.list = state.list.filter(i => i.id !== c.id);
      select(null);
      toast("Đã xóa thiệp");
    } catch (e) { toast(friendlyError(e), true); }
  };
  $("saveBtn").onclick = save;
  $("copyBtn").onclick = async () => {
    const link = publicLink(state.cur.slug);
    try { await navigator.clipboard.writeText(link); toast("Đã sao chép link"); }
    catch { prompt("Sao chép link này:", link); }
  };
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && state.cur) { e.preventDefault(); save(); }
  });
  window.addEventListener("beforeunload", e => { if (state.dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- xem trước ---------- */
  const frame = $("previewFrame");
  let pvT;
  function sendPreview(now) {
    clearTimeout(pvT);
    pvT = setTimeout(() => {
      if (!state.previewReady || !state.cur) return;
      const c = state.cur;
      frame.contentWindow.postMessage({ type: "invite-preview", invitation: { id: c.id, slug: c.slug, data: c.data } }, location.origin);
    }, now ? 0 : 250);
  }
  window.addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data || e.data.type !== "invite-preview-ready") return;
    state.previewReady = true;
    sendPreview(true);
  });
  $("previewToggle").onclick = () => $("previewPane").classList.add("show");
  $("previewPane").addEventListener("click", e => { if (e.target === $("previewPane")) $("previewPane").classList.remove("show"); });

  /* ---------- mã kích hoạt (admin) ---------- */
  async function showCodes() {
    if (state.dirty && !confirm("Thiệp đang sửa chưa lưu. Bỏ các thay đổi?")) return;
    $("emptyState").hidden = true;
    $("editorBody").hidden = true;
    $("codesBody").hidden = false;
    $("codesList").innerHTML = `<div class="hint">Đang tải…</div>`;
    try { renderCodes(await S.listCodes()); }
    catch (e) { $("codesList").innerHTML = `<div class="err">${esc(friendlyError(e))}</div>`; }
  }
  function renderCodes(list) {
    state.codes = list;
    if (!list.length) { $("codesList").innerHTML = `<div class="hint">Chưa có mã nào.</div>`; return; }
    const fmt = t => new Date(t).toLocaleString("vi-VN");
    const unused = list.filter(c => !c.used_at).length;
    $("codesList").innerHTML = `<div class="hint" style="margin-bottom:8px">${list.length} mã · ${unused} chưa dùng</div><div class="codes">${list.map(c => {
      const inv = c.invitation_id && state.list.find(i => i.id === c.invitation_id);
      const status = c.used_at
        ? `Đã dùng bởi <b>${esc(c.used_email || "?")}</b> · ${esc(fmt(c.used_at))}${inv ? ` · link: <b>${esc(inv.slug)}</b>` : ""}`
        : `<b>Chưa dùng</b> · tạo ${esc(fmt(c.created_at))}`;
      return `<div class="code-row${c.used_at ? " used" : ""}"><code>${esc(c.code)}</code>
        <div class="meta">${c.note ? esc(c.note) + "<br>" : ""}${status}</div>
        <div class="acts"><button type="button" class="ghost sm" data-copy="${esc(c.code)}">Sao chép</button>${c.used_at ? "" : `<button type="button" class="danger sm" data-del="${esc(c.code)}">Xóa</button>`}</div></div>`;
    }).join("")}</div>`;
  }
  $("codesBtn").onclick = showCodes;
  $("codesClose").onclick = () => {
    $("codesBody").hidden = true;
    if (state.cur) $("editorBody").hidden = false; else $("emptyState").hidden = false;
  };
  $("codeCreate").onclick = async () => {
    const n = Math.max(1, Math.min(50, parseInt($("codeCount").value, 10) || 1));
    const btn = $("codeCreate");
    btn.disabled = true;
    try {
      const made = await S.createCodes(n, $("codeNote").value.trim());
      $("codeNote").value = "";
      renderCodes([...made, ...state.codes]);
      if (made.length === 1) { try { await navigator.clipboard.writeText(made[0].code); } catch {} }
      toast(made.length === 1 ? `Đã tạo mã ${made[0].code} (đã sao chép)` : `Đã tạo ${made.length} mã`);
    } catch (e) { toast(friendlyError(e), true); }
    finally { btn.disabled = false; }
  };
  $("codesList").addEventListener("click", async e => {
    const cp = e.target.closest("[data-copy]"), del = e.target.closest("[data-del]");
    if (cp) {
      try { await navigator.clipboard.writeText(cp.dataset.copy); toast("Đã sao chép mã"); }
      catch { prompt("Sao chép mã:", cp.dataset.copy); }
    }
    if (del && confirm(`Xóa mã ${del.dataset.del}?`)) {
      try {
        await S.deleteCode(del.dataset.del);
        renderCodes(state.codes.filter(c => c.code !== del.dataset.del));
        toast("Đã xóa mã");
      } catch (err) { toast(friendlyError(err), true); }
    }
  });

  /* ---------- đăng nhập / đăng ký ---------- */
  async function showApp(only) {
    $("loginView").hidden = true;
    $("redeemView").hidden = true;
    $("appView").hidden = false;
    if (!frame.src) frame.src = "index.html?preview=1";
    if (only) { state.list = [only]; renderList(); select(only); return; }
    await loadList();
    if (state.list[0]) select(state.list[0]);
  }
  // Sau khi đăng nhập: admin → toàn quyền; khách → thiệp của mình hoặc màn nhập mã
  async function afterLogin() {
    const user = await S.currentUser().catch(() => null);
    $("whoEmail").textContent = user && user.email && S.mode !== "demo" ? user.email : "";
    $("logoutBtn").hidden = S.mode === "demo";
    let admin = false;
    try { admin = await S.isAdmin(); } catch (e) { console.warn(e); }
    state.role = admin ? "admin" : "customer";
    document.body.classList.toggle("customer", !admin);
    $("loginView").hidden = true;
    if (admin) return showApp();
    let mine = null;
    try { mine = await S.getMyInvitation(); } catch (e) { toast(friendlyError(e), true); }
    if (mine) return showApp(mine);
    $("redeemBase").textContent = baseUrl().replace(/^https?:\/\//, "");
    $("redeemView").hidden = false;
  }

  let loginTab = "in";
  document.querySelector(".tabs").addEventListener("click", e => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    loginTab = b.dataset.tab;
    document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("on", x === b));
    const up = loginTab === "up", f = $("loginForm");
    $("loginTitle").textContent = up ? "Đăng ký" : "Đăng nhập";
    $("loginHint").textContent = up ? "Tạo tài khoản bằng email, sau đó nhập mã kích hoạt để làm thiệp." : "Đăng nhập bằng email để làm thiệp của bạn.";
    $("loginBtn").textContent = up ? "Đăng ký" : "Đăng nhập";
    $("pw2Row").hidden = !up;
    f.password2.required = up;
    f.password.autocomplete = up ? "new-password" : "current-password";
    $("loginErr").textContent = "";
  });
  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, btn = $("loginBtn");
    const email = f.email.value.trim(), pw = f.password.value;
    $("loginErr").textContent = "";
    if (loginTab === "up" && pw !== f.password2.value) { $("loginErr").textContent = "Hai lần nhập mật khẩu không giống nhau."; return; }
    btn.disabled = true;
    try {
      if (loginTab === "up") {
        const session = await S.signUp(email, pw);
        if (!session) { $("loginErr").textContent = "Đã gửi email xác nhận. Mở hộp thư, bấm link xác nhận rồi quay lại Đăng nhập."; return; }
      } else {
        await S.signIn(email, pw);
      }
      await afterLogin();
    } catch (err) { $("loginErr").textContent = friendlyError(err); }
    finally { btn.disabled = false; }
  });

  /* ---------- kích hoạt mã (khách) ---------- */
  $("redeemForm").slug.addEventListener("input", e => { e.target.value = e.target.value.toLowerCase().replace(/\s+/g, "-"); });
  $("redeemForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector("button");
    const slug = S.slugify(f.slug.value);
    f.slug.value = slug;
    $("redeemErr").textContent = "";
    if (!SLUG_RE.test(slug)) { $("redeemErr").textContent = "Tên link chỉ gồm chữ thường không dấu, số và dấu gạch ngang."; return; }
    btn.disabled = true;
    try {
      const inv = await S.redeemCode(f.code.value.trim().toUpperCase(), slug);
      toast("Kích hoạt thành công! Bắt đầu làm thiệp nhé 🎓");
      await showApp(inv);
    } catch (err) { $("redeemErr").textContent = friendlyError(err); }
    finally { btn.disabled = false; }
  });

  $("logoutBtn").onclick = async () => {
    if (state.dirty && !confirm("Thiệp đang sửa chưa lưu. Vẫn đăng xuất?")) return;
    await S.signOut();
    location.reload();
  };

  async function init() {
    const badge = $("modeBadge");
    if (S.mode === "demo") {
      badge.textContent = "DEMO"; badge.className = "badge demo";
      $("demoBar").hidden = false;
      return afterLogin();
    }
    badge.textContent = "ONLINE"; badge.className = "badge live";
    const session = await S.getSession().catch(() => null);
    if (session) afterLogin(); else $("loginView").hidden = false;
  }
  init();
})();
