(function (root) {
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }
  if (typeof module === 'object' && module.exports) module.exports = { escapeHtml };
  else root.escapeHtml = escapeHtml;
})(globalThis);
