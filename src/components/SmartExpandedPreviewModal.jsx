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
  onOpenSubjectModal,
}) {
  const [activeTab, setActiveTab] = useState("reader"); // "reader", "doc"
  const [theme, setTheme] = useState("midnight"); // "midnight"
  const [fontSize, setFontSize] = useState(16); // 14, 16, 18, 22
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [zoomLevel, setZoomLevel] = useState(100);

  // Determine item properties safely
  const targetSubject = subject || (item?.code || item?.assignedTeacher ? item : null);
  const title = item?.title || item?.name || item?.fileName || targetSubject?.name || "Subject Study Note";
  const courseCode = targetSubject?.code || item?.code || null;
  const courseName = targetSubject?.name || item?.subjectName || (item?.code ? item?.name : null) || "ECE Department";
  const facultyName = targetSubject?.assignedTeacher || item?.assignedTeacher || item?.teacher || null;
  const unit = item?.unit || (item?.units && item.units[0]) || (targetSubject?.units && targetSubject.units[0]) || (item?.code ? "All Units" : "Unit Note");
  const icon = item?.icon || targetSubject?.icon || "📖";
  const fileType = item?.type || item?.fileType || (item?.code ? "Course Study Module" : "Document");
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {courseCode && <span className="smart-preview-pill purple">{courseCode}</span>}
                <h2 className="smart-preview-title" style={{ margin: 0 }}>{title}</h2>
              </div>
              <div className="smart-preview-badges" style={{ marginTop: "6px" }}>
                <span className="smart-preview-pill purple">⚡ {unit}</span>
                <span className="smart-preview-pill cyan">📚 {courseName}</span>
                {facultyName && facultyName !== "Unassigned" && (
                  <span className="smart-preview-pill emerald">👨‍🏫 {facultyName}</span>
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

        {/* MODE TABS - Always available */}
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
                    {courseName} • {unit} • {fileType}
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
                <div style={{ whiteSpace: "pre-line", margin: "20px 0", lineHeight: 1.7 }}>
                  <h4 style={{ color: "#a855f7", marginBottom: "8px" }}>📝 Note Content Overview:</h4>
                  {noteContent}
                </div>
              )}

              {/* Course Hub / Overview when item is a Subject or has no direct body text */}
              {!noteContent && !item?.qaList && (
                <div style={{ padding: "16px 0" }}>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(168, 85, 247, 0.25)",
                      borderRadius: "16px",
                      padding: "24px",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                      <span style={{ fontSize: "2.8rem" }}>{icon}</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.4rem", color: "#ffffff" }}>{title}</h3>
                        <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
                          {courseCode ? `${courseCode} • ` : ""}Anna University Department of Electronics & Communication Engineering
                        </p>
                      </div>
                    </div>

                    <p style={{ color: "#cbd5e1", lineHeight: 1.6, margin: "0 0 16px 0", fontSize: "0.95rem" }}>
                      Welcome to the reader view for <strong>{title}</strong>. Access comprehensive study materials, unit lecture notes, solved 2-mark & 16-mark university question banks, and lab resources.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "16px" }}>
                      <div style={{ background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "12px", padding: "14px" }}>
                        <span style={{ fontSize: "0.8rem", color: "#c084fc", fontWeight: 700, display: "block" }}>Faculty In-Charge</span>
                        <strong style={{ fontSize: "1rem", color: "#ffffff" }}>{facultyName || "ECE Department Faculty"}</strong>
                      </div>
                      <div style={{ background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: "12px", padding: "14px" }}>
                        <span style={{ fontSize: "0.8rem", color: "#67e8f9", fontWeight: 700, display: "block" }}>Course Curriculum</span>
                        <strong style={{ fontSize: "1rem", color: "#ffffff" }}>Anna University Regulation</strong>
                      </div>
                      <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px", padding: "14px" }}>
                        <span style={{ fontSize: "0.8rem", color: "#6ee7b7", fontWeight: 700, display: "block" }}>Status</span>
                        <strong style={{ fontSize: "1rem", color: "#ffffff" }}>✅ Enrolled & Active</strong>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Launchers */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                    <button
                      className="category-btn"
                      style={{
                        padding: "16px",
                        textAlign: "left",
                        background: "rgba(168, 85, 247, 0.15)",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        borderRadius: "14px",
                        cursor: "pointer",
                        color: "#ffffff",
                      }}
                      onClick={() => onOpenSubjectModal?.(item || targetSubject, "all")}
                    >
                      <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>📖 Lecture Notes</div>
                      <div style={{ fontSize: "0.82rem", color: "#c084fc" }}>Open Unit Study Materials →</div>
                    </button>

                    <button
                      className="category-btn"
                      style={{
                        padding: "16px",
                        textAlign: "left",
                        background: "rgba(6, 182, 212, 0.15)",
                        border: "1px solid rgba(6, 182, 212, 0.3)",
                        borderRadius: "14px",
                        cursor: "pointer",
                        color: "#ffffff",
                      }}
                      onClick={() => onOpenSubjectModal?.(item || targetSubject, "qbank")}
                    >
                      <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>❓ Question Bank</div>
                      <div style={{ fontSize: "0.82rem", color: "#67e8f9" }}>View 2-Mark & 16-Mark Q&As →</div>
                    </button>

                    <button
                      className="category-btn"
                      style={{
                        padding: "16px",
                        textAlign: "left",
                        background: "rgba(245, 158, 11, 0.15)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        borderRadius: "14px",
                        cursor: "pointer",
                        color: "#ffffff",
                      }}
                      onClick={() => onOpenSubjectModal?.(item || targetSubject, "assignments")}
                    >
                      <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>📝 Unit Assignments</div>
                      <div style={{ fontSize: "0.82rem", color: "#fcd34d" }}>Check Tasks & Submit Work →</div>
                    </button>

                    {previewUrl && (
                      <button
                        className="category-btn"
                        style={{
                          padding: "16px",
                          textAlign: "left",
                          background: "rgba(59, 130, 246, 0.15)",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          borderRadius: "14px",
                          cursor: "pointer",
                          color: "#ffffff",
                        }}
                        onClick={() => setActiveTab("doc")}
                      >
                        <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>👁️ Original File</div>
                        <div style={{ fontSize: "0.82rem", color: "#93c5fd" }}>Switch to Document Viewer →</div>
                      </button>
                    )}
                  </div>
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


        </div>
      </div>

      {/* TOAST FEEDBACK */}
      {toastMsg && <div className="smart-toast-notification">{toastMsg}</div>}
    </div>
  );
}
