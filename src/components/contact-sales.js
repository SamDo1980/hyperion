import { element } from '../lib/dom.js';
import { t } from '../lib/locale.js';
import { CONTACT_MESSAGE_MAX, validateContactSales } from '../contact/contact-sales-validation.js';

const DRAFT_KEY = 'hyperion.contact-sales.v1';
const MAX_MESSAGE = CONTACT_MESSAGE_MAX;

function readDraft(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(DRAFT_KEY));
    return {
      name: typeof saved?.name === 'string' ? saved.name.slice(0, 160) : '',
      phone: typeof saved?.phone === 'string' ? saved.phone.slice(0, 80) : '',
      message: typeof saved?.message === 'string' ? saved.message.slice(0, MAX_MESSAGE) : '',
      open: Boolean(saved?.open),
      touched: Array.isArray(saved?.touched) ? saved.touched.filter(key => ['name','phone','message'].includes(key)) : [],
    };
  } catch {
    return { name: '', phone: '', message: '', open: false, touched: [] };
  }
}

function saveDraft(storage, draft) {
  try { storage?.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* Session-only fallback. */ }
}

export function createContactSalesModal(storage = null) {
  const draft = readDraft(storage);
  const dialog = element('dialog', 'contact-sales-modal');
  dialog.setAttribute('aria-labelledby', 'contact-sales-title');
  let opener = null;
  let previousOverflow = '';
  let touched = new Set(draft.touched ?? []);

  const card = element('div', 'contact-sales-card');
  const header = element('div', 'contact-sales-header');
  const heading = element('div');
  const title = element('h2', '', t('CONTACT US')); title.id = 'contact-sales-title';
  const intro = element('p', 'contact-sales-intro', t('Need help choosing a HYPERION sign? Leave your contact details and our team will assist you.'));
  heading.append(title, intro);
  const close = element('button', 'contact-sales-close', '×');
  close.type = 'button'; close.setAttribute('aria-label', t('Close'));
  header.append(heading, close);

  const form = element('form', 'contact-sales-form'); form.noValidate = true;
  const fields = new Map();
  function addField(key, label, { required = false, type = 'text', autocomplete = '', textarea = false } = {}) {
    const wrap = element('div', 'contact-sales-field');
    const caption = element('label', '', t(label) + (required ? ' *' : ''));
    const input = element(textarea ? 'textarea' : 'input');
    input.id = `contact-sales-${key}`; input.name = key; input.required = required;
    if (!textarea) input.type = type;
    if (autocomplete) input.autocomplete = autocomplete;
    if (key === 'phone') input.inputMode = 'tel';
    if (textarea) { input.rows = 5; input.maxLength = MAX_MESSAGE + 1; }
    else input.maxLength = key === 'name' ? 160 : 80;
    input.value = draft[key] ?? '';
    caption.htmlFor = input.id;
    const error = element('span', 'field-error'); error.id = `${input.id}-error`; error.hidden = true;
    input.setAttribute('aria-describedby', error.id);
    input.addEventListener('blur', () => { touched.add(key); draft.touched = [...touched]; saveDraft(storage, draft); validate(); });
    input.addEventListener('input', () => {
      draft[key] = input.value;
      saveDraft(storage, draft);
      if (touched.has(key)) validate();
    });
    wrap.append(caption, input, error); fields.set(key, { input, error }); form.append(wrap);
  }
  addField('name', 'Name', { required: true, autocomplete: 'name' });
  addField('phone', 'Phone / WhatsApp', { required: true, type: 'tel', autocomplete: 'tel' });
  addField('message', 'Message', { textarea: true });

  const status = element('p', 'contact-sales-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const submit = element('button', 'button button-primary contact-sales-submit', t('SEND REQUEST')); submit.type = 'submit';
  const privacy = element('p', 'contact-sales-privacy', t('Your information will only be used to respond to your enquiry.'));
  form.append(status, submit, privacy);
  card.append(header, form); dialog.append(card);

  function values() { return Object.fromEntries([...fields].map(([key, field]) => [key, field.input.value])); }
  function validate(all = false) {
    const errors = validateContactSales(values());
    for (const [key, field] of fields) {
      const message = (all || touched.has(key)) ? errors[key] : null;
      field.error.textContent = message ? t(message) : '';
      field.error.hidden = !message;
      field.input.setAttribute('aria-invalid', String(Boolean(message)));
    }
    return errors;
  }
  function setOpen(value) { draft.open = value; saveDraft(storage, draft); }
  function closeModal() { if (dialog.open) dialog.close(); }
  close.addEventListener('click', closeModal);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = card.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
  });
  dialog.addEventListener('close', () => {
    setOpen(false); document.body.style.overflow = previousOverflow;
    if (opener?.isConnected) opener.focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const key of fields.keys()) touched.add(key); draft.touched = [...touched]; saveDraft(storage, draft);
    const errors = validate(true);
    if (Object.keys(errors).length) { fields.get(Object.keys(errors)[0]).input.focus(); return; }
    submit.disabled = true;
    status.textContent = t('Preview mode — this request has not been sent.');
    setTimeout(() => { submit.disabled = false; }, 450);
  });

  function open(trigger = null) {
    if (dialog.open) return;
    opener = trigger;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setOpen(true);
    dialog.showModal();
    validate();
    requestAnimationFrame(() => fields.get('name').input.focus());
  }

  // Preserve an open enquiry across the page reload used by the language switch.
  if (draft.open) requestAnimationFrame(() => open());
  return { element: dialog, open, validateContactSales };
}
