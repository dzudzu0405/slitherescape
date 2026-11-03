// Small shared UI helpers: modals, segmented controls, toast.
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function openModal(id) { $('#' + id)?.classList.remove('hidden'); }
  function closeModal(el) { el.closest('.modal-backdrop')?.classList.add('hidden'); }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-modal]');
    if (opener) { openModal(opener.dataset.openModal); return; }
    const closer = e.target.closest('[data-close-modal]');
    if (closer) { closeModal(closer); return; }
    if (e.target.classList.contains('modal-backdrop')) e.target.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal-backdrop:not(.hidden)').forEach((m) => m.classList.add('hidden'));
  });

  // Segmented control writes its value into the next hidden input (if any) and fires 'segment-change'.
  function bindSegmented(root = document) {
    $$('[data-segment]', root).forEach((seg) => {
      seg.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-value]');
        if (!btn) return;
        $$('button', seg).forEach((b) => b.classList.toggle('on', b === btn));
        const input = seg.parentElement.querySelector('input[type=hidden][name="' + seg.dataset.segment + '"]');
        if (input) input.value = btn.dataset.value;
        seg.dispatchEvent(new CustomEvent('segment-change', { bubbles: true, detail: { name: seg.dataset.segment, value: btn.dataset.value } }));
      });
    });
  }
  bindSegmented();

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // POST to api.php with the page's CSRF token. Resolves with the JSON body or throws.
  async function api(action, payload = {}) {
    const res = await fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content },
      body: JSON.stringify({ action, ...payload }),
      credentials: 'same-origin'
    });
    let body = {};
    try { body = await res.json(); } catch (_) { /* non-JSON error page */ }
    if (!res.ok) {
      const err = new Error(body.error || `Server error (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return body;
  }

  window.UI = { $, $$, openModal, closeModal, toast, bindSegmented, api };
})();
