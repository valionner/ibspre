# IBS+ — كريم وجع المفاصل | Landing page (RTL · Darija)

Single-page, mobile-first, right-to-left **Arabic (Moroccan Darija)** landing page for the
product **IBS+ Crème Douleurs Articulaires** — a Cash-on-Delivery (COD) funnel designed for
Moroccan traffic (Facebook/Instagram ads → order form → WhatsApp confirmation).

Built with **plain HTML + CSS + vanilla JavaScript**. No framework, no build step, no
dependency at runtime: `index.html` is the entire site.

---

## ▶️ Preview locally

```bash
# any static server works — the page needs no build
python3 -m http.server 8000        # → http://localhost:8000
```

## 🖼️ Swapping in a real packshot

Drop the real product photo in with one command — it trims the empty border (for
background-removed PNGs), converts to WebP **keeping transparency**, and rewrites the
`width`/`height` attributes of both product `<img>` tags so nothing shifts on load:

```bash
tools/import-product-image.sh ~/Downloads/packshot.png          # transparent PNG / cut-out
tools/import-product-image.sh ~/Downloads/packshot.jpg --no-trim # photo with its own background
```

It always writes `assets/img/product-tube.webp`, i.e. the path the page already uses.

## 📁 Project structure

```
.
├── index.html          # the whole landing page (markup + embedded CSS + JS)
├── assets/img/         # WebP images (product, pain points, avatars) — 152 KB total
│   ├── product-tube.webp   (800×1679, product packshot, cream background)
│   ├── pain-1..3.webp      (480×480, pain-point thumbnails)
│   └── avatar-1..3.webp    (240×240, testimonial avatars)
├── test/landing.test.js # jsdom behaviour tests (dev only)
├── package.json        # dev tooling only — NOT required to run the page
└── .gitignore
```

## 🧱 Page sections (top → bottom)

| # | Section | Content |
|---|---------|---------|
| 1 | Trust bar | ✅ الخلص عند التوصيل (344 يوم) · ✅ توصيل 24 ساعة · ✅ ضمان 30 يوم |
| 2 | Hero | Headline «وجع المفاصل كيقتل حياتك؟», price box (499 → **229 درهم**, خصم 54 %), full-width CTA |
| 3 | Pain points | 3 cards with red ❌ + quote «جربتي كلشي... ولكن الوجع باقي كيرجع.» |
| 4 | Solution | 3 benefit rows (🔥 ⬇️ 🌿) + ingredient pills (غلوكوزامين، أرنيكا، LSSM، فلفل حار) |
| 5 | Testimonials | خديجة (طنجة), محمد (مراكش), فاطمة (الدار البيضاء) + ✅ زبون حقيقي |
| 6 | Special offer | «عرض خاص — غير اليوم»: countdown, price, checklist, CTA, scarcity bar «باقي غير 47 كمية» |
| 7 | Order form | الاسم الكامل · رقم الهاتف · المدينة → «تأكيد الطلب» + WhatsApp handoff |
| 8 | FAQ | 6 accordion Q&A (2-column grid on desktop) |
| 9 | Final CTA | Dark-green block, 229 درهم price, gold button |
| 10 | Footer | Brand, ONSSA badge, WhatsApp support, legal note |

## ⚙️ Configuration — one place to edit

Everything editable lives in the **`CONFIG`** object inside the `<script>` block at the bottom
of `index.html`:

```js
var CONFIG = {
  whatsappNumber: '212XXXXXXXXX',   // ⚠️ replace with the real number (digits only)
  price: 229,
  oldPrice: 499,
  currency: 'درهم',
  packLabel: 'عرض 2+1 مجاني',
  stock: { start: 47, min: 12, firstDelay: 18000, every: [28000, 62000] }
};
```

* **WhatsApp number** — drive the floating button, the footer link and the post-order
  “أكّد على WhatsApp” button. The footer phone link rewrites itself only once a real
  9–15 digit number is configured (the `212XXXXXXXXX` placeholder is left untouched).
* **Prices** — `price`, `oldPrice`, `currency` and `packLabel` are pushed into every price,
  badge, savings line and pack mention on page load, and the discount percentage and the
  savings amount are **computed** (`خصم 54%`, `كتوفر 270 درهم`). Nothing else to edit —
  only the `<meta name="description">` text (SEO) is still hard-coded.
* **Stock counter** — starts at 47, drops by 1 at random intervals (28–62 s) down to 12,
  with a bump animation and a live progress bar.

## ✨ Interactions

* **Smooth scroll** — every `[data-scroll="#order"]` CTA scrolls to the order form and moves
  keyboard focus to the first field.
* **Fade-in on scroll** — `IntersectionObserver` adds `.in` to `.reveal` elements; without JS
  or without the API, content stays visible (no hidden content, ever).
* **Countdown to midnight** — “العرض كيسالي فـ” timer inside the offer card, recomputed every second.
* **Scarcity counter** — pulsing red bar + decreasing number (`aria-live="polite"` so screen
  readers get the update politely).
* **Price sync** — `CONFIG` is the single source of truth for prices, discount and pack label
  (see Configuration below).
* **Sticky bottom CTA bar (mobile)** — price + «طلب دابا» always visible; it slides away while
  the order form is on screen, and the footer reserves space for it.
* **Floating WhatsApp button** — fixed bottom-right (physical right, independent of RTL).
* **Order form** — client-side validation (Moroccan phone numbers: `06…`, `07…`, `05…`,
  `+212…`, `00212…`), inline Darija error messages, recap + prefilled WhatsApp order message,
  and a “back to the form” link.
  A commented `fetch()` hook marks where to POST the order to your own backend.

## 🎨 Design tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--green` | `#2D6A4F` | Primary green (buttons, icons) |
| `--green-700` / `--green-900` | `#1B5E37` / `#0F2A22` | Hover, footer, final CTA |
| `--heading` | `#1A3C34` | Headings |
| `--cream` / `--cream-2` | `#FDF6EC` / `#FAF3E8` | Page + alternating band background |
| `--gold` | `#E88C2A` | Discount badges, final CTA button |
| `--red` | `#D32F2F` | Pain points, urgency, scarcity bar |
| `--star` / `--check` | `#F5A623` / `#27AE60` | Rating stars / verified ticks |

Fonts: **Cairo** (headings) + **Tajawal** (body) from Google Fonts, with system fallbacks.
Layout: 480 px centred “phone” shell, expanding to 1080 px with multi-column grids at ≥1024 px.

## 🧪 Tests (dev only, optional)

```bash
npm install     # installs jsdom (dev dependency)
npm test        # 38 behaviour checks: links, widgets, accordion, form validation…
```

The tests load the real `index.html` in jsdom — a broken selector or a runtime error fails the run.

## 📌 Notes & decisions

* **Typo flagged:** the trust-bar item «الخلص عند التوصيل — **344 يوم**» was kept verbatim from
  the brief (marked with an HTML comment in `index.html`) — change it if it was meant to read
  something else.
* **Images** — the current packshot and lifestyle photos are AI-generated placeholders. Replace
  the files in `assets/img/` **keeping the same names** for a drop-in swap, or use
  `tools/import-product-image.sh` for the product shot (see above). For a cut-out with
  transparency, keep the page's cream tile behind it (it doubles as the studio background).
* **Legal:** the product is marketed as a natural cosmetic/wellness product; the footer carries a
  “not a substitute for medical advice” disclaimer. Add your ONSSA/authorisation references and
  local regulatory text before running paid traffic.
* **Performance:** 74 KB HTML+CSS+JS (~19 KB gzipped) + 152 KB of WebP images, no render-blocking JS
  (the single inline script is guarded so non-JS visitors see everything), explicit
  `width`/`height` on all images to avoid layout shift.
