/**
 * ==========================================================================
 * Tabseet Tech — Universal Frontend Logic & Interaction Engine (app.js)
 * Architecture: Vanilla JS, Zero Dependencies, High Performance
 * Supports: Home Page, TikTok Landing Page
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Management (Light / Dark Mode with LocalStorage Persistence)
    const themeBtn = document.getElementById('theme-toggle-btn');
    const iconMoon = document.getElementById('icon-moon');
    const iconSun = document.getElementById('icon-sun');
    const themeColorMeta = document.getElementById('theme-color-meta');

    const savedTheme = localStorage.getItem('tabseet_theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem('tabseet_theme', newTheme);
        });
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') {
            if (iconMoon) iconMoon.classList.add('visually-hidden');
            if (iconSun) iconSun.classList.remove('visually-hidden');
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#111013');
        } else {
            if (iconMoon) iconMoon.classList.remove('visually-hidden');
            if (iconSun) iconSun.classList.add('visually-hidden');
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#FAF9F6');
        }
    }

    // 2. FAQ Accordion Logic (Single Open Interaction)
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const isOpen = item.classList.contains('open');
            
            // Close all items
            document.querySelectorAll('.faq-item').forEach(el => {
                el.classList.remove('open');
                const qBtn = el.querySelector('.faq-question');
                if (qBtn) qBtn.setAttribute('aria-expanded', 'false');
            });

            // Open clicked if it was closed
            if (!isOpen) {
                item.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // 3. Downloader Form & Asymmetric Bento Results States
    const form = document.getElementById('downloader-form');
    const input = document.getElementById('video-url-input');
    const fetchBtn = document.getElementById('fetch-btn');
    
    const stateLoading = document.getElementById('state-loading');
    const stateError = document.getElementById('state-error');
    const stateResults = document.getElementById('state-results');
    const retryBtn = document.getElementById('retry-btn');
    
    const videoTitle = document.getElementById('video-title');
    const videoPlatformName = document.getElementById('video-platform-name');
    const downloadBtnText = document.getElementById('download-btn-text');
    const errorMessage = document.getElementById('error-message');

    function hideAllStates() {
        if (stateLoading) stateLoading.classList.remove('active');
        if (stateError) stateError.classList.remove('active');
        if (stateResults) stateResults.classList.remove('active');
    }



    if (retryBtn && input) {
        retryBtn.addEventListener('click', () => {
            hideAllStates();
            input.focus();
        });
    }

    if (form && input && fetchBtn) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = input.value.trim();
            if (!url) return;

            hideAllStates();
            if (stateLoading) stateLoading.classList.add('active');
            fetchBtn.disabled = true;

            let isValidUrl = false;
            try {
                const parsedUrl = new URL(url);
                if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                    isValidUrl = true;
                }
            } catch (err) {
                isValidUrl = false;
            }

            if (!isValidUrl) {
                fetchBtn.disabled = false;
                hideAllStates();
                if (errorMessage) errorMessage.textContent = 'عفواً، الرابط غير صحيح. تأكد من نسخ رابط الفيديو بالكامل (يبدأ بـ https://).';
                if (stateError) stateError.classList.add('active');
                return;
            }

            if (!url.toLowerCase().includes('tiktok.com') && !url.toLowerCase().includes('vt.tiktok.com')) {
                fetchBtn.disabled = false;
                hideAllStates();
                if (errorMessage) errorMessage.textContent = 'عفواً، الأداة حالياً مخصصة لتحميل فيديوهات تيك توك فقط.';
                if (stateError) stateError.classList.add('active');
                return;
            }

            try {
                // Attempt Real Edge Extraction via Cloudflare Pages Worker (/api/extract)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000);

                const res = await fetch('/api/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        fetchBtn.disabled = false;
                        hideAllStates();
                        if (videoPlatformName) videoPlatformName.textContent = json.data.platform || 'Social Stream';
                        if (videoTitle) videoTitle.textContent = json.data.title || 'فيديو جاهز للتحميل بدون علامة مائية';
                        
                        // Store real download links from server
                        window.downloadLinks = {};
                        if (Array.isArray(json.data.formats)) {
                            json.data.formats.forEach(f => {
                                window.downloadLinks[f.id] = f.url;
                            });
                            const firstFormat = json.data.formats[0];
                            const primaryDownloadLink = document.getElementById('primary-download-link');
                            if (primaryDownloadLink && firstFormat) {
                                primaryDownloadLink.setAttribute('href', firstFormat.url);
                                primaryDownloadLink.setAttribute('download', `tabseet-video-${firstFormat.quality || 'hd'}.${firstFormat.ext || 'mp4'}`);
                            }
                        }

                        if (stateResults) {
                            stateResults.classList.add('active');
                            if (window.innerWidth <= 768) {
                                stateResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                        return;
                    } else {
                        throw new Error((json && json.error) ? json.error : 'لم نتمكن من استخراج الفيديو من السيرفر.');
                    }
                } else if (res.status === 422 && (url.toLowerCase().includes('tiktok.com') || url.toLowerCase().includes('vt.tiktok.com'))) {
                    // Turnstile passed, but worker extraction failed (Cloudflare WAF blocked worker)
                    // Fallback to client-side extraction to bypass Worker-to-Worker blocks
                    try {
                        const tikRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
                            headers: { 'Accept': 'application/json, text/plain, */*' }
                        });
                        const tikJson = await tikRes.json();
                        if (tikJson && tikJson.data && tikJson.data.play) {
                            fetchBtn.disabled = false;
                            hideAllStates();
                            if (videoPlatformName) videoPlatformName.textContent = 'TikTok HD';
                            if (videoTitle) videoTitle.textContent = tikJson.data.title || 'فيديو تيك توك المستخرج - جودة أصلية';
                            
                            const hdUrl = tikJson.data.hdplay || tikJson.data.play;
                            const sdUrl = tikJson.data.play;
                            const mp3Url = tikJson.data.music || sdUrl;
                            
                            window.downloadLinks = {
                                'mp4-hd': hdUrl,
                                'mp4-sd': sdUrl,
                                'mp3': mp3Url
                            };
                            
                            const primaryDownloadLink = document.getElementById('primary-download-link');
                            if (primaryDownloadLink) {
                                primaryDownloadLink.setAttribute('href', hdUrl);
                                primaryDownloadLink.setAttribute('download', 'tabseet-video-hd.mp4');
                            }
                            
                            if (stateResults) {
                                stateResults.classList.add('active');
                                if (window.innerWidth <= 768) {
                                    stateResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }
                            return;
                        }
                    } catch (e) {
                        console.warn('[App Engine] Client fallback failed:', e.message);
                    }
                    throw new Error('عفواً، لم نتمكن من استخراج هذا الفيديو حالياً. قد يكون الفيديو خاصاً (Private)، أو تم حذفه من المنصة.');
                } else {
                    let errText = 'حدث خطأ أثناء معالجة الرابط (HTTP ' + res.status + ').';
                    try {
                        const errJson = await res.json();
                        if (errJson.error) errText = errJson.error;
                    } catch(e) {}
                    throw new Error(errText);
                }
            } catch (err) {
                console.warn('[App Engine] Extraction failed:', err.message);
                fetchBtn.disabled = false;
                hideAllStates();
                if (errorMessage) {
                    errorMessage.textContent = err.message || 'عفواً، لم نتمكن من معالجة هذا الرابط حالياً. تأكد من أن الفيديو عام ومتاح للجميع واضغط إعادة المحاولة.';
                }
                if (stateError) stateError.classList.add('active');
                return;
            }
        });
    }

    // 4. Quality Segmented Control Switching (1080p / 720p / MP3 Audio)
    const segmentBtns = document.querySelectorAll('.segment-btn');
    const primaryDownloadLink = document.getElementById('primary-download-link');

    segmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            segmentBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-checked', 'true');

            const format = btn.getAttribute('data-format');
            if (!downloadBtnText) return;

            const targetUrl = (window.downloadLinks && window.downloadLinks[format]) ? window.downloadLinks[format] : '#';

            if (format === 'mp4-hd') {
                downloadBtnText.textContent = 'حمّل الملف الآن - MP4 (1080p)';
                if (primaryDownloadLink) {
                    primaryDownloadLink.setAttribute('href', targetUrl);
                    primaryDownloadLink.setAttribute('download', 'tabseet-video-1080p.mp4');
                }
            } else if (format === 'mp4-sd') {
                downloadBtnText.textContent = 'حمّل الملف بسرعة - MP4 (720p)';
                if (primaryDownloadLink) {
                    primaryDownloadLink.setAttribute('href', targetUrl);
                    primaryDownloadLink.setAttribute('download', 'tabseet-video-720p.mp4');
                }
            } else if (format === 'mp3') {
                downloadBtnText.textContent = 'حمّل الصوت فقط - MP3 (320kbps)';
                if (primaryDownloadLink) {
                    primaryDownloadLink.setAttribute('href', targetUrl);
                    primaryDownloadLink.setAttribute('download', 'tabseet-audio-320kbps.mp3');
                }
            }
        });
    });

    // 4.5 Force Blob Download for Cross-Origin URLs (Prevents browser from playing video instead of downloading)
    if (primaryDownloadLink) {
        primaryDownloadLink.addEventListener('click', async (e) => {
            const href = primaryDownloadLink.getAttribute('href');
            // Only intercept if it's a real external HTTP link (not # or blob)
            if (href && href.startsWith('http')) {
                e.preventDefault();
                
                const originalText = downloadBtnText ? downloadBtnText.textContent : 'جاري التحميل...';
                if (downloadBtnText) downloadBtnText.textContent = 'جاري التجهيز والتحميل ⏳...';
                primaryDownloadLink.style.pointerEvents = 'none';
                primaryDownloadLink.style.opacity = '0.7';

                try {
                    const res = await fetch(href);
                    if (!res.ok) throw new Error('Network response was not ok');
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    
                    const tempLink = document.createElement('a');
                    tempLink.href = blobUrl;
                    tempLink.download = primaryDownloadLink.getAttribute('download') || 'tabseet-video.mp4';
                    document.body.appendChild(tempLink);
                    tempLink.click();
                    document.body.removeChild(tempLink);
                    
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000); // Cleanup memory
                } catch (err) {
                    console.warn('[Downloader] Blob fetch failed, falling back to new tab:', err);
                    window.open(href, '_blank');
                } finally {
                    if (downloadBtnText) downloadBtnText.textContent = originalText;
                    primaryDownloadLink.style.pointerEvents = 'auto';
                    primaryDownloadLink.style.opacity = '1';
                }
            }
        });
    }

    // 5. Service Worker Registration & Offline Readiness
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
                .then(reg => console.log('[Service Worker] Registered successfully with scope:', reg.scope))
                .catch(err => console.warn('[Service Worker] Registration failed:', err));
        });
    }

    // 6. PWA Smart Install Prompt & Banner Handling
    let deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;

        // Check if custom install button exists or create a non-intrusive smart floating toast
        let installToast = document.getElementById('pwa-install-toast');
        if (!installToast) {
            installToast = document.createElement('div');
            installToast.id = 'pwa-install-toast';
            installToast.className = 'pwa-toast-panel';
            installToast.setAttribute('role', 'region');
            installToast.setAttribute('aria-label', 'تثبيت التطبيق على الهاتف');
            installToast.innerHTML = `
                <div class="pwa-toast-content">
                    <div class="pwa-toast-icon">📲</div>
                    <div class="pwa-toast-text">
                        <strong>تثبيت Tabseet Tech</strong>
                        <span>حمّل أي فيديو بضغطة واحدة مباشر من شاشة موبايلك الرئيسية.</span>
                    </div>
                </div>
                <div class="pwa-toast-actions">
                    <button type="button" id="pwa-btn-install" class="btn-pwa-install">تثبيت الآن</button>
                    <button type="button" id="pwa-btn-dismiss" class="btn-pwa-dismiss" aria-label="إغلاق والتجاهل">&times;</button>
                </div>
            `;
            document.body.appendChild(installToast);

            // Add event listeners for install and dismiss
            document.getElementById('pwa-btn-install')?.addEventListener('click', async () => {
                if (deferredInstallPrompt) {
                    deferredInstallPrompt.prompt();
                    const { outcome } = await deferredInstallPrompt.userChoice;
                    console.log("[PWA] User response to install prompt:", outcome);
                    deferredInstallPrompt = null;
                }
                installToast.classList.remove('show');
            });

            document.getElementById('pwa-btn-dismiss')?.addEventListener('click', () => {
                installToast.classList.remove('show');
                sessionStorage.setItem('pwa_dismissed_v1', 'true');
            });
        }

        // Show toast only if user hasn't dismissed it in this session
        if (!sessionStorage.getItem('pwa_dismissed_v1')) {
            setTimeout(() => installToast.classList.add('show'), 3000); // Appear smoothly after 3 seconds
        }
    });

    // Hide toast when app is installed
    window.addEventListener('appinstalled', () => {
        console.log('[PWA] Application successfully installed.');
        const installToast = document.getElementById('pwa-install-toast');
        if (installToast) installToast.classList.remove('show');
        deferredInstallPrompt = null;
    });

    // 7. Share Target & Shortcut Parameter Handling (Auto-Fill & Trigger)
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('url') || params.get('text');
    const shareInput = document.getElementById('video-url-input') || input;
    const shareBtn = document.getElementById('fetch-btn') || fetchBtn;

    if (sharedUrl && shareInput && shareBtn) {
        const urlMatch = sharedUrl.match(/(https?:\/\/[^\s]+)/);
        const cleanUrl = urlMatch ? urlMatch[0] : sharedUrl;

        shareInput.value = cleanUrl;
        console.log('[PWA Share Target] Received shared URL:', cleanUrl);

        setTimeout(() => shareBtn.click(), 500);
    }
});


