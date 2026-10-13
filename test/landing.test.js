/**
 * IBS+ landing page — behaviour test harness
 * ---------------------------------------------------------------------------
 * Loads the real index.html in jsdom (scripts executed) and exercises every
 * interactive feature: WhatsApp links, scarcity counter, countdown, FAQ
 * accordion, CTA smooth-scroll, and the order form (validation + success).
 *
 * Run it with:   npm install && npm test
 *
 * This is dev tooling only — the landing page itself needs no build step.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const INDEX = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(INDEX, 'utf8');

/* ---------------------------------------------------------------- helpers */
let passed = 0;
let failed = 0;

const ok = (label, condition, extra) => {
  condition ? passed++ : failed++;
  console.log(
    (condition ? '  ✓ ' : '  ✗ ') + label + (extra !== undefined ? '  → ' + extra : '')
  );
};

const group = (title) => console.log('\n' + title);

/* ------------------------------------------------------------ boot jsdom */
const runtimeErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => runtimeErrors.push('jsdomError: ' + e.message));
virtualConsole.on('error', (...args) => runtimeErrors.push('console.error: ' + args.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost:8000/index.html',
  virtualConsole
});

const { window } = dom;
const document = window.document;

// jsdom does not implement scrollIntoView; spy on it instead.
window.Element.prototype.scrollIntoView = function () {
  this.dataset.scrolled = '1';
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const submit = () => $('#order-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

/* ------------------------------------------------------- 1. document basics */
group('Document / markup');
ok('dir="rtl" on <html>', document.documentElement.getAttribute('dir') === 'rtl');
ok('lang="ar"', document.documentElement.lang === 'ar');
ok('JS availability flag set before paint', document.documentElement.classList.contains('js'));
ok('all 8 content sections rendered', $$('section').length === 8, $$('section').length + ' sections');
ok('every reveal node is visible without IntersectionObserver',
  $$('.reveal').every((el) => el.classList.contains('in')), $$('.reveal').length + ' nodes');
ok('every image has an alt text', $$('img').every((img) => img.alt && img.alt.length > 3));
ok('every image has width + height (no CLS)', $$('img').every((img) => img.width && img.height));

/* ------------------------------------------------ 2. WhatsApp + phone links */
group('WhatsApp / phone wiring');
const fab = $('.wa-fab');
ok('floating WhatsApp button builds a wa.me link', /^https:\/\/wa\.me\/212/.test(fab.href), fab.href.slice(0, 52) + '…');
ok('floating button carries a pre-filled message', fab.href.includes('text='));
ok('footer WhatsApp link filled from CONFIG', $('.footer .js-wa').href.startsWith('https://wa.me/'));
ok('phone link left alone while the number is a placeholder',
  $('#support-phone').href === 'tel:+212600000000');

/* --------------------------------------------------------- 3. price sync */
group('Price sync (CONFIG → page)');
const all = (sel) => $$(sel);
ok('hero / offer / final prices filled from CONFIG',
  all('[data-price]').every((el) => el.textContent === '229'), all('[data-price]').length + ' nodes');
ok('crossed-out prices filled', all('[data-old-price]').every((el) => el.textContent === '499 درهم'),
  all('[data-old-price]').length + ' nodes');
ok('discount badges computed (54%)', all('[data-discount]').every((el) => el.textContent === 'خصم 54%'));
ok('savings line computed (كتوفر 270 درهم)',
  all('[data-save]').every((el) => el.textContent === 'كتوفر 270 درهم'));
ok('pack label injected', $('[data-pack]').textContent === 'عرض 2+1 مجاني');
ok('sticky bar price synced', $('.stickybar .js-price').textContent === '229 درهم');

/* ------------------------------------------------------ 4. urgency widgets */
group('Urgency widgets');
ok('scarcity counter starts at 47', $('#stock').textContent === '47');
ok('stock progress bar painted', Boolean($('#stockbar').style.width), $('#stockbar').style.width);
ok('countdown renders hh:mm:ss',
  /^\d{2}$/.test($('#cd-h').textContent) && /^\d{2}$/.test($('#cd-m').textContent) && /^\d{2}$/.test($('#cd-s').textContent),
  [$('#cd-h').textContent, $('#cd-m').textContent, $('#cd-s').textContent].join(':'));
ok('footer year is current', $('#year').textContent === String(new Date().getFullYear()));

/* --------------------------------------------------------- 4. FAQ accordion */
group('FAQ accordion');
const faqs = $$('#faq details');
ok('6 FAQ entries', faqs.length === 6, faqs.length + ' entries');
faqs[0].open = true;
faqs[0].dispatchEvent(new window.Event('toggle'));
faqs[1].open = true;
faqs[1].dispatchEvent(new window.Event('toggle'));
ok('opening one panel closes the others', faqs[0].open === false && faqs[1].open === true);

/* --------------------------------------------------------- 5. CTA behaviour */
group('CTA buttons');
click($('[data-scroll="#order"]'));
ok('CTA scrolls to the order section', $('#order').dataset.scrolled === '1');

/* -------------------------------------------------------- 6. order form */
group('Order form — validation');
$('#f-phone').value = '12345';
$('#f-name').value = '';
submit();
ok('invalid submit is blocked', !$('#success').classList.contains('show'));
ok('name error message shown', $('#e-name').classList.contains('show'), $('#e-name').textContent);
ok('phone error message shown', $('#e-phone').classList.contains('show'), $('#e-phone').textContent);
ok('aria-invalid="true" set on the bad field', $('#f-name').getAttribute('aria-invalid') === 'true');

group('Order form — Moroccan phone numbers');
[
  ['0612345678', true],
  ['+212612345678', true],
  ['00212612345678', true],
  ['0712345678', true],
  ['061234567', false],
  ['0012345678', false],
  ['abcdefghij', false]
].forEach(([number, shouldPass]) => {
  $('#f-name').value = 'محمد';
  $('#f-phone').value = number;
  $('#f-city').value = 'مراكش';
  submit();
  const accepted = $('#success').classList.contains('show');
  ok('"' + number + '" ' + (shouldPass ? 'accepted' : 'rejected'), accepted === shouldPass);
  if (accepted) click($('#edit-order'));
});

group('Order form — successful order');
$('#f-name').value = 'خديجة العلمي';
$('#f-phone').value = '06 12 34 56 78';
$('#f-city').value = 'طنجة';
submit();
ok('success panel is shown', $('#success').classList.contains('show'));
ok('form is hidden', $('#order-form').style.display === 'none');
ok('recap name', $('#r-name').textContent === 'خديجة العلمي');
ok('recap phone', $('#r-phone').textContent === '06 12 34 56 78');
ok('recap city', $('#r-city').textContent === 'طنجة');
const waOrder = decodeURIComponent($('#success-wa').href);
ok('order recap is pushed to WhatsApp with the price',
  waOrder.startsWith('https://wa.me/') && waOrder.includes('خديجة العلمي') && waOrder.includes('229'));

group('Order form — back to edit');
click($('#edit-order'));
ok('form is restored', !$('#success').classList.contains('show') && $('#order-form').style.display === '');

/* ------------------------------------------------------------ final checks */
setTimeout(() => {
  group('Runtime health');
  ok('focus moved to the first field after a CTA click',
    document.activeElement && document.activeElement.id === 'f-name',
    document.activeElement && document.activeElement.id);
  ok('no uncaught runtime errors', runtimeErrors.length === 0, runtimeErrors.join(' | ') || 'clean');

  console.log('\n' + (failed ? '✗ ' : '✓ ') + passed + ' passed, ' + failed + ' failed\n');
  process.exit(failed ? 1 : 0);
}, 900);
