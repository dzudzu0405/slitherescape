// Dashboard: theme labels, status filter, search, duplicate and delete actions.
(function () {
  'use strict';
  const { $, $$, openModal, toast, api } = window.UI;

  $$('.project-theme').forEach((el) => {
    const theme = window.Themes && window.Themes.theme(el.dataset.themeId);
    el.textContent = theme ? theme.label : el.dataset.custom || '';
  });

  let filter = 'all';
  function applyFilter() {
    const q = ($('#search')?.value || '').trim().toLowerCase();
    let shown = 0;
    $$('.project-card').forEach((card) => {
      const theme = card.querySelector('.project-theme').textContent.toLowerCase();
      const ok = (filter === 'all' || card.dataset.status === filter)
        && (q === '' || card.dataset.search.includes(q) || theme.includes(q));
      card.classList.toggle('hidden', !ok);
      if (ok) shown++;
    });
    $('#no-match')?.classList.toggle('hidden', shown > 0);
  }
  $('#search')?.addEventListener('input', applyFilter);
  $$('.dash-filter button').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    $$('.dash-filter button').forEach((x) => x.classList.toggle('on', x === b));
    applyFilter();
  }));

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
      applyFilter();
    } catch (err) {
      toast(err.message);
    }
    btn.disabled = false;
    $('#confirm-delete').classList.add('hidden');
  });
})();
