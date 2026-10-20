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
  const KEY = 'piani-alti-demo-orders-v1';
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const STATES = ['Prenotazione ricevuta', 'In attesa di pagamento', 'Pagamento confermato', 'Maglietta pronta', 'Consegnata'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const money = value => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const digits = value => String(value || '').replace(/\D/g, '');
  const whatsappLink = (number, message) => `https://wa.me/${digits(number)}?text=${encodeURIComponent(message)}`;
  let currentOrder = null;
  let toastTimer;

  function readOrders() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch { return []; }
  }
  function writeOrders(orders) {
    try { localStorage.setItem(KEY, JSON.stringify(orders)); return true; }
    catch { return false; }
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
    if (view === 'admin') renderAdmin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function newCode() {
    const used = new Set(readOrders().map(order => order.code));
    let code;
    do {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      code = `PA-${String(bytes[0] % 100000).padStart(5, '0')}`;
    } while (used.has(code));
    return code;
  }
  function messageFor(order, state) {
    const intro = `Ciao ${order.name}!`;
    if (state === 'In attesa di pagamento') return `${intro} La prenotazione ${order.code} per ${order.quantity} maglietta/e Piani Alti, taglia ${order.size}, è in attesa del pagamento di ${money(order.total)}. Scrivici qui se hai bisogno di aiuto.`;
    if (state === 'Pagamento confermato') return `${intro} abbiamo confermato il pagamento della prenotazione ${order.code}. Ti aggiorniamo quando la tua maglietta sarà pronta.`;
    if (state === 'Maglietta pronta') return `${intro} la maglietta della prenotazione ${order.code} è pronta! Rispondici qui per organizzarci.`;
    if (state === 'Consegnata') return `${intro} la prenotazione ${order.code} è stata consegnata. Grazie per aver scelto Piani Alti!`;
    return `${intro} abbiamo ricevuto la tua prenotazione ${order.code} per ${order.quantity} maglietta/e Piani Alti, taglia ${order.size}.`;
  }
  function initialMessage(order) {
    const base = `Ciao! Ho prenotato ${order.quantity} maglietta/e Piani Alti, taglia ${order.size}.\nCodice: ${order.code}\nNome: ${order.name}\nTotale: ${money(order.total)}.`;
    return order.payment === 'cash'
      ? `${base}\nHo scelto il pagamento in contanti. Quando possiamo organizzarci?`
      : `${base}\nHo scelto il bonifico. Vorrei ricevere qui gli aggiornamenti della prenotazione.`;
  }
  function copyText(text) {
    navigator.clipboard?.writeText(text).then(() => notify('Testo copiato negli appunti')).catch(() => notify('Copia non disponibile in questo browser'));
  }
  function bankMarkup(order) {
    return `<div class="payment-instructions"><h3>Coordinate per il bonifico</h3><p>La prenotazione è registrata, ma il pagamento sarà confermato dopo la verifica del bonifico. Queste coordinate sono segnaposto della demo.</p><div class="bank-line"><div><span>Intestatario</span><strong>${safe(CONFIG.accountName)}</strong></div></div><div class="bank-line"><div><span>IBAN</span><strong>${safe(CONFIG.iban)}</strong></div></div><div class="bank-line"><div><span>Importo</span><strong>${money(order.total)}</strong></div></div><div class="bank-line"><div><span>Causale</span><strong>${safe(order.code)} ${safe(order.name)}</strong></div><button type="button" data-copy="causale">Copia</button></div><div class="placeholder-badge">Non effettuare un bonifico: IBAN dimostrativo</div></div>`;
  }
  function renderConfirmation(order) {
    currentOrder = order;
    const cash = order.payment === 'cash';
    const section = $('#confirmation');
    section.innerHTML = `<div class="confirmation-card"><div class="success-mark">✓</div><div class="eyebrow">PRENOTAZIONE RICEVUTA</div><h2>Ci vediamo<br>più in alto.</h2><p class="lead">La tua prenotazione è stata registrata in questa demo. Conserva il codice e apri WhatsApp per completare il contatto con ${cash ? 'il referente' : 'Piani Alti'}.</p><div class="order-code">${safe(order.code)}</div><div class="summary-grid"><div><span>Maglietta</span><strong>${safe(CONFIG.product)}</strong></div><div><span>Taglia e quantità</span><strong>${safe(order.size)} · ${order.quantity} pezzo/i</strong></div><div><span>Totale</span><strong>${money(order.total)}</strong></div><div><span>Pagamento</span><strong>${cash ? 'Contanti' : 'Bonifico bancario'}</strong></div></div>${cash ? `<div class="payment-instructions"><h3>Pagamento in contanti</h3><p>Scrivi a ${safe(CONFIG.contactName)} su WhatsApp. Il messaggio contiene già codice, taglia, quantità e importo, così potete accordarvi direttamente.</p></div>` : bankMarkup(order)}<div class="confirmation-actions"><a class="primary-button" href="${safe(whatsappLink(CONFIG.whatsapp, initialMessage(order)))}" target="_blank" rel="noopener noreferrer">${cash ? 'Scrivi al referente' : 'Conferma su WhatsApp'} <span>↗</span></a><button class="outline-button" id="new-order" type="button">Nuova prenotazione</button></div><p class="confirmation-note">WhatsApp apre un messaggio precompilato: controllalo e premi Invia tu. Gli aggiornamenti successivi vengono preparati dalla vista interna.</p></div>`;
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
  function renderAdmin() {
    const orders = readOrders();
    $('#stat-orders').textContent = orders.length;
    $('#stat-shirts').textContent = orders.reduce((sum, order) => sum + Number(order.quantity || 0), 0);
    $('#stat-pending').textContent = orders.filter(order => order.state === STATES[0] || order.state === STATES[1]).length;
    $('#order-list').innerHTML = orders.length ? orders.slice().reverse().map(order => `<article class="order-item" data-code="${safe(order.code)}"><div class="order-line"><strong>${safe(order.name)}</strong><span>${safe(order.code)}</span></div><div class="order-meta">${safe(order.size)} · ${order.quantity} pezzo/i · ${money(order.total)} · ${order.payment === 'cash' ? 'Contanti' : 'Bonifico'} · ${safe(order.phone)}</div><div class="order-controls"><select aria-label="Stato della prenotazione ${safe(order.code)}">${STATES.map(state => `<option value="${safe(state)}" ${order.state === state ? 'selected' : ''}>${safe(state)}</option>`).join('')}</select><button type="button" data-action="message">Apri WhatsApp ↗</button><button class="secondary" type="button" data-action="copy">Copia messaggio</button></div></article>`).join('') : '<div class="empty-state"><strong>Ancora nessuna prenotazione.</strong>Prova il percorso cliente: l’ordine comparirà qui.</div>';
    $('#size-tally').innerHTML = SIZES.map(size => `<div class="tally-row"><span>${size}</span><strong>${orders.filter(order => order.size === size).reduce((sum, order) => sum + Number(order.quantity || 0), 0)}</strong></div>`).join('');
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#back-shop').addEventListener('click', () => setView('shop'));
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
  $('#order-form').addEventListener('submit', event => {
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
    const order = { code: newCode(), createdAt: new Date().toISOString(), name, phone, size, quantity, total: quantity * CONFIG.price, payment, state: payment === 'bank' ? STATES[1] : STATES[0] };
    const orders = readOrders();
    orders.push(order);
    if (!writeOrders(orders)) { error.textContent = 'Non riesco a salvare in questo browser. Controlla che l’archiviazione locale sia disponibile.'; error.hidden = false; return; }
    renderConfirmation(order);
  });
  $('#confirmation').addEventListener('click', event => {
    if (event.target.closest('#new-order')) resetForm();
    if (event.target.closest('[data-copy="causale"]') && currentOrder) copyText(`${currentOrder.code} ${currentOrder.name}`);
  });
  $('#order-list').addEventListener('change', event => {
    const select = event.target.closest('select');
    if (!select) return;
    const code = select.closest('[data-code]')?.dataset.code;
    const orders = readOrders();
    const order = orders.find(item => item.code === code);
    if (!order || !STATES.includes(select.value)) return;
    const previous = order.state;
    order.state = select.value;
    if (!writeOrders(orders)) { order.state = previous; select.value = previous; notify('Non riesco a salvare il nuovo stato'); return; }
    notify(`Stato ${code}: ${order.state}`);
    renderAdmin();
  });
  $('#order-list').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const code = button.closest('[data-code]')?.dataset.code;
    const order = readOrders().find(item => item.code === code);
    if (!order) return;
    const message = messageFor(order, order.state);
    if (button.dataset.action === 'copy') copyText(message);
    else window.open(whatsappLink(order.phone, message), '_blank', 'noopener,noreferrer');
  });
})();
