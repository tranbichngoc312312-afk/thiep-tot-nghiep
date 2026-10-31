/* Lớp dữ liệu dùng chung cho trang thiệp (index.html) và CMS (admin.html).
   Có Supabase thì lưu online; không có thì chạy chế độ DEMO bằng localStorage. */
(function () {
  const cfg = window.APP_CONFIG || {};
  const useSupabase = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const BUCKET = "invites";

  // Nội dung mặc định của một thiệp mới
  const DEFAULT_DATA = {
    name: "Tên Của Bạn",
    accent: "#010e52",
    schoolVi: "Trường Đại học Của Bạn",
    schoolEn: "Your University",
    logo: "",
    titleBig: "GRADUATION",
    titleScript: "Ceremony",
    hero: "",
    tagline: "Closing one chapter,\nopening a new future...",
    date: "2026-11-16",
    timeText: "17:30 - 19:30",
    wide: "",
    youthTitle1: "Thanh Xuân",
    youthTitle2: "Của Chúng Mình",
    film: [],
    filmBig: "",
    venue: "Hội trường A",
    address: "123 Đường ABC, Phường XYZ,\nTP. Hồ Chí Minh",
    mapQuery: "",
    letter:
      "Mỗi chặng đường đều để lại những dấu ấn riêng, và những năm đại học là một trong những hành trình đáng nhớ nhất của mình.\n\n" +
      "Cảm ơn Ba Mẹ đã luôn là điểm tựa. Cảm ơn Thầy Cô đã tận tâm dìu dắt. Cảm ơn bạn bè đã cùng mình viết nên những năm tháng tuổi trẻ.\n\n" +
      "Hẹn gặp lại nhau trong phiên bản tốt đẹp nhất của mỗi người. 🎓🤍",
    signature: "",
    albumTitle: "Lưu Giữ Kỉ Niệm",
    album: [],
    wishTitle: "GỬI LỜI NHẮN",
    thanksTitle: "Thank You!",
    thanksText:
      "Cảm ơn vì đã cùng mình đi qua một chặng đường đáng nhớ.\nSự hiện diện của bạn sẽ khiến ngày đặc biệt này trở nên ý nghĩa hơn rất nhiều.\nHẹn gặp bạn trong ngày mình tốt nghiệp!",
    thanksImage: "",
    music: ""
  };

  const withDefaults = data => ({ ...DEFAULT_DATA, ...(data || {}) });

  const slugify = s =>
    String(s || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  // Thu nhỏ ảnh trước khi tải lên cho nhẹ web
  async function compressImage(file, maxSide = 1800) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return file;
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
    const keepAlpha = file.type !== "image/jpeg";
    let blob = await new Promise(r => canvas.toBlob(r, keepAlpha ? "image/webp" : "image/jpeg", keepAlpha ? 0.9 : 0.85));
    if (keepAlpha && (!blob || blob.type !== "image/webp")) blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type.split("/")[1];
    return new File([blob], file.name.replace(/\.\w+$/, "") + "." + ext, { type: blob.type });
  }

  /* ---------------- SUPABASE ---------------- */
  function supabaseStore() {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const check = ({ data, error }) => { if (error) throw error; return data; };
    return {
      mode: "supabase",
      async getInvitationBySlug(slug) {
        const { data, error } = await sb.from("invitations").select("id,slug,data,published").eq("slug", slug).maybeSingle();
        if (error) throw error;
        return data;
      },
      async listWishes(invitationId) {
        return check(await sb.from("wishes").select("id,name,message,created_at").eq("invitation_id", invitationId).order("created_at", { ascending: false }).limit(500));
      },
      async addWish(invitationId, name, message) {
        return check(await sb.from("wishes").insert({ invitation_id: invitationId, name, message }).select("id,name,message,created_at").single());
      },
      async getSession() {
        const { data } = await sb.auth.getSession();
        return data.session;
      },
      async signIn(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.session;
      },
      async signOut() { await sb.auth.signOut(); },
      async listInvitations() {
        return check(await sb.from("invitations").select("id,slug,title,published,data,updated_at").order("updated_at", { ascending: false }));
      },
      async saveInvitation(inv) {
        const row = { slug: inv.slug, title: inv.title || "", published: !!inv.published, data: inv.data, updated_at: new Date().toISOString() };
        const q = inv.id ? sb.from("invitations").update(row).eq("id", inv.id) : sb.from("invitations").insert(row);
        return check(await q.select("id,slug,title,published,data,updated_at").single());
      },
      async deleteInvitation(id) { check(await sb.from("invitations").delete().eq("id", id)); },
      async deleteWish(id) { check(await sb.from("wishes").delete().eq("id", id)); },
      async uploadFile(file, folder) {
        const f = file.type.startsWith("image/") ? await compressImage(file) : file;
        const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${folder || "chung"}/${uid()}.${ext}`;
        const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type, cacheControl: "31536000" });
        if (error) throw error;
        return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
    };
  }

  /* ---------------- DEMO (localStorage) ---------------- */
  function demoStore() {
    const K_INV = "demo-invitations", K_WISH = "demo-wishes";
    const read = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
    const write = (k, v) => {
      try { localStorage.setItem(k, JSON.stringify(v)); }
      catch { throw new Error("Bộ nhớ trình duyệt đã đầy (chế độ demo chỉ chứa được ít ảnh). Hãy kết nối Supabase để lưu thoải mái."); }
    };
    const fileToDataUrl = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
    return {
      mode: "demo",
      async getInvitationBySlug(slug) { return read(K_INV).find(i => i.slug === slug) || null; },
      async listWishes(invitationId) {
        return read(K_WISH).filter(w => w.invitation_id === invitationId).sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async addWish(invitationId, name, message) {
        const w = { id: uid(), invitation_id: invitationId, name, message, created_at: new Date().toISOString() };
        write(K_WISH, [w, ...read(K_WISH)]);
        return w;
      },
      async getSession() { return { demo: true }; },
      async signIn() { return { demo: true }; },
      async signOut() {},
      async listInvitations() { return read(K_INV).sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")); },
      async saveInvitation(inv) {
        const list = read(K_INV);
        if (list.some(i => i.slug === inv.slug && i.id !== inv.id)) throw new Error("duplicate key value violates unique constraint (slug)");
        const row = { ...inv, id: inv.id || uid(), updated_at: new Date().toISOString() };
        write(K_INV, inv.id ? list.map(i => (i.id === inv.id ? row : i)) : [row, ...list]);
        return row;
      },
      async deleteInvitation(id) {
        write(K_INV, read(K_INV).filter(i => i.id !== id));
        write(K_WISH, read(K_WISH).filter(w => w.invitation_id !== id));
      },
      async deleteWish(id) { write(K_WISH, read(K_WISH).filter(w => w.id !== id)); },
      async uploadFile(file) {
        if (file.type.startsWith("image/")) return fileToDataUrl(await compressImage(file, 1200));
        if (file.size > 1.5e6) throw new Error("Chế độ demo chỉ nhận file nhạc dưới 1.5MB. Kết nối Supabase để tải file lớn hơn.");
        return fileToDataUrl(file);
      }
    };
  }

  window.Store = Object.assign(useSupabase ? supabaseStore() : demoStore(), { DEFAULT_DATA, withDefaults, slugify });
})();
