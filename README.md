# ⚡ Tabseet Tech — Fast, Keyless & No-Watermark Video Downloader
> **المنصة العربية الذكية لتحميل الفيديوهات بدون علامة مائية بالسرعة القصوى والجودة الأصلية.**

[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](/)
[![Security: Fail-Closed](https://img.shields.io/badge/Security-Fail--Closed%20Turnstile-28A745?style=for-the-badge&logo=cloudflare&logoColor=white)](/)

---

## 📖 نبذة عن المشروع (Overview)
موقع **Tabseet Tech (تبسيط تك)** هو تطبيق ويب تقدمي (PWA) حديث ومستقل، مصمم بهوية **Swiss Editorial Grid** وبنية **Asymmetric Bento Grid**. يتيح للمستخدمين استخراج وتحميل مقاطع الفيديو والريلز والاستوري من مختلف شبكات التواصل الاجتماعي (TikTok, Facebook, Instagram, Twitter/X) بالدقة الأصلية الكاملة (HD/Full HD) وبدون أي علامات مائية أو إعلانات مزعجة.

تم بناء المشروع هندسياً بأعلى معايير الأمان (Zero Fake Data, Fail-Closed Security, Best-in-Class SEO) وتحت إشراف مراجعات صارمة من فرق الذكاء الاصطناعي التقنية (**DeepSeek Tech Lead** & **Claude Tech Lead**).

---

## 🏗️ المعمارية التقنية (Technical Architecture)

يعتمد المشروع على فصل كامل ومتكامل بين الواجهة الأمامية وخادم الحافة (Edge Serverless Computing):

1. **الواجهة الأمامية (Frontend — Client-Side):**
   - تم بناؤها باستخدام HTML5 و Vanilla CSS و Vanilla JavaScript لضمان سرعة تحميل فائقة (أقل من 1 ثانية) وأعلى أداء على الأجهزة المحمولة ومحركات البحث.
   - لا تعتمد الواجهة على أي مكتبات خارجية ثقيلة (No Tailwind, No React, No jQuery).

2. **الخادم الوسيط (Edge Worker — Cloudflare Functions):**
   - يعمل عبر مسار `functions/api/extract.js` على خوادم **Cloudflare Pages / Workers**.
   - **محركات الاستخراج الفورية (Zero Caching for Media Links):**
     - **TikTok:** الاتصال المباشر بمحرك `TikWM API`.
     - **Facebook, Instagram, Twitter/X:** الاتصال المباشر بمحرك `Cobalt API` المفتوح المصدر مع تمرير معاملات الجودة المتقدمة (`videoQuality: 'max'`, `quality: 'max'`).
   - **لماذا لا نستخدم Cloudflare KV؟** روابط الوسائط المستخرجة من المنصات ديناميكية ومربوطة بوقت محدد (Time-to-Live / IP-bound)، لذا يتم استخراج رابط طازج ومباشر في كل طلب لضمان عدم حدوث أخطاء `403 Forbidden`.

3. **الأمان المطلق (Fail-Closed Turnstile Protection):**
   - يتطلب الاتصال بنقطة الـ API اجتياز تحدي **Cloudflare Turnstile**.
   - تم تطبيق سياسة **Fail-Closed**: إذا لم يتم العثور على المفتاح السري (`TURNSTILE_SECRET_KEY`) في بيئة تشغيل الخادم، يرفض الخادم معالجة الطلب فوراً ويعيد خطأ `500 Server Misconfigured` قبل تنفيذ أي منطق استخراج.
   - بعد كل محاولة (نجاح أو فشل)، يتم تجديد التوكن برمجياً (`turnstile.reset`) لمنع استهلاك التوكن في المحاولات التالية.
   - تم تقييد ترويسات `CORS` للسماح بالنطاق الرسمي والمحلي فقط.

---

## 📁 هيكل المشروع (Repository Structure)

```text
├── index.html                   # الصفحة الرئيسية (أداة التحميل الشاملة + Bento Grid)
├── app.js                       # المحرك البرمجي للواجهة (إدارة التفاعل، الاتصال بالـ API، PWA Toast)
├── style.css                    # نظام التصميم الموحد (Swiss Editorial Grid & Dark Mode)
├── service-worker.js            # خادم التخزين المؤقت للتطبيق التقدمي (v3 Cache Ready)
├── manifest.json                # تعريف التطبيق التقدمي (PWA Manifest + Shortcuts)
├── functions/
│   └── api/
│       ├── extract.js           # الخادم الوسيط لاستخراج الوسائط (Cloudflare Worker)
│       └── status.js            # نقطة مراقبة فحص جاهزية الخادم (Health Check)
├── tiktok-downloader.html       # صفحة هبوط متخصصة لسيو تيك توك (800+ كلمة)
├── facebook-downloader.html     # صفحة هبوط متخصصة لسيو فيسبوك (800+ كلمة)
├── instagram-downloader.html    # صفحة هبوط متخصصة لسيو إنستجرام (800+ كلمة)
├── twitter-downloader.html      # صفحة هبوط متخصصة لسيو تويتر / إكس (800+ كلمة)
├── tos.html, privacy.html...    # الصفحات القانونية وأمان البيانات والامتثال
├── robots.txt, sitemap.xml      # ملفات توجيه وأرشفة محركات البحث القياسية
├── llms.txt                     # ملف الإرشاد المساند لنماذج الذكاء الاصطناعي
├── implementation_plan.md       # وثيقة الهندسة الشاملة وتاريخ المراجعات والتطوير
└── README.md                    # الدليل المعماري للمشروع
```

---

## ⚙️ إرشادات النشر على Cloudflare Pages (Deployment Guide)

1. **ربط المستودع (Git Integration):**
   - قم بتوصيل هذا المستودع بمشروع جديد على **Cloudflare Pages**.
   - إعدادات البناء (Build Settings):
     - **Framework Preset:** `None` (Static HTML / Vanilla).
     - **Build Command:** *(اتركه فارغاً)*.
     - **Build Output Directory:** `/` أو *(اتركه فارغاً)*.

2. **ضبط المتغيرات البيئية (Environment Variables — إلزامي جداً):**
   - ادخل إلى لوحة تحكم المشروع على Cloudflare Pages -> **Settings** -> **Environment variables** -> **Production & Preview**.
   - أضف المتغير التالي:
     - `TURNSTILE_SECRET_KEY` = *[مفتاح Turnstile السري الحي الخاص بنطاقك]*
   - *تنبيه:* بدون هذا المتغير، سيعمل الخادم بوضع الحظر المطلق (Fail-Closed) ويرفض كل الطلبات.

3. **تحديث مفتاح التفعيل في الواجهة الأمامية:**
   - في ملف `app.js` (السطر 24 تقريباً)، استبدل المفتاح التجريبي:
     `const TURNSTILE_SITE_KEY = '1x00000000000000000000AA';`
     بـ **Site Key الحي** الصادر من لوحة تحكم Cloudflare Turnstile.

---

## 🤖 إرشادات هامة لأي جلسة ذكاء اصطناعي مستقبلية (AI Agent Handoff Guidelines)

> **إلى المهندس / الوكيل البرمجي المستقبلي (To the future AI Agent):**
> مرحباً بك في مستودع **Tabseet Tech**. لقد تم إعداد هذا الكود بعناية فائقة وبعد 3 جولات مراجعة نقدية مع نماذج متقدمة. يرجى الالتزام الصارم بالقواعد التالية عند إجراء أي تعديل:

1. **صفر بيانات وهمية (Zero Fake Data & No Fallback Simulation):**
   - يُمنع منعاً باتاً إضافة أي محاكاة وهمية للنجاح أو وضع أرقام ومدد خيالية (مثل `01:00` أو فيديوهات تجريبية من `w3schools`) في `app.js` أو `extract.js`.
   - أي فشل في الشبكة أو الـ API يجب أن ينقل الرسالة بصدق وصراحة للمستخدم عبر `throw new Error`.

2. **الحفاظ على اتساق الـ Canonical والروابط الداخلية (Internal Link Equity):**
   - جميع روابط التنقل الداخلية (في الهيدر والفوتر والصفحات) يجب أن تشير دائماً إلى الروابط النظيفة (مثل `/tiktok-downloader` أو `/` للرئيسية) دون امتداد `.html` لضمان عدم تشتيت قوة الإشارة لأرشفة جوجل.
   - الصفحات القانونية (`tos.html`, `privacy.html`, `about.html`, إلخ) تحتفظ بامتدادها كما هي في الكانونيكال والروابط.

3. **عدم التخزين المؤقت للروابط المستخرجة (No KV Media Caching):**
   - لا تحاول أبداً إضافة منطق لحفظ روابط التحميل النهائية في Cloudflare KV أو Cache API. يجب استدعاء محركات `TikWM` و `Cobalt` وجلب رابط طازج مع كل طلب.

4. **التطبيق التقدمي (PWA Service Worker Maintenance):**
   - عند إضافة أي صفحة HTML جديدة أو تعديل أصل ثابت رئيسي، يجب إضافة مساره إلى قائمة `STATIC_ASSETS` في `service-worker.js` وترقية إصدار الكاش (مثلاً من `tabseet-cache-v3` إلى `v4`).

---
*© 2026 Tabseet Tech (تبسيط تك) — جميع الحقوق محفوظة.*
