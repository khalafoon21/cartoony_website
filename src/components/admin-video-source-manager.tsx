"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/icon";
import { extractIframeSrc, isVideoEmbedUrl, type VideoServer } from "@/lib/video-helpers";

export type AdminVideoSourceManagerProps = {
  videoUrl: string;
  videoType: "direct" | "iframe";
  servers: VideoServer[];
  subtitleUrl: string;
  subtitleLang: string;
  onChange: (updates: {
    video_url: string;
    video_type: "direct" | "iframe";
    servers: VideoServer[];
    subtitle_url?: string;
    subtitle_lang?: string;
  }) => void;
};

export function AdminVideoSourceManager({
  videoUrl,
  videoType,
  servers,
  subtitleUrl,
  subtitleLang,
  onChange,
}: AdminVideoSourceManagerProps) {
  const [extractedNotice, setExtractedNotice] = useState<string | null>(null);
  const [previewActive, setPreviewActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewType, setPreviewType] = useState<"direct" | "iframe">("iframe");
  const [showMultiServers, setShowMultiServers] = useState(servers.length > 1);

  const primaryInputId = useId();

  // Handle user typing or pasting into primary URL / Iframe input
  const handlePrimaryInputChange = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setExtractedNotice(null);
      onChange({
        video_url: "",
        video_type: videoType,
        servers: servers.map((s, idx) => (idx === 0 ? { ...s, url: "" } : s)),
      });
      return;
    }

    // Check if input contains an <iframe> tag
    if (trimmed.includes("<iframe")) {
      const extracted = extractIframeSrc(trimmed);
      if (extracted) {
        setExtractedNotice(`تم استخراج رابط المشغل بنجاح: ${extracted}`);
        const updatedServers = servers.length > 0
          ? servers.map((s, idx) => (idx === 0 ? { ...s, url: extracted, type: "iframe" as const } : s))
          : [{ id: "srv-1", name: "السيرفر الأساسي", url: extracted, type: "iframe" as const }];

        onChange({
          video_url: extracted,
          video_type: "iframe",
          servers: updatedServers,
        });
        return;
      }
    }

    setExtractedNotice(null);
    const autoType = isVideoEmbedUrl(trimmed) ? "iframe" : videoType;
    const updatedServers = servers.length > 0
      ? servers.map((s, idx) => (idx === 0 ? { ...s, url: trimmed, type: autoType } : s))
      : [{ id: "srv-1", name: "السيرفر الأساسي", url: trimmed, type: autoType }];

    onChange({
      video_url: trimmed,
      video_type: autoType,
      servers: updatedServers,
    });
  };

  const handleTypeSwitch = (newType: "direct" | "iframe") => {
    const updatedServers = servers.map((s, idx) => (idx === 0 ? { ...s, type: newType } : s));
    onChange({
      video_url: videoUrl,
      video_type: newType,
      servers: updatedServers,
    });
  };

  const handleAddServer = () => {
    const nextIdx = servers.length + 1;
    const newServer: VideoServer = {
      id: `srv-${Date.now()}-${nextIdx}`,
      name: `سيرفر ${nextIdx}`,
      url: "",
      type: "iframe",
    };
    const updated = [...servers, newServer];
    setShowMultiServers(true);
    onChange({
      video_url: videoUrl,
      video_type: videoType,
      servers: updated,
    });
  };

  const handleUpdateServer = (idx: number, updates: Partial<VideoServer>) => {
    const updated = servers.map((s, i) => {
      if (i !== idx) return s;
      const merged = { ...s, ...updates };
      // If updating URL with iframe code, extract it
      if (updates.url && updates.url.includes("<iframe")) {
        merged.url = extractIframeSrc(updates.url);
        merged.type = "iframe";
      }
      return merged;
    });

    const primaryUrl = idx === 0 && updates.url !== undefined ? updated[0].url : videoUrl;
    const primaryType = idx === 0 && updates.type !== undefined ? updated[0].type : videoType;

    onChange({
      video_url: primaryUrl,
      video_type: primaryType,
      servers: updated,
    });
  };

  const handleRemoveServer = (idx: number) => {
    const updated = servers.filter((_, i) => i !== idx);
    const primaryUrl = updated[0]?.url || "";
    const primaryType = updated[0]?.type || "iframe";
    onChange({
      video_url: primaryUrl,
      video_type: primaryType,
      servers: updated,
    });
    if (updated.length <= 1) {
      setShowMultiServers(false);
    }
  };

  const handleOpenPreview = (urlToPreview: string, typeToPreview: "direct" | "iframe") => {
    if (!urlToPreview) return;
    setPreviewUrl(urlToPreview);
    setPreviewType(typeToPreview);
    setPreviewActive(true);
  };

  // Ensure servers array is always synchronized with the primary url
  const effectiveServers = servers.length > 0 ? servers : (videoUrl ? [{ id: "srv-1", name: "السيرفر الأساسي", url: videoUrl, type: videoType }] : []);

  return (
    <div className="admin-video-suite">
      {/* Hidden inputs so FormData receives these values automatically upon form submit */}
      <input type="hidden" name="video_url" value={videoUrl} />
      <input type="hidden" name="video_type" value={videoType} />
      <input type="hidden" name="servers" value={JSON.stringify(effectiveServers)} />

      {/* Header */}
      <div className="admin-video-suite-header">
        <div className="suite-title-group">
          <div className="suite-icon-bubble">
            <Icon name="sparkles" size={18} />
          </div>
          <div>
            <h4 className="suite-title">إعدادات مشغل الفيديو والتضمين (Iframe)</h4>
            <p className="suite-desc">
              أضف كود الـ iframe المباشر أو روابط مشغلات الفيديو الخارجية أو روابط البث (MP4 / HLS m3u8)
            </p>
          </div>
        </div>

        {/* Source Type Selector */}
        <div className="admin-video-type-tabs" role="tablist" aria-label="نوع مصدر الفيديو">
          <button
            type="button"
            role="tab"
            aria-selected={videoType === "iframe"}
            className={`admin-type-tab ${videoType === "iframe" ? "is-active" : ""}`}
            onClick={() => handleTypeSwitch("iframe")}
          >
            <span>🌐 مشغل كود Iframe / Embed</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={videoType === "direct"}
            className={`admin-type-tab ${videoType === "direct" ? "is-active" : ""}`}
            onClick={() => handleTypeSwitch("direct")}
          >
            <span>⚡ رابط مباشر (MP4 / m3u8)</span>
          </button>
        </div>
      </div>

      {/* Primary Server Input */}
      <div className="admin-video-primary-box">
        <label htmlFor={primaryInputId} className="admin-field-label">
          {videoType === "iframe"
            ? "كود الـ <iframe> الكامل أو رابط المشغل الخارجي:"
            : "رابط الفيديو المباشر (HLS .m3u8 أو .mp4):"}
        </label>
        <div className="admin-input-action-row">
          <input
            id={primaryInputId}
            type="text"
            dir="ltr"
            className="admin-text-input admin-input-code"
            value={videoUrl}
            onChange={(e) => handlePrimaryInputChange(e.target.value)}
            placeholder={
              videoType === "iframe"
                ? '<iframe src="https://..." allowfullscreen></iframe> أو https://example.com/embed/...'
                : "https://example.com/stream/video.m3u8 أو https://example.com/movie.mp4"
            }
          />
          {videoUrl && (
            <button
              type="button"
              className="admin-preview-btn"
              onClick={() => handleOpenPreview(videoUrl, videoType)}
              title="معاينة المشغل الآن"
            >
              <Icon name="sparkles" size={14} />
              <span>معاينة المشغل</span>
            </button>
          )}
        </div>

        {/* Extracted notice badge */}
        {extractedNotice && (
          <div className="admin-extracted-badge" role="status">
            <span aria-hidden="true">✓</span>
            <span>{extractedNotice}</span>
          </div>
        )}

        <div className="admin-input-hint">
          {videoType === "iframe" ? (
            <span>
              💡 يمكنك لصق كود <code>&lt;iframe&gt;</code> كما هو من مواقع المشاهدة (مثل VidHide، StreamHG، MixDrop، YouTube)، وسيقوم النظام باستخراج الرابط وتجهيز المشغل فوراً.
            </span>
          ) : (
            <span>
              💡 يدعم مشغل كارتوني المدمج روابط MP4 المباشرة وروابط بث HLS m3u8 مع جودات متعددة ودعم الترجمة وChromecast.
            </span>
          )}
        </div>
      </div>

      {/* Multi-Servers Section */}
      <div className="admin-multi-servers-section">
        <div className="multi-servers-header">
          <div className="multi-servers-toggle-title">
            <button
              type="button"
              className="admin-toggle-link"
              onClick={() => setShowMultiServers((prev) => !prev)}
            >
              <span>{showMultiServers ? "▼ إخفاء سيرفرات المشاهدة الإضافية" : "▶ إضافة سيرفرات مشاهدة بديلة (سيرفر 2، 3...)"}</span>
              {servers.length > 1 && (
                <span className="admin-pill-counter">{servers.length} سيرفرات</span>
              )}
            </button>
          </div>
          {showMultiServers && (
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={handleAddServer}
            >
              <span>+ إضافة سيرفر آخر</span>
            </button>
          )}
        </div>

        {showMultiServers && (
          <div className="admin-servers-list-edit">
            {servers.map((srv, idx) => (
              <div key={srv.id || idx} className="admin-server-item-row">
                <span className="server-index-badge">#{idx + 1}</span>
                <input
                  type="text"
                  className="server-name-input"
                  placeholder={`اسم السيرفر (مثلاً: VidHide ${idx + 1})`}
                  value={srv.name}
                  onChange={(e) => handleUpdateServer(idx, { name: e.target.value })}
                />
                <select
                  className="server-type-select"
                  value={srv.type}
                  onChange={(e) =>
                    handleUpdateServer(idx, {
                      type: e.target.value as "direct" | "iframe",
                    })
                  }
                >
                  <option value="iframe">Iframe / Embed</option>
                  <option value="direct">مباشر (MP4/HLS)</option>
                </select>
                <input
                  type="text"
                  dir="ltr"
                  className="server-url-input admin-input-code"
                  placeholder="الرابط أو كود الـ <iframe>"
                  value={srv.url}
                  onChange={(e) => handleUpdateServer(idx, { url: e.target.value })}
                />
                {srv.url && (
                  <button
                    type="button"
                    className="server-action-btn"
                    title="معاينة هذا السيرفر"
                    onClick={() => handleOpenPreview(srv.url, srv.type)}
                  >
                    <span>معاينة</span>
                  </button>
                )}
                {servers.length > 1 && (
                  <button
                    type="button"
                    className="server-action-btn is-delete"
                    title="حذف هذا السيرفر"
                    onClick={() => handleRemoveServer(idx)}
                  >
                    <span>حذف</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live In-Modal Player Preview */}
      {previewActive && previewUrl && (
        <div className="admin-live-preview-box">
          <div className="live-preview-header">
            <div className="live-preview-title">
              <span className="live-pulse" />
              <strong>معاينة المشغل المباشرة ({previewType === "iframe" ? "Iframe Embed" : "Native Player"})</strong>
            </div>
            <button
              type="button"
              className="admin-close-preview-btn"
              onClick={() => setPreviewActive(false)}
            >
              <span>✕ إغلاق المعاينة</span>
            </button>
          </div>
          <div className="live-preview-aspect">
            {previewType === "iframe" ? (
              <iframe
                src={previewUrl}
                title="معاينة مشغل الفيديو"
                className="admin-preview-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
            ) : (
              <video
                src={previewUrl}
                controls
                playsInline
                className="admin-preview-video"
              />
            )}
          </div>
        </div>
      )}

      {/* Subtitles (Only if needed or for direct streams) */}
      <div className="admin-subtitles-row">
        <div className="admin-form-field">
          <label htmlFor="field-sub-url">رابط ملف الترجمة (WebVTT .vtt - اختياري):</label>
          <input
            id="field-sub-url"
            name="subtitle_url"
            type="url"
            dir="ltr"
            value={subtitleUrl}
            onChange={(e) => onChange({ video_url: videoUrl, video_type: videoType, servers, subtitle_url: e.target.value })}
            placeholder="https://example.com/subs/ar.vtt"
          />
        </div>
        <div className="admin-form-field sub-lang-field">
          <label htmlFor="field-sub-lang">لغة الترجمة:</label>
          <input
            id="field-sub-lang"
            name="subtitle_lang"
            type="text"
            dir="ltr"
            maxLength={10}
            value={subtitleLang}
            onChange={(e) => onChange({ video_url: videoUrl, video_type: videoType, servers, subtitle_lang: e.target.value })}
            placeholder="ar"
          />
        </div>
      </div>
    </div>
  );
}
