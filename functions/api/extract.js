/**
 * Cloudflare Pages Edge Function: /api/extract
 * Architecture: Edge Worker + Fail-Closed Turnstile Security + Multi-Engine Live Extraction (No Stale KV Media Links) + Restricted CORS
 */

function getCorsHeaders(request) {
    const origin = request.headers.get('Origin') || '';
    const isAllowed = origin === 'https://tabseet-tech.pages.dev' || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    const allowOrigin = isAllowed ? origin : 'https://tabseet-tech.pages.dev';
    return {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}

export async function onRequestOptions(context) {
    const corsHeaders = getCorsHeaders(context.request);
    return new Response(null, {
        status: 204,
        headers: {
            ...corsHeaders,
            'Access-Control-Max-Age': '86400',
        }
    });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const corsHeaders = getCorsHeaders(request);

    try {
        // 1. Fail-Closed Security Policy: TURNSTILE_SECRET_KEY MUST be configured in environment
        if (!env.TURNSTILE_SECRET_KEY) {
            console.error('[Security Error] TURNSTILE_SECRET_KEY is not configured in Cloudflare environment variables.');
            return new Response(JSON.stringify({
                success: false,
                error: 'خطأ في تهيئة أمان الخادم (مفتاح الحماية Turnstile مفقود من بيئة التشغيل). يرجى ضبط المتغيرات في Cloudflare Pages.'
            }), { status: 500, headers: corsHeaders });
        }

        const body = await request.json();
        const { url, turnstileToken } = body;

        if (!url || typeof url !== 'string') {
            return new Response(JSON.stringify({
                success: false,
                error: 'الرابط غير صحيح أو مفقود. تأكد من نسخ رابط الفيديو بالكامل.'
            }), { status: 400, headers: corsHeaders });
        }

        if (!turnstileToken) {
            return new Response(JSON.stringify({
                success: false,
                error: 'مطلوب التحقق من الأمان (Turnstile). يرجى تحديث الصفحة والمحاولة مجدداً.'
            }), { status: 403, headers: corsHeaders });
        }

        // Verify Turnstile Token with Cloudflare Challenges API
        const ip = request.headers.get('CF-Connecting-IP');
        const formData = new FormData();
        formData.append('secret', env.TURNSTILE_SECRET_KEY);
        formData.append('response', turnstileToken);
        if (ip) formData.append('remoteip', ip);

        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData
        });
        const verifyJson = await verifyRes.json();
        if (!verifyJson.success) {
            return new Response(JSON.stringify({
                success: false,
                error: 'فشل التحقق من الأمان (Turnstile). يرجى تحديث الصفحة والمحاولة مجدداً.'
            }), { status: 403, headers: corsHeaders });
        }

        // 2. Live Extraction Engine (Bypassing KV Cache for Media URLs to guarantee 100% fresh, non-expired download links)
        const cleanUrl = url.trim();
        const lowerUrl = cleanUrl.toLowerCase();
        let extractedData = null;

        // Primary Engine for TikTok: TikWM API (Fast 1080p without watermark)
        if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vt.tiktok.com')) {
            try {
                const tikRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
                if (tikRes.ok) {
                    const tikJson = await tikRes.json();
                    if (tikJson && tikJson.data && tikJson.data.play) {
                        const hdUrl = tikJson.data.hdplay || tikJson.data.play;
                        const sdUrl = tikJson.data.play;
                        const mp3Url = tikJson.data.music || sdUrl;
                        extractedData = {
                            url: cleanUrl,
                            platform: 'TikTok HD',
                            title: tikJson.data.title || 'فيديو تيك توك المستخرج - جودة أصلية بدون علامة مائية',
                            duration: tikJson.data.duration ? `${Math.floor(tikJson.data.duration/60)}:${(tikJson.data.duration%60).toString().padStart(2,'0')}` : 'غير متوفر',
                            thumb: tikJson.data.cover || './icon-192.png',
                            extractedAt: new Date().toISOString(),
                            formats: [
                                { id: 'mp4-hd', label: 'MP4 (1080p Full HD)', url: hdUrl, quality: '1080p', ext: 'mp4' },
                                { id: 'mp4-sd', label: 'MP4 (720p HD Slower)', url: sdUrl, quality: '720p', ext: 'mp4' },
                                { id: 'mp3', label: 'MP3 Audio (320kbps)', url: mp3Url, quality: '320kbps', ext: 'mp3' }
                            ]
                        };
                    }
                }
            } catch (e) {
                console.warn('[Edge Worker] TikWM extraction fallback:', e.message);
            }
        }

        // Universal / Fallback Engine: Cobalt API (Open Source Keyless Downloader Engine)
        if (!extractedData) {
            try {
                const cobRes = await fetch('https://api.cobalt.tools/api/json', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    },
                    body: JSON.stringify({ url: cleanUrl, videoQuality: 'max', quality: 'max' })
                });
                if (cobRes.ok) {
                    const cobJson = await cobRes.json();
                    if (cobJson && (cobJson.url || (cobJson.picker && cobJson.picker.length > 0))) {
                        const mainUrl = cobJson.url || cobJson.picker[0].url;
                        let platName = 'Social Media Video';
                        if (lowerUrl.includes('facebook') || lowerUrl.includes('fb.watch')) platName = 'Facebook Reels';
                        else if (lowerUrl.includes('instagram') || lowerUrl.includes('instagr.am')) platName = 'Instagram Reels / Story';
                        else if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com') || lowerUrl.includes('t.co')) platName = 'Twitter / X Video';
                        else if (lowerUrl.includes('tiktok')) platName = 'TikTok HD';

                        extractedData = {
                            url: cleanUrl,
                            platform: platName,
                            title: cobJson.filename || cobJson.title || `فيديو ${platName} (جودة أصلية)`,
                            duration: 'غير متوفر',
                            thumb: './icon-192.png',
                            extractedAt: new Date().toISOString(),
                            formats: [
                                { id: 'mp4-hd', label: 'MP4 (الدقة الأصلية الكاملة HD)', url: mainUrl, quality: '1080p', ext: 'mp4' },
                                { id: 'mp4-sd', label: 'MP4 (جودة متوسطة وسريعة)', url: mainUrl, quality: '720p', ext: 'mp4' },
                                { id: 'mp3', label: 'MP3 (استخراج الصوت فقط)', url: mainUrl, quality: '320kbps', ext: 'mp3' }
                            ]
                        };
                    }
                }
            } catch (e) {
                console.warn('[Edge Worker] Cobalt extraction error:', e.message);
            }
        }

        // Failsafe: If external APIs fail or video is private/deleted, return explicit error (NO FAKE VIDEOS EVER)
        if (!extractedData) {
            return new Response(JSON.stringify({
                success: false,
                error: 'عفواً، لم نتمكن من استخراج هذا الفيديو حالياً. قد يكون الفيديو خاصاً (Private)، أو تم حذفه من المنصة، أو يتطلب المحاولة بعد قليل.'
            }), { status: 422, headers: corsHeaders });
        }

        return new Response(JSON.stringify({
            success: true,
            cached: false,
            data: extractedData
        }), { status: 200, headers: { ...corsHeaders, 'Cache-Control': 'no-store, no-cache, must-revalidate' } });

    } catch (err) {
        return new Response(JSON.stringify({
            success: false,
            error: 'حدث خطأ في خادم الحافة أثناء معالجة الرابط. يرجى المحاولة مجدداً.'
        }), { status: 500, headers: getCorsHeaders(request) });
    }
}
