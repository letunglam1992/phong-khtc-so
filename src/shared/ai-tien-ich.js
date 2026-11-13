/* ============================================================
   ai-tien-ich.js — Tiện ích gọi AI Cloudflare qua Worker, dùng chung trình duyệt và Code.gs (UMD: var AiTI)
   - Worker trả {text, model}; với mô hình có "suy luận" (GLM, Gemma 4) mà hết token trước khi trả lời,
     Worker trả nguyên khối JSON chatcmpl có content = null → coi như không có câu trả lời, thử mô hình kế tiếp.
   - Một số mô hình Gemma lỗi khi có vai "system": gộp chỉ dẫn vào tin nhắn người dùng đầu tiên.
   ============================================================ */
var AiTI = (function () {
  'use strict';
  // Thứ tự thử qua Worker: '' = mô hình mặc định của Worker
  var MO_HINH_WORKER = ['', '@cf/google/gemma-4-26b-a4b-it', '@cf/zai-org/glm-4.7-flash'];
  function laSuyLuan(m) { return /glm|gemma-4|qwq|deepseek-r1|gpt-oss/i.test(String(m || '')); }
  /** Số token tối đa: mô hình suy luận cần thêm chỗ cho phần suy luận trước khi trả lời */
  function soToken(m, n) { n = +n || 1200; return laSuyLuan(m) ? Math.min(4096, Math.max(n * 2, 3500)) : n; }
  /** Gộp các tin "system" vào tin "user" đầu tiên */
  function gopHeThong(msgs) {
    var sys = [], out = [];
    (msgs || []).forEach(function (m) { if (m && m.role === 'system') sys.push(String(m.content || '')); else if (m) out.push({ role: m.role, content: String(m.content || '') }); });
    if (!sys.length) return out;
    var i = 0; while (i < out.length && out[i].role !== 'user') i++;
    if (i >= out.length) return [{ role: 'user', content: sys.join('\n\n') }].concat(out);
    out[i] = { role: 'user', content: 'CHỈ DẪN (bắt buộc tuân thủ):\n' + sys.join('\n\n') + '\n\n---\n\n' + out[i].content };
    return out;
  }
  /** Lấy câu trả lời thật từ text Worker trả về. '' nếu chỉ có phần suy luận. */
  function layNoiDung(text) {
    var t = String(text == null ? '' : text).trim();
    if (/^\{[\s\S]*"(choices|response)"/.test(t)) {
      try {
        var o = JSON.parse(t), c = o.choices && o.choices[0];
        t = (c && c.message && typeof c.message.content === 'string' ? c.message.content : c && typeof c.text === 'string' ? c.text : typeof o.response === 'string' ? o.response : '') || '';
      } catch (e) { return ''; }
    }
    return t.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*<\/think>/i, '').trim();
  }
  return { MO_HINH_WORKER: MO_HINH_WORKER, laSuyLuan: laSuyLuan, soToken: soToken, gopHeThong: gopHeThong, layNoiDung: layNoiDung };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AiTI;
