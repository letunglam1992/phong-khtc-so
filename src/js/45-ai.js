/* ============================================================
   45-ai.js — Gọi AI Cloudflare Workers AI qua Worker trung gian (giao thức "messages")
   POST {messages, max_tokens[, model]} → {text, model}. Không chứa khóa API: khóa nằm trong biến bí mật của Worker.
   Hạn mức trên trình duyệt: tối đa N lượt/ngày (mặc định 30); Worker báo 429 thì ngừng đến hết ngày.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store;
  const MAC_DINH = 'https://rasoatvanban.letunglam1992.workers.dev', KHOA_HM = 'khtc-so-ai-han-muc';
  const cfg = () => ({ url: String(S.cfg.aiUrl === undefined ? MAC_DINH : S.cfg.aiUrl || '').trim().replace(/\/+$/, ''), model: S.cfg.aiModel || '', gioiHan: +S.cfg.aiGioiHan || 30 });
  const docHM = () => { let v = null; try { v = JSON.parse(localStorage.getItem(KHOA_HM) || 'null'); } catch (x) { } return v && v.ngay === U.today() ? v : { ngay: U.today(), so: 0, het: false }; };
  const ghiHM = v => { try { localStorage.setItem(KHOA_HM, JSON.stringify(v)); } catch (x) { } };
  const giaiThich = (st, loi) => st === 429 || /3036|3040|capacity|limit/i.test(loi || '') ? 'đã hết hạn mức Workers AI miễn phí trong ngày hoặc máy chủ đang quá tải — thử lại sau'
    : st === 401 || st === 403 ? 'Worker từ chối truy cập (kiểm tra mã truy cập hoặc tên miền được phép)' : (loi || 'máy chủ AI trả lỗi ' + st);

  const AI = A.AI = {
    MAC_DINH, cfg,
    hanMuc() { const v = docHM(), c = cfg(); return { da: v.so, toiDa: c.gioiHan, conLai: Math.max(0, c.gioiHan - v.so), het: v.het, chan: v.het || v.so >= c.gioiHan }; },
    coSan() { return !!cfg().url || !!(A.VBD && A.VBD.coMayChu && A.VBD.coMayChu()); },
    // Gửi hội thoại; tinh: tính vào hạn mức (mặc định có)
    async goi(messages, o) {
      o = o || {}; const c = cfg();
      if (!c.url && !(A.VBD && A.VBD.coMayChu && A.VBD.coMayChu())) throw new Error('Chưa cấu hình địa chỉ Worker AI (biểu tượng bánh răng trong hộp chat).');
      if (!c.url) AI.duongDi = 'gas';
      const hm = AI.hanMuc();
      if (o.tinh !== false) { if (hm.het) throw Object.assign(new Error('Hạn mức Workers AI miễn phí hôm nay đã hết — AI tạm dừng đến ngày mai.'), { hanMuc: true }); if (hm.chan) throw Object.assign(new Error('Đã dùng hết ' + hm.toiDa + ' lượt gọi AI hôm nay trên trình duyệt này.'), { hanMuc: true }); }
      const body = { messages, max_tokens: o.max_tokens || 1200 }; if (c.model) body.model = c.model;
      const op = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit', cache: 'no-store' };
      if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) op.signal = AbortSignal.timeout(o.timeout || 60000);
      let r, d;
      const quaMayChu = async ly => {   // dự phòng: gọi AI qua máy chủ Apps Script (không bị chặn CORS)
        const j = await A.VBD.gas({ action: 'aiChat', messages, max_tokens: o.max_tokens || 1200 }).catch(er => { throw new Error(ly + ' Gọi qua máy chủ Apps Script cũng lỗi: ' + er.message); });
        AI.duongDi = 'gas'; if (o.tinh !== false) { const v = docHM(); v.so++; ghiHM(v); }
        return { text: AiTI.layNoiDung(j.text), model: j.model || '', tenMoHinh: (/^@cf\//.test(j.model || '') ? String(j.model).replace(/^@cf\/[^/]+\//, '') + ' · ' : '') + 'qua máy chủ Apps Script' };
      };
      const coMC = A.VBD && A.VBD.coMayChu && A.VBD.coMayChu();
      if (AI.duongDi === 'gas' && coMC) return quaMayChu('');
      // Thử lần lượt các mô hình Worker cho phép khi mô hình trước lỗi máy chủ (vd. 3030) hoặc không trả nội dung
      const dsMH = c.model ? [c.model] : AiTI.MO_HINH_WORKER, loiMH = [], msgs2 = AiTI.gopHeThong(messages);
      try {
        for (const mh of dsMH) {
          const b2 = { messages: msgs2, max_tokens: AiTI.soToken(mh, body.max_tokens) }; if (mh) b2.model = mh;
          r = await fetch(c.url, Object.assign({}, op, { body: JSON.stringify(b2) })); d = await r.json().catch(() => ({}));
          d.text = AiTI.layNoiDung(d.text); if (r.ok && d.text) break;
          if (r.ok) d.error = 'chỉ trả phần suy luận, chưa có câu trả lời (hết token)';
          if (r.status === 429 || r.status === 401 || r.status === 403 || r.status === 400) break;
          loiMH.push((mh || 'mặc định').replace(/^@cf\/[^/]+\//, '') + ': ' + (d.error ? String(d.error).slice(0, 100) : 'HTTP ' + r.status));
        }
        if (!(r.ok && d.text) && loiMH.length > 1) d = Object.assign({}, d, { error: loiMH.join(' | ') });
      }
      catch (er) {
        if (er && er.name === 'TimeoutError') throw new Error('AI không phản hồi kịp (quá thời gian chờ).');
        // "Failed to fetch": thường do Worker chỉ cho phép một số tên miền (biến ALLOWED_ORIGIN) → thử qua máy chủ
        if (coMC) return quaMayChu('Trình duyệt không gọi thẳng được Worker (Worker chưa cho phép tên miền ' + location.origin + ').');
        throw new Error('Không kết nối được Worker AI (' + (er.message || er) + '). Worker có thể chưa cho phép tên miền ' + location.origin + ': thêm tên miền này vào biến ALLOWED_ORIGIN của Worker, hoặc nhập máy chủ Apps Script ở Thiết lập để gọi AI qua máy chủ.');
      }
      const text = String(d.text || (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '').trim();
      if (!r.ok || !text) { if (r.status === 429) { const v = docHM(); v.het = true; ghiHM(v); } throw Object.assign(new Error(giaiThich(r.status, d.error ? String(d.error.message || d.error) : (r.ok ? 'mô hình không trả nội dung' : ''))), { status: r.status }); }
      if (o.tinh !== false) { const v = docHM(); v.so++; ghiHM(v); }
      return { text, model: d.model || c.model || '', tenMoHinh: String(d.model || c.model || '').replace(/^@cf\/[^/]+\//, '') };
    },
    async kiemTra() { const r = await AI.goi([{ role: 'user', content: 'Chỉ trả lời đúng một từ: OK' }], { max_tokens: 32, tinh: false, timeout: 30000 }); return 'Kết nối được Workers AI' + (r.tenMoHinh ? ' · mô hình ' + r.tenMoHinh : ''); }
  };
})(App);
