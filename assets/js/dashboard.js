// Dashboard: search filter, duplicate and delete actions.
(function () {
  'use strict';
  const { $, $$, openModal, toast, api } = window.UI;

  $('#search')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    $$('.project-card').forEach((card) => {
      card.classList.toggle('hidden', q !== '' && !card.dataset.search.includes(q));
    });
  });

  let pendingDelete = null;
  document.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-delete]');
    if (del) {
      pendingDelete = del;
      $('#delete-name').textContent = del.dataset.name;
      openModal('confirm-delete');
      return;
    }
    const dup = e.target.closest('[data-duplicate]');
    if (dup) {
      dup.disabled = true;
      try {
        const { id } = await api('duplicate', { id: +dup.dataset.duplicate });
        location.href = 'editor.php?id=' + id;
      } catch (err) {
        toast(err.message);
        dup.disabled = false;
      }
    }
  });

  $('#delete-confirm')?.addEventListener('click', async () => {
    if (!pendingDelete) return;
    const btn = $('#delete-confirm');
    btn.disabled = true;
    try {
      await api('delete', { id: +pendingDelete.dataset.delete });
      pendingDelete.closest('.project-card')?.remove();
      toast('Project deleted');
    } catch (err) {
      toast(err.message);
    }
    btn.disabled = false;
    $('#confirm-delete').classList.add('hidden');
  });
})();
