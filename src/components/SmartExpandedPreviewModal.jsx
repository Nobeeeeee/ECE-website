import { useState, useEffect } from "react";
import "./SmartExpandedPreviewModal.css";

/**
 * SmartExpandedPreviewModal Component
 * Interactive Smart Expanded Reader & Document Viewer Suite
 */
export default function SmartExpandedPreviewModal({
  item,
  subject,
  onClose,
  onDownload,
  currentUser,
}) {
  const [activeTab, setActiveTab] = useState("reader"); // "reader", "doc", "summary", "units"
  const [theme, setTheme] = useState("midnight"); // "midnight", "paper", "sepia"
  const [fontSize, setFontSize] = useState(16); // 14, 16, 18, 22
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [zoomLevel, setZoomLevel] = useState(100);

  // Determine item properties safely
  const title = item?.title || item?.name || item?.fileName || subject?.name || "Subject Study Note";
  const unit = item?.unit || (subject?.units && subject.units[0]) || "Unit Note";
  const icon = item?.icon || subject?.icon || "📖";
  const fileType = item?.type || item?.fileType || "Document";
  const previewUrl = item?.previewUrl || item?.fileUrl || null;
  const noteContent = item?.content || item?.description || item?.text || "";
  const isQuestionBank = item?.type?.includes("2-mark") || item?.type?.includes("13-mark") || item?.type?.includes("Q&A") || item?.fileType?.includes("Question");

  // Show Toast
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Text-To-Speech (TTS) controls
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeech = () => {
    if (!("speechSynthesis" in window)) {
      triggerToast("⚠️ Text-to-speech audio reader not supported on this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      triggerToast("⏸️ Audio Speech Stopped");
    } else {
      window.speechSynthesis.cancel();
      const textToSpeak = `${title}. ${unit}. ${noteContent ? noteContent : "Reading subject study overview."}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      // Try to detect Tamil vs English
      const containsTamil = /[\u0B80-\u0BFF]/.test(textToSpeak);
      if (containsTamil) {
        utterance.lang = "ta-IN";
      } else {
        utterance.lang = "en-US";
      }

      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      triggerToast("🔊 Playing Audio Reader");
    }
  };

  // Copy text handler
  const handleCopyText = () => {
    const textToCopy = `${title}\n${unit}\n\n${noteContent || "No preview text available."}`;
    navigator.clipboard.writeText(textToCopy);
    triggerToast("📋 Note copied to clipboard!");
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Generate Smart Key Takeaways (AI summary simulation)
  const getSmartSummaryPoints = () => {
    if (item?.qaList && item.qaList.length > 0) {
      return item.qaList.slice(0, 4).map((q) => `Q: ${q.question} -> Key Concept: ${q.answer.substring(0, 100)}...`);
    }

    if (noteContent && noteContent.length > 30) {
      const sentences = noteContent.split(/(?<=[.?!])\s+/).filter(Boolean);
      return sentences.slice(0, 4);
    }

    return [
      `Key Concept 1: Essential definitions, physical principles, and formulas for ${unit}.`,
      `Key Concept 2: Standard derivations and numerical problem strategies for university examinations.`,
      `Key Concept 3: Important 2-mark & 13-mark high-frequency questions for instant revision.`,
      `Exam Tip: Review previous year question papers & diagrammatic representation for maximum marks.`,
    ];
  };

  // Render question answer list if present
  const renderQAList = () => {
    if (!item?.qaList || item.qaList.length === 0) return null;

    const filtered = item.qaList.filter((qa) =>
      qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qa.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="smart-qa-container">
        {filtered.map((qa, index) => (
          <div key={index} className="smart-qa-card">
            <div className="smart-qa-q">
              <span>Q{index + 1}:</span> {qa.question}
            </div>
            <div className="smart-qa-a">{qa.answer}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="smart-preview-backdrop" onClick={onClose}>
      <div
        className={`smart-preview-container theme-${theme} ${isFullscreen ? "is-fullscreen" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="smart-preview-header">
          <div className="smart-preview-header-info">
            <div className="smart-preview-icon">{icon}</div>
            <div className="smart-preview-title-group">
              <h2 className="smart-preview-title">{title}</h2>
              <div className="smart-preview-badges">
                <span className="smart-preview-pill purple">⚡ {unit}</span>
                <span className="smart-preview-pill cyan">📚 {subject?.name || "ECE Course"}</span>
                {subject?.assignedTeacher && (
                  <span className="smart-preview-pill emerald">👨‍🏫 {subject.assignedTeacher}</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className="smart-preview-close-btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
            >
              {isFullscreen ? "↙️" : "⛶"}
            </button>

            <button
              className="smart-preview-close-btn"
              onClick={onClose}
              title="Close Smart Preview Mode"
            >
              ✕
            </button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="smart-preview-toolbar">
          <div className="smart-toolbar-group">
            {/* Audio TTS Button */}
            <button
              className={`smart-tool-btn ${isSpeaking ? "tts-speaking" : ""}`}
              onClick={handleToggleSpeech}
            >
              {isSpeaking ? "⏸️ Pause Audio" : "🔊 Listen (Audio Reader)"}
            </button>

            {/* Font Size Adjusters */}
            <div style={{ display: "flex", gap: "2px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "2px" }}>
              <button
                className="smart-tool-btn"
                style={{ padding: "6px 10px" }}
                onClick={() => setFontSize(Math.max(13, fontSize - 2))}
                title="Decrease Text Size"
              >
                A-
              </button>
              <button
                className="smart-tool-btn"
                style={{ padding: "6px 10px" }}
                onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                title="Increase Text Size"
              >
                A+
              </button>
            </div>

            {/* Theme Selector */}
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                className={`smart-tool-btn ${theme === "midnight" ? "active" : ""}`}
                style={{ padding: "6px 10px" }}
                onClick={() => setTheme("midnight")}
                title="Midnight Dark Mode"
              >
                🌙
              </button>
              <button
                className={`smart-tool-btn ${theme === "paper" ? "active" : ""}`}
                style={{ padding: "6px 10px" }}
                onClick={() => setTheme("paper")}
                title="Paper Light Mode"
              >
                ☀️
              </button>
              <button
                className={`smart-tool-btn ${theme === "sepia" ? "active" : ""}`}
                style={{ padding: "6px 10px" }}
                onClick={() => setTheme("sepia")}
                title="Eye Care Sepia Mode"
              >
                📜
              </button>
            </div>
          </div>

          <div className="smart-toolbar-group">
            {/* Search Input */}
            <input
              type="text"
              className="smart-search-input"
              placeholder="🔍 Search in preview..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Actions */}
            <button className="smart-tool-btn" onClick={handleCopyText} title="Copy Text">
              📋 Copy
            </button>

            {onDownload && (
              <button
                className="smart-tool-btn active"
                onClick={() => {
                  onDownload(item);
                  triggerToast("📥 Downloading File...");
                }}
              >
                📥 Download
              </button>
            )}

            <button className="smart-tool-btn" onClick={handlePrint} title="Print Document">
              🖨️ Print
            </button>
          </div>
        </div>

        {/* MODE TABS */}
        <div className="smart-preview-tabs">
          <button
            className={`smart-tab-btn ${activeTab === "reader" ? "active" : ""}`}
            onClick={() => setActiveTab("reader")}
          >
            📖 Reader View
          </button>

          {previewUrl && (
            <button
              className={`smart-tab-btn ${activeTab === "doc" ? "active" : ""}`}
              onClick={() => setActiveTab("doc")}
            >
              📄 Original File View
            </button>
          )}

          <button
            className={`smart-tab-btn ${activeTab === "summary" ? "active" : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            ⚡ AI Key Takeaways
          </button>

          <button
            className={`smart-tab-btn ${activeTab === "units" ? "active" : ""}`}
            onClick={() => setActiveTab("units")}
          >
            🎯 Course Units & Topics
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="smart-preview-body" style={{ fontSize: `${fontSize}px` }}>
          {/* TAB 1: READER VIEW */}
          {activeTab === "reader" && (
            <div className="smart-reader-wrapper">
              <div className="smart-reader-meta">
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>{title}</h3>
                  <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                    {subject?.name} • {unit} • {fileType}
                  </span>
                </div>
                {item?.uploadedAt && (
                  <span style={{ fontSize: "0.82rem", opacity: 0.7 }}>
                    📅 {item.uploadedAt}
                  </span>
                )}
              </div>

              {renderQAList()}

              {noteContent && (
                <div style={{ whiteSpace: "pre-line", margin: "20px 0" }}>
                  <h4 style={{ color: "#a855f7", marginBottom: "8px" }}>📝 Note Content Overview:</h4>
                  {noteContent}
                </div>
              )}

              {!noteContent && !item?.qaList && (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <span style={{ fontSize: "3rem" }}>📄</span>
                  <h3 style={{ margin: "16px 0 8px 0" }}>Document Ready For Reading</h3>
                  <p style={{ opacity: 0.8, maxWidth: "500px", margin: "0 auto 20px" }}>
                    You can switch to <b>Original File View</b> to view the full PDF/Image or click <b>Download</b> to save it locally.
                  </p>
                  {previewUrl && (
                    <button
                      className="smart-tool-btn active"
                      style={{ padding: "10px 20px" }}
                      onClick={() => setActiveTab("doc")}
                    >
                      👁️ Switch to Full PDF / Image Preview
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ORIGINAL FILE VIEW (PDF / IMAGE / IFRAME) */}
          {activeTab === "doc" && previewUrl && (
            <div className="smart-doc-frame-wrapper">
              {item?.isImage || previewUrl.startsWith("data:image/") ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "20px" }}>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <button className="smart-tool-btn" onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}>🔍 Zoom Out</button>
                    <span className="smart-tool-btn">{zoomLevel}%</span>
                    <button className="smart-tool-btn" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}>🔍 Zoom In</button>
                  </div>
                  <img
                    src={previewUrl}
                    alt={title}
                    className="smart-image-viewer"
                    style={{ transform: `scale(${zoomLevel / 100})` }}
                  />
                </div>
              ) : (
                <iframe
                  src={previewUrl}
                  title={title}
                  className="smart-iframe-viewer"
                />
              )}
            </div>
          )}

          {/* TAB 3: AI KEY TAKEAWAYS */}
          {activeTab === "summary" && (
            <div className="smart-reader-wrapper">
              <div className="smart-ai-summary-box">
                <div className="smart-ai-summary-title">
                  <span>⚡</span>
                  <span>AI Smart Key Takeaways & Exam Highlights</span>
                </div>
                <div className="smart-ai-points-list">
                  {getSmartSummaryPoints().map((pt, idx) => (
                    <div key={idx} className="smart-ai-point">
                      <span className="smart-ai-bullet">{idx + 1}</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COURSE UNITS & TOPICS */}
          {activeTab === "units" && (
            <div className="smart-reader-wrapper">
              <h3 className="smart-reader-heading">🎯 Syllabus & Unit Breakdown</h3>
              <div className="smart-units-grid">
                {(subject?.units || ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"]).map((u, i) => (
                  <div key={i} className="smart-unit-card">
                    <h4 style={{ color: "#c084fc", margin: "0 0 6px 0" }}>Unit {i + 1}</h4>
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>{u}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOAST FEEDBACK */}
      {toastMsg && <div className="smart-toast-notification">{toastMsg}</div>}
    </div>
  );
}
