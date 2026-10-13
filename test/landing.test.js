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
// jsdom cannot navigate: the thank-you redirect shows up as a "navigation" error.
// Count those instead of treating them as failures.
let navigationAttempts = 0;
virtualConsole.on('jsdomError', (e) => {
  if (/navigation/i.test(e.message)) navigationAttempts++;
  else runtimeErrors.push('jsdomError: ' + e.message);
});
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
ok('support WhatsApp + phone links removed from the footer',
  !$('#support-phone') && $$('.footer .js-wa').length === 0);

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
ok('2+1 bonus line removed from the offer box', !$('[data-pack]') && !$('.offer__bonus'));
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
// Orders are POSTed to the Apps Script endpoint. Stub fetch: jsdom has none.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const posts = [];
let nextReply = { ok: true };
let failNextPost = false;
window.fetch = (url, opts) => {
  posts.push({ url, opts: opts || {} });
  if (failNextPost) {
    failNextPost = false;
    return Promise.reject(new TypeError('Failed to fetch'));
  }
  return Promise.resolve({ json: () => Promise.resolve(nextReply) });
};
const sentParams = (post) => Object.fromEntries(new URLSearchParams(post.opts.body));
const fill = (name, phone, city, addr) => {
  $('#f-name').value = name;
  $('#f-phone').value = phone;
  $('#f-city').value = city;
  $('#f-addr').value = addr;
};
const noticeText = () => $('#order-form .err[role="alert"]:not(#e-name):not(#e-phone):not(#e-city):not(#e-addr)').textContent;
const SHEET_URL = (html.match(/sheetUrl:\s*'([^']+)'/) || [])[1];

(async () => {
  // The CTA handler moves focus after a short delay (see section 5)
  await new Promise((resolve) => setTimeout(resolve, 800));
  ok('focus moved to the first field after a CTA click', document.activeElement && document.activeElement.id === 'f-name', document.activeElement && document.activeElement.id);

  group('Order form — validation');
  fill('', '12345', '', '');
  submit();
  await tick();
  ok('invalid submit is blocked (nothing sent)', posts.length === 0);
  ok('name error message shown', $('#e-name').classList.contains('show'), $('#e-name').textContent);
  ok('phone error message shown', $('#e-phone').classList.contains('show'), $('#e-phone').textContent);
  ok('address error message shown', $('#e-addr').classList.contains('show'), $('#e-addr').textContent);
  ok('aria-invalid="true" set on the bad field', $('#f-name').getAttribute('aria-invalid') === 'true');

  group('Order form — Moroccan phone numbers');
  for (const [number, shouldPass] of [
    ['0612345678', true], ['+212612345678', true], ['00212612345678', true], ['0712345678', true],
    ['061234567', false], ['0012345678', false], ['abcdefghij', false]
  ]) {
    const before = posts.length;
    fill('محمد', number, 'مراكش', 'حي المسيرة، زنقة 5');
    submit();
    await tick();
    const accepted = posts.length === before + 1;
    ok('"' + number + '" ' + (shouldPass ? 'accepted' : 'rejected'), accepted === shouldPass);
  }

  group('Order form — successful order');
  posts.length = 0;
  navigationAttempts = 0;
  fill('خديجة العلمي', '06 12 34 56 78', 'طنجة', 'حي بني مكادة، زنقة 3، رقم 7');
  submit();
  await tick();
  ok('one POST sent', posts.length === 1, posts.length + ' request(s)');
  ok('POST goes to CONFIG.sheetUrl (Apps Script Web App)', posts[0] && posts[0].url === SHEET_URL, SHEET_URL);
  ok('POST is form-encoded (no CORS preflight)', posts[0] && posts[0].opts.method === 'POST' && !posts[0].opts.headers);
  const p = sentParams(posts[0]);
  ok('name / phone / city / address sent', p.name === 'خديجة العلمي' && p.phone === '06 12 34 56 78' && p.city === 'طنجة' && p.addr === 'حي بني مكادة، زنقة 3، رقم 7');
  ok('offer / qty / total / currency sent', p.offer === 'عرض 2+1 مجاني' && p.qty === '1' && p.total === '229' && p.currency === 'درهم', JSON.stringify([p.offer, p.qty, p.total, p.currency]));
  ok('honeypot "website" sent empty', p.website === '');
  ok('page URL sent', p.page === 'http://localhost:8000/index.html');
  ok('redirect to thank-you page attempted', navigationAttempts === 1, navigationAttempts + ' attempt(s)');

  group('Order form — server responses');
  nextReply = { ok: false, duplicate: true, error: 'Duplicate order' };
  navigationAttempts = 0;
  submit();
  await tick();
  ok('duplicate order: message shown, no redirect', /تسجل دابا/.test(noticeText()) && navigationAttempts === 0, noticeText());
  ok('duplicate order: button re-enabled', $('#order-form button[type="submit"]').disabled === false);

  nextReply = { ok: false, error: 'boom' };
  submit();
  await tick();
  ok('server error: message shown, no redirect', /وقع مشكل/.test(noticeText()) && navigationAttempts === 0);

  group('Order form — network failure fallback');
  nextReply = { ok: true };
  failNextPost = true;
  posts.length = 0;
  submit();
  await tick();
  ok('falls back to a no-cors resend', posts.length === 2 && posts[1].opts.mode === 'no-cors', posts.length + ' request(s)');
  ok('fallback still redirects to thank-you', navigationAttempts === 1);

  group('Order form — honeypot');
  const hp = $('input[name="website"]');
  ok('honeypot input exists inside a hidden wrapper', Boolean(hp) && Boolean(hp.closest('.hp')) && hp.tabIndex === -1);
  hp.value = 'http://spam.example';
  posts.length = 0;
  fill('محمد', '0612345678', 'مراكش', 'حي المسيرة، زنقة 5');
  submit();
  await tick();
  ok('filled honeypot is forwarded for the server to reject', sentParams(posts[0]).website === 'http://spam.example');

  group('Thank-you page');
  const tyPath = path.join(__dirname, '..', 'thank-you.html');
  const ty = fs.existsSync(tyPath) ? fs.readFileSync(tyPath, 'utf8') : '';
  ok('thank-you.html exists', ty.length > 0);
  ok('thank-you page is RTL Arabic and not indexed', /dir="rtl"/.test(ty) && /lang="ar"/.test(ty) && /noindex/.test(ty));
  ok('thank-you page greets using ?name=', /URLSearchParams/.test(ty) && /get\('name'\)/.test(ty));
  ok('thank-you page links back to the landing page', /href="index\.html"/.test(ty));

  /* ------------------------------------------------------------ final checks */
  group('Runtime health');
  ok('no uncaught runtime errors', runtimeErrors.length === 0, runtimeErrors.join(' | ') || 'clean');

  console.log('\n' + (failed ? '✗ ' : '✓ ') + passed + ' passed, ' + failed + ' failed\n');
  process.exit(failed ? 1 : 0);
})();
