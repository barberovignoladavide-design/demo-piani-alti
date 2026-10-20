(() => {
  'use strict';

  const CONFIG = {
    product: 'Drop 001 / T-shirt nera',
    price: 25,
    whatsapp: '393496489347',
    contactName: 'Referente Piani Alti',
    // Sostituire con dati reali prima di raccogliere bonifici.
    accountName: 'DA INSERIRE',
    iban: 'IBAN DA INSERIRE'
  };
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const PRODUCTION = { queued: 'Da produrre', in_production: 'In produzione', ready: 'Pronta da consegnare', delivered: 'Consegnata' };
  const $ = (selector, root = document) => root.querySelector(selector);
  const money = value => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const digits = value => String(value || '').replace(/\D/g, '');
  const recipientDigits = value => { const raw = digits(value); return raw.length === 10 && raw.startsWith('3') ? `39${raw}` : raw; };
  const whatsappLink = (number, message) => `https://wa.me/${recipientDigits(number)}?text=${encodeURIComponent(message)}`;
  let currentOrder = null;
  let orders = [];
  let currentMessage = '';
  let toastTimer;

  async function api(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Operazione non riuscita. Riprova.');
      error.status = response.status;
      throw error;
    }
    return data;
  }
  function notify(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  function setView(view) {
    $('#shop-view').hidden = view !== 'shop';
    $('#admin-view').hidden = view !== 'admin';
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    if (view === 'admin') loadOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function messageFor(order, field) {
    const intro = `Ciao ${order.name}! Aggiornamento sulla prenotazione ${order.code} (${order.quantity} maglietta/e, taglia ${order.size}).`;
    if (field === 'paymentStatus') return order.paymentStatus === 'paid'
      ? `${intro} Abbiamo confermato il pagamento di ${money(order.total)}. Grazie! Ti aggiorniamo sulla maglietta.`
      : `${intro} Il pagamento di ${money(order.total)} risulta ancora da completare. Scrivici qui se hai bisogno di informazioni.`;
    const text = {
      queued: 'La prenotazione è in lista per la produzione. Ti aggiorniamo sui prossimi passaggi.',
      in_production: 'La tua maglietta è entrata in produzione. Ti scriveremo quando sarà pronta.',
      ready: `La tua maglietta è pronta! Rispondici qui per organizzare la consegna.${order.paymentStatus === 'pending' ? ' Il pagamento risulta ancora da completare.' : ''}`,
      delivered: 'La tua maglietta risulta consegnata. Grazie per aver scelto Piani Alti!'
    };
    return `${intro} ${text[order.productionStatus]}`;
  }
  function openMessage(order, field) {
    currentMessage = messageFor(order, field);
    $('#message-context').textContent = `${order.name} · ${order.code} · ${order.phone}`;
    $('#message-preview').textContent = currentMessage;
    $('#message-whatsapp').href = whatsappLink(order.phone, currentMessage);
    $('#message-dialog').hidden = false;
    $('#message-later').focus();
  }
  function initialMessage(order) {
    const base = `Ciao! Ho prenotato ${order.quantity} maglietta/e Piani Alti, taglia ${order.size}.\nCodice: ${order.code}\nNome: ${order.name}\nTotale: ${money(order.total)}.`;
    return order.payment === 'cash'
      ? `${base}\nHo scelto il pagamento in contanti. Quando possiamo organizzarci?`
      : `${base}\nHo scelto il bonifico. Vorrei ricevere qui gli aggiornamenti della prenotazione.`;
  }
  function copyText(text) {
    if (!navigator.clipboard?.writeText) { notify('Copia non disponibile in questo browser'); return; }
    navigator.clipboard.writeText(text).then(() => notify('Testo copiato negli appunti')).catch(() => notify('Copia non disponibile in questo browser'));
  }
  function bankMarkup(order) {
    return `<div class="payment-instructions"><h3>Coordinate per il bonifico</h3><p>La prenotazione è registrata, ma il pagamento sarà confermato dopo la verifica del bonifico. Queste coordinate sono segnaposto della demo.</p><div class="bank-line"><div><span>Intestatario</span><strong>${safe(CONFIG.accountName)}</strong></div></div><div class="bank-line"><div><span>IBAN</span><strong>${safe(CONFIG.iban)}</strong></div></div><div class="bank-line"><div><span>Importo</span><strong>${money(order.total)}</strong></div></div><div class="bank-line"><div><span>Causale</span><strong>${safe(order.code)} ${safe(order.name)}</strong></div><button type="button" data-copy="causale">Copia</button></div><div class="placeholder-badge">Non effettuare un bonifico: IBAN dimostrativo</div></div>`;
  }
  function renderConfirmation(order) {
    currentOrder = order;
    const cash = order.payment === 'cash';
    const section = $('#confirmation');
    section.innerHTML = `<div class="confirmation-card"><div class="success-mark">✓</div><div class="eyebrow">PRENOTAZIONE RICEVUTA</div><h2>Ci vediamo<br>più in alto.</h2><p class="lead">La tua prenotazione è stata registrata. Conserva il codice e apri WhatsApp per completare il contatto con ${cash ? 'il referente' : 'Piani Alti'}.</p><div class="order-code">${safe(order.code)}</div><div class="summary-grid"><div><span>Maglietta</span><strong>${safe(CONFIG.product)}</strong></div><div><span>Taglia e quantità</span><strong>${safe(order.size)} · ${order.quantity} pezzo/i</strong></div><div><span>Totale</span><strong>${money(order.total)}</strong></div><div><span>Pagamento</span><strong>${cash ? 'Contanti' : 'Bonifico bancario'}</strong></div></div>${cash ? `<div class="payment-instructions"><h3>Pagamento in contanti</h3><p>Scrivi a ${safe(CONFIG.contactName)} su WhatsApp. Il messaggio contiene già codice, taglia, quantità e importo, così potete accordarvi direttamente.</p></div>` : bankMarkup(order)}<div class="confirmation-actions"><a class="primary-button" href="${safe(whatsappLink(CONFIG.whatsapp, initialMessage(order)))}" target="_blank" rel="noopener noreferrer">${cash ? 'Scrivi al referente' : 'Conferma su WhatsApp'} <span>↗</span></a><button class="outline-button" id="new-order" type="button">Nuova prenotazione</button></div><p class="confirmation-note">WhatsApp apre un messaggio precompilato: controllalo e premi Invia tu.</p></div>`;
    section.hidden = false;
    $('#prenota').hidden = true;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function resetForm() {
    $('#order-form').reset();
    $('#size').value = '';
    $('#quantity').value = '1';
    $('#quantity-output').textContent = '1';
    $('#total').textContent = money(CONFIG.price);
    document.querySelectorAll('[data-size]').forEach(button => button.classList.remove('selected'));
    $('#form-error').hidden = true;
    $('#prenota').hidden = false;
    $('#confirmation').hidden = true;
    $('#prenota').scrollIntoView({ behavior: 'smooth' });
  }
  async function loadOrders() {
    $('#order-list').innerHTML = '<div class="empty-state">Caricamento prenotazioni…</div>';
    try {
      orders = (await api('/api/orders')).orders;
      $('#admin-view').classList.remove('locked');
      $('#admin-login-error').hidden = true;
      renderAdmin();
    } catch (error) {
      if (error.status === 401) {
        $('#admin-view').classList.add('locked');
        orders = [];
      } else {
        $('#order-list').innerHTML = `<div class="empty-state">${safe(error.message)}</div>`;
        notify(error.message);
      }
    }
  }
  function renderAdmin() {
    const pieces = status => orders.filter(order => order.productionStatus === status).reduce((sum, order) => sum + order.quantity, 0);
    for (const [status, id] of Object.entries({ queued: 'queued', in_production: 'production', ready: 'ready', delivered: 'delivered' })) $(`#stat-${id}`).textContent = pieces(status);
    const unpaid = orders.filter(order => order.paymentStatus === 'pending');
    const paid = orders.filter(order => order.paymentStatus === 'paid');
    $('#stat-unpaid').textContent = unpaid.length;
    $('#stat-unpaid-amount').textContent = `${money(unpaid.reduce((sum, order) => sum + order.total, 0))} in sospeso`;
    $('#stat-paid').textContent = paid.length;
    $('#stat-paid-amount').textContent = `${money(paid.reduce((sum, order) => sum + order.total, 0))} confermati`;
    $('#stat-orders').textContent = orders.length;
    $('#stat-shirts').textContent = `${orders.reduce((sum, order) => sum + order.quantity, 0)} magliette`;
    $('#size-tally').innerHTML = SIZES.map(size => `<div class="tally-row"><span>${size}</span><strong>${orders.filter(order => order.size === size && ['queued', 'in_production'].includes(order.productionStatus)).reduce((sum, order) => sum + order.quantity, 0)}</strong></div>`).join('');
    renderOrderList();
  }
  function renderOrderList() {
    const search = $('#order-search').value.trim().toLocaleLowerCase('it');
    const filter = $('#order-filter').value;
    const visible = orders.filter(order => {
      const matchesSearch = [order.name, order.code, order.phone].some(value => value.toLocaleLowerCase('it').includes(search));
      const matchesFilter = filter === 'all' || (filter === 'unpaid' ? order.paymentStatus === 'pending' : order.productionStatus === filter);
      return matchesSearch && matchesFilter;
    });
    $('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'ordine' : 'ordini'}`;
    $('#order-list').innerHTML = visible.length ? visible.map(order => `
      <article class="order-item" data-code="${safe(order.code)}">
        <div class="order-line"><div><span class="order-code-small">${safe(order.code)}</span><h3>${safe(order.name)}</h3></div><span class="order-date">${new Intl.DateTimeFormat('it-IT', { dateStyle: 'short' }).format(new Date(order.createdAt))}</span></div>
        <div class="order-detail-grid"><div><span>MAGLIETTE</span><strong>${order.quantity} × ${safe(order.size)}</strong></div><div><span>TOTALE</span><strong>${money(order.total)}</strong></div><div><span>METODO</span><strong>${order.payment === 'cash' ? 'Contanti' : 'Bonifico'}</strong></div><div><span>WHATSAPP</span><strong>${safe(order.phone)}</strong></div></div>
        <div class="order-controls"><label>Produzione<select data-field="productionStatus" aria-label="Stato produzione ${safe(order.code)}">${Object.entries(PRODUCTION).map(([value, label]) => `<option value="${value}" ${order.productionStatus === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Pagamento<select data-field="paymentStatus" aria-label="Stato pagamento ${safe(order.code)}"><option value="pending" ${order.paymentStatus === 'pending' ? 'selected' : ''}>Da pagare</option><option value="paid" ${order.paymentStatus === 'paid' ? 'selected' : ''}>Pagato</option></select></label><button type="button" data-action="message">Avvisa su WhatsApp ↗</button></div>
      </article>`).join('') : '<div class="empty-state"><strong>Nessuna prenotazione trovata.</strong>Prova un altro filtro o crea una prenotazione dalla vista cliente.</div>';
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#back-shop').addEventListener('click', () => setView('shop'));
  $('#refresh-orders').addEventListener('click', loadOrders);
  $('#admin-login').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const error = $('#admin-login-error');
    button.disabled = true;
    error.hidden = true;
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#admin-password').value }) });
      form.reset();
      await loadOrders();
    } catch (cause) {
      error.textContent = cause.message;
      error.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
  $('#admin-logout').addEventListener('click', async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' });
      orders = [];
      $('#admin-view').classList.add('locked');
      $('#admin-login').reset();
    } catch (cause) { notify(cause.message); }
  });
  $('#order-search').addEventListener('input', renderOrderList);
  $('#order-filter').addEventListener('change', renderOrderList);
  document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-size]').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
    $('#size').value = button.dataset.size;
    $('#form-error').hidden = true;
  }));
  for (const [id, delta] of [['#minus', -1], ['#plus', 1]]) $(id).addEventListener('click', () => {
    const quantity = Math.min(10, Math.max(1, Number($('#quantity').value) + delta));
    $('#quantity').value = String(quantity);
    $('#quantity-output').textContent = String(quantity);
    $('#total').textContent = money(quantity * CONFIG.price);
  });
  $('#order-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim().replace(/\s+/g, ' ');
    const phone = String(data.get('phone') || '').trim();
    const size = String(data.get('size') || '');
    const payment = String(data.get('payment') || '');
    const error = $('#form-error');
    let message = '';
    if (!SIZES.includes(size)) message = 'Scegli una taglia.';
    else if (name.length < 3) message = 'Inserisci nome e cognome.';
    else if (digits(phone).length < 9 || digits(phone).length > 15) message = 'Inserisci un numero WhatsApp valido, meglio con prefisso internazionale.';
    else if (!['bank', 'cash'].includes(payment)) message = 'Scegli come vuoi pagare.';
    else if (data.get('consent') !== 'on') message = 'Conferma che possiamo contattarti su WhatsApp per questa prenotazione.';
    if (message) { error.textContent = message; error.hidden = false; error.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    error.hidden = true;
    const quantity = Number(data.get('quantity'));
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const { order } = await api('/api/orders', { method: 'POST', body: JSON.stringify({ name, phone, size, quantity, payment, consent: true }) });
      renderConfirmation(order);
    } catch (cause) { error.textContent = cause.message; error.hidden = false; }
    finally { submit.disabled = false; }
  });
  $('#confirmation').addEventListener('click', event => {
    if (event.target.closest('#new-order')) resetForm();
    if (event.target.closest('[data-copy="causale"]') && currentOrder) copyText(`${currentOrder.code} ${currentOrder.name}`);
  });
  $('#order-list').addEventListener('change', async event => {
    const select = event.target.closest('select[data-field]');
    if (!select) return;
    const order = orders.find(item => item.code === select.closest('[data-code]')?.dataset.code);
    if (!order) return;
    const field = select.dataset.field;
    const previous = order[field];
    if (previous === select.value) return;
    select.disabled = true;
    try {
      const { order: changed } = await api(`/api/orders/${encodeURIComponent(order.code)}`, { method: 'PATCH', body: JSON.stringify({ [field]: select.value }) });
      orders = orders.map(item => item.code === order.code ? changed : item);
      renderAdmin();
      openMessage(changed, field);
    } catch (cause) { select.value = previous; select.disabled = false; notify(cause.message); }
  });
  $('#order-list').addEventListener('click', event => {
    const button = event.target.closest('[data-action="message"]');
    if (!button) return;
    const order = orders.find(item => item.code === button.closest('[data-code]')?.dataset.code);
    if (order) openMessage(order, 'productionStatus');
  });
  const closeMessage = () => { $('#message-dialog').hidden = true; };
  $('#close-message').addEventListener('click', closeMessage);
  $('#message-later').addEventListener('click', closeMessage);
  $('#message-dialog').addEventListener('click', event => { if (event.target.id === 'message-dialog') closeMessage(); });
  $('#message-copy').addEventListener('click', () => copyText(currentMessage));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMessage(); });
})();
