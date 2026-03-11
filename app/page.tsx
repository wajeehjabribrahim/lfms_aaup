"use client";

import { ChangeEvent, useRef, useState } from "react";

type FoundItem = {
  id: number;
  type: string;
  brand: string;
  location: string;
  date: string;
  color: string;
  status: string;
};

export default function Home() {
  const [showLostForm, setShowLostForm] = useState(false);
  const [lostImages, setLostImages] = useState<File[]>([]);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [showAiQuestions, setShowAiQuestions] = useState(false);
  const [lostType, setLostType] = useState("");
  const [lostBrand, setLostBrand] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lostDate, setLostDate] = useState("");
  const [lostLocation, setLostLocation] = useState("");

  const [showRegisterFoundForm, setShowRegisterFoundForm] = useState(false);
  const [foundImages, setFoundImages] = useState<File[]>([]);
  const [foundType, setFoundType] = useState("");
  const [foundBrand, setFoundBrand] = useState("");
  const [foundDate, setFoundDate] = useState("");
  const [foundLocation, setFoundLocation] = useState("");
  const [showFoundAiQuestions, setShowFoundAiQuestions] = useState(false);
  const [foundAiQuestions, setFoundAiQuestions] = useState<string[]>([]);
  const [isFoundLoading, setIsFoundLoading] = useState(false);

  const [showFoundItems, setShowFoundItems] = useState(false);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [showClaimPage, setShowClaimPage] = useState(false);
  const [selectedClaimItem, setSelectedClaimItem] = useState<FoundItem | null>(null);
  const [claimQuestions, setClaimQuestions] = useState<string[]>([]);
  const [claimAnswers, setClaimAnswers] = useState<string[]>([]);
  const [claimResult, setClaimResult] = useState<{ matched: boolean; lockerNumber?: string } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);

  const handleLostImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length > 0) {
      setLostImages((prev) => [...prev, ...selectedFiles]);
    }

    event.target.value = "";
  };

  const removeLostImage = (imageIndex: number) => {
    setLostImages((prev) => prev.filter((_, index) => index !== imageIndex));
  };

  const handleFoundImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length > 0) {
      setFoundImages((prev) => [...prev, ...selectedFiles]);
    }

    event.target.value = "";
  };

  const removeFoundImage = (imageIndex: number) => {
    setFoundImages((prev) => prev.filter((_, index) => index !== imageIndex));
  };

  const handleNextClick = async () => {
    if (!lostType.trim()) {
      alert("الرجاء إدخال نوع المفقود");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: lostType,
        }),
      });

      const data = await response.json();

      if (data.questions) {
        setAiQuestions(data.questions);
        setShowAiQuestions(true);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      alert("حدث خطأ أثناء توليد الأسئلة");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFoundNextClick = async () => {
    if (foundImages.length === 0) {
      alert("لازم ترفع صورة واحدة على الأقل");
      return;
    }

    if (!foundType.trim()) {
      alert("الرجاء إدخال نوع الموجود");
      return;
    }

    setIsFoundLoading(true);

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: foundType,
        }),
      });

      const data = await response.json();

      if (data.questions) {
        setFoundAiQuestions(data.questions);
        setShowFoundAiQuestions(true);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      alert("حدث خطأ أثناء توليد الأسئلة");
    } finally {
      setIsFoundLoading(false);
    }
  };

  const handleStartClaim = (item: FoundItem) => {
    const questions = [
      `ما نوع الغرض الذي فقدته؟`,
      `ما الماركة المتوقعة؟`,
      `ما لون الغرض أو الغلاف؟`,
      `أين فقدته غالباً داخل الجامعة؟`,
      `اذكر علامة مميزة تساعد على التحقق`,
    ];

    setSelectedClaimItem(item);
    setClaimQuestions(questions);
    setClaimAnswers(new Array(questions.length).fill(""));
    setClaimResult(null);
    setShowClaimPage(true);
    setShowFoundItems(false);
  };

  const evaluateClaim = () => {
    if (!selectedClaimItem) return;

    const normalizedAnswers = claimAnswers.map((answer) => answer.trim().toLowerCase());
    if (normalizedAnswers.some((answer) => !answer)) {
      alert("الرجاء الإجابة على جميع الأسئلة");
      return;
    }

    let score = 0;
    const typeMatch = normalizedAnswers.some((a) => a.includes(selectedClaimItem.type.toLowerCase()));
    const brandMatch =
      selectedClaimItem.brand !== "غير محدد" &&
      normalizedAnswers.some((a) => a.includes(selectedClaimItem.brand.toLowerCase()));
    const locationMatch = normalizedAnswers.some((a) => a.includes(selectedClaimItem.location.toLowerCase()));
    const detailedAnswerCount = normalizedAnswers.filter((a) => a.length >= 8).length;

    if (typeMatch) score += 1;
    if (brandMatch) score += 1;
    if (locationMatch) score += 1;
    if (detailedAnswerCount >= 3) score += 1;

    const matched = score >= 2;

    if (matched) {
      const lockerNumber = `LF-${String(selectedClaimItem.id).padStart(3, "0")}`;
      setClaimResult({ matched: true, lockerNumber });
      setFoundItems((prev) =>
        prev.map((item) =>
          item.id === selectedClaimItem.id
            ? { ...item, status: "تمت المطابقة" }
            : item
        )
      );
    } else {
      setClaimResult({ matched: false });
    }
  };

  const stopScanner = () => {
    if (scanTimeoutRef.current) {
      window.clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScannerOpen(false);
  };

  const startQrDetection = async () => {
    const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;

    if (!BarcodeDetectorCtor) {
      setScannerError("جهازك لا يدعم قراءة QR تلقائياً. يمكنك استخدام متصفح حديث مثل Chrome.");
      return;
    }

    const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

    const scanLoop = async () => {
      try {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const barcodes = await detector.detect(videoRef.current);

          if (barcodes.length > 0) {
            const qrValue = barcodes[0].rawValue ?? "";
            stopScanner();
            alert(`تم مسح QR بنجاح${qrValue ? `: ${qrValue}` : ""} وتم فتح الخزانة.`);
            return;
          }
        }
      } catch {
        // تجاهل أخطاء القراءة المؤقتة
      }

      scanTimeoutRef.current = window.setTimeout(scanLoop, 350);
    };

    scanLoop();
  };

  const handleQrScanOpenLocker = async () => {
    setScannerError("");
    setIsScannerOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await startQrDetection();
    } catch (error) {
      console.error("Camera open error:", error);
      setScannerError("تعذر فتح الكاميرا. تأكد من السماح بالوصول للكاميرا.");
    }
  };

  return (
    <main className="portal-page" dir="rtl">
      <header className="portal-header">
        <div className="portal-header-right">
          <div className="portal-logo-placeholder" aria-hidden="true" />
          <h1 className="portal-title">الجامعة العربية الامريكية</h1>
        </div>

        <div className="portal-header-left">
          <div className="portal-icon-row" aria-hidden="true">
            <img src="/email.png" alt="email" className="portal-icon-img" />
            <img src="/noti.png" alt="notifications" className="portal-icon-img" />
          </div>
          <div className="portal-user-info">
            <img
              src="/user.webp"
              alt="User profile"
              className="portal-user-icon"
            />
            <div className="portal-user-block">
              <span className="portal-user-name portal-user-name-opensans">w.jabribrahim</span>
              <span className="portal-user-role">طالب</span>
            </div>
          </div>
        </div>
      </header>

      <div className="portal-container">
        <aside className="portal-sidebar">
          <img src="/slidebar.png" alt="sidebar" className="sidebar-full-img" />
        </aside>

        <section className="portal-content">
          <div className="portal-breadcrumb" aria-label="breadcrumb">
            <img src="/home.png" alt="home" className="portal-breadcrumb-home-img" />
            <span className="portal-breadcrumb-sep">‹</span>
            <span className="portal-breadcrumb-sep1">الصفحة الرئيسية</span>
            <span className="portal-breadcrumb-sep">‹</span>
            <span className="portal-breadcrumb-sep1"> خدمة المفقودات </span>
          </div>

          <div className="missing-items-container">
            <button
              className="missing-btn"
              type="button"
              onClick={() => {
                setShowLostForm(true);
                setShowRegisterFoundForm(false);
                setShowFoundItems(false);
              }}
            >
              تسجيل مفقود
            </button>
            <button
              className="missing-btn"
              type="button"
              onClick={() => {
                setShowRegisterFoundForm(true);
                setShowLostForm(false);
                setShowAiQuestions(false);
                setShowFoundItems(false);
              }}
            >
              تسجيل موجود
            </button>
            <button
              className="missing-btn"
              type="button"
              onClick={() => {
                setShowFoundItems(true);
                setShowLostForm(false);
                setShowRegisterFoundForm(false);
                setShowAiQuestions(false);
                setShowFoundAiQuestions(false);
              }}
            >
              تصفح أغراض موجودة
            </button>
          </div>

          {showLostForm && (
            <form className="lost-form" dir="rtl">
              <div className="lost-form-field">
                <label htmlFor="lost-images">رفع صور (اختياري)</label>
                <input
                  id="lost-images"
                  name="lostImages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleLostImagesChange}
                />

                {lostImages.length > 0 && (
                  <div className="lost-uploaded-list" aria-live="polite">
                    {lostImages.map((image, index) => (
                      <div key={`${image.name}-${index}`} className="lost-uploaded-item">
                        <span className="lost-uploaded-name">{image.name}</span>
                        <button
                          type="button"
                          className="lost-remove-btn"
                          onClick={() => removeLostImage(index)}
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lost-form-field">
                <label htmlFor="lost-date">تاريخ الفقد</label>
                <input id="lost-date" name="lostDate" type="date" value={lostDate} onChange={(e) => setLostDate(e.target.value)} required />
              </div>

              <div className="lost-form-field">
                <label htmlFor="lost-location">موقع الفقد</label>
                <select id="lost-location" name="lostLocation" required value={lostLocation} onChange={(e) => setLostLocation(e.target.value)}>
                  <option value="" disabled>اختر موقع الفقد</option>
                  <option value="الكافتيريا">الكافتيريا</option>
                  <option value="كلية الهندسة">كلية الهندسة</option>
                  <option value="كلية الطب">كلية الطب</option>
                  <option value="كلية العلوم">كلية العلوم</option>
                  <option value="كلية تكنولوجيا المعلومات">كلية تكنولوجيا المعلومات</option>
                  <option value="كلية الأعمال">كلية الأعمال</option>
                  <option value="المكتبة">المكتبة</option>
                  <option value="ساحة الجامعة">ساحة الجامعة</option>
                  <option value="موقف السيارات">موقف السيارات</option>
                </select>
              </div>

              <div className="lost-form-field">
                <label htmlFor="lost-type">نوع المفقود</label>
                <input
                  id="lost-type"
                  name="lostType"
                  type="text"
                  placeholder="مثال: هاتف، محفظة، بطاقة"
                  value={lostType}
                  onChange={(e) => setLostType(e.target.value)}
                  required
                />
              </div>

              <div className="lost-form-field">
                <label htmlFor="lost-brand">ماركة المفقود</label>
                <input
                  id="lost-brand"
                  name="lostBrand"
                  type="text"
                  placeholder="مثال: Samsung, Apple, Nike"
                  value={lostBrand}
                  onChange={(e) => setLostBrand(e.target.value)}
                />
              </div>

              <div className="lost-form-actions">
                <button
                  type="button"
                  className="lost-form-btn lost-form-next-btn"
                  onClick={handleNextClick}
                  disabled={isLoading}
                >
                  {isLoading ? "جاري التحليل..." : "التالي"}
                </button>
              </div>
            </form>
          )}

          {showAiQuestions && (
            <div className="ai-questions-container" dir="rtl">
              <h3 className="ai-questions-title">أسئلة إضافية حول المفقود</h3>
              <div className="ai-questions-list">
                {aiQuestions.map((question, index) => (
                  <div key={index} className="ai-question-item">
                    <label htmlFor={`q-${index}`}>{question}</label>
                    <input
                      id={`q-${index}`}
                      type="text"
                      placeholder="اكتب إجابتك"
                      className="ai-question-input"
                    />
                  </div>
                ))}
              </div>
              <div className="ai-form-actions">
                <button
                  type="button"
                  className="lost-form-btn lost-form-submit-btn"
                  onClick={() => {
                    alert("تم تسجيل المفقود بنجاح!");
                    // إضافة المفقود إلى foundItems
                    const newItem = {
                      id: foundItems.length + 1,
                      type: lostType,
                      brand: lostBrand || "غير محدد",
                      location: lostLocation || "غير محدد",
                      date: lostDate || new Date().toISOString().split('T')[0],
                      color: "متعدد",
                      status: "منتظر المالك"
                    };
                    setFoundItems([...foundItems, newItem]);
                    // إعادة تعيين النموذج
                    setShowLostForm(false);
                    setShowAiQuestions(false);
                    setAiQuestions([]);
                    setLostImages([]);
                    setLostType("");
                    setLostBrand("");
                    setLostDate("");
                    setLostLocation("");
                  }}
                >
                  إرسال
                </button>
              </div>
            </div>
          )}

          {showRegisterFoundForm && (
            <form className="lost-form" dir="rtl">
              <div className="lost-form-field">
                <label htmlFor="found-images">رفع صور (إجباري - صورة واحدة على الأقل)</label>
                <input
                  id="found-images"
                  name="foundImages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFoundImagesChange}
                  required
                />

                {foundImages.length > 0 && (
                  <div className="lost-uploaded-list" aria-live="polite">
                    {foundImages.map((image, index) => (
                      <div key={`${image.name}-${index}`} className="lost-uploaded-item">
                        <span className="lost-uploaded-name">{image.name}</span>
                        <button
                          type="button"
                          className="lost-remove-btn"
                          onClick={() => removeFoundImage(index)}
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lost-form-field">
                <label htmlFor="found-date">تاريخ العثور</label>
                <input id="found-date" name="foundDate" type="date" value={foundDate} onChange={(e) => setFoundDate(e.target.value)} required />
              </div>

              <div className="lost-form-field">
                <label htmlFor="found-location">موقع العثور</label>
                <select id="found-location" name="foundLocation" required value={foundLocation} onChange={(e) => setFoundLocation(e.target.value)}>
                  <option value="" disabled>اختر موقع العثور</option>
                  <option value="الكافتيريا">الكافتيريا</option>
                  <option value="كلية الهندسة">كلية الهندسة</option>
                  <option value="كلية الطب">كلية الطب</option>
                  <option value="كلية العلوم">كلية العلوم</option>
                  <option value="كلية تكنولوجيا المعلومات">كلية تكنولوجيا المعلومات</option>
                  <option value="كلية الأعمال">كلية الأعمال</option>
                  <option value="المكتبة">المكتبة</option>
                  <option value="ساحة الجامعة">ساحة الجامعة</option>
                  <option value="موقف السيارات">موقف السيارات</option>
                </select>
              </div>

              <div className="lost-form-field">
                <label htmlFor="found-type">نوع الموجود</label>
                <input
                  id="found-type"
                  name="foundType"
                  type="text"
                  placeholder="مثال: هاتف، محفظة، بطاقة"
                  value={foundType}
                  onChange={(e) => setFoundType(e.target.value)}
                  required
                />
              </div>

              <div className="lost-form-field">
                <label htmlFor="found-brand">ماركة الموجود</label>
                <input
                  id="found-brand"
                  name="foundBrand"
                  type="text"
                  placeholder="مثال: Samsung, Apple, Nike"
                  value={foundBrand}
                  onChange={(e) => setFoundBrand(e.target.value)}
                />
              </div>

              <div className="lost-form-actions">
                <button
                  type="button"
                  className="lost-form-btn lost-form-next-btn"
                  onClick={handleFoundNextClick}
                  disabled={isFoundLoading}
                >
                  {isFoundLoading ? "جاري التحليل..." : "التالي"}
                </button>
              </div>
            </form>
          )}

          {showFoundAiQuestions && (
            <div className="ai-questions-container" dir="rtl">
              <h3 className="ai-questions-title">أسئلة إضافية حول الموجود</h3>
              <div className="ai-questions-list">
                {foundAiQuestions.map((question, index) => (
                  <div key={index} className="ai-question-item">
                    <label htmlFor={`found-q-${index}`}>{question}</label>
                    <input
                      id={`found-q-${index}`}
                      type="text"
                      placeholder="اكتب إجابتك"
                      className="ai-question-input"
                    />
                  </div>
                ))}
              </div>
              <div className="ai-form-actions">
                <button
                  type="button"
                  className="lost-form-btn lost-form-submit-btn"
                  onClick={() => {
                    const newItem = {
                      id: foundItems.length + 1,
                      type: foundType,
                      brand: foundBrand || "غير محدد",
                      location: foundLocation || "غير محدد",
                      date: foundDate || new Date().toISOString().split('T')[0],
                      color: "متعدد",
                      status: "منتظر المالك"
                    };
                    setFoundItems([...foundItems, newItem]);

                    alert("تم تسجيل الموجود بنجاح!");
                    setShowRegisterFoundForm(false);
                    setShowFoundAiQuestions(false);
                    setFoundAiQuestions([]);
                    setFoundImages([]);
                    setFoundType("");
                    setFoundBrand("");
                    setFoundDate("");
                    setFoundLocation("");
                  }}
                >
                  إرسال
                </button>
              </div>
            </div>
          )}

          {showFoundItems && (
            <div className="found-items-container" dir="rtl">
              <div className="found-items-header">
                <h3 className="found-items-title">الأغراض الموجودة</h3>
                <button
                  type="button"
                  className="found-items-close-btn"
                  onClick={() => setShowFoundItems(false)}
                >
                  ✕
                </button>
              </div>
              <div className="found-items-grid">
                {foundItems.length === 0 && <p>لا يوجد أغراض مسجلة حالياً.</p>}
                {foundItems.map((item) => (
                  <div key={item.id} className="found-item-card">
                    <div className="found-item-header">
                      <h4 className="found-item-type">{item.type}</h4>
                      <span className={`found-item-status ${item.status === "تم التسليم" ? "delivered" : item.status === "تمت المطابقة" ? "matched" : "pending"}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="found-item-details">
                      <p><strong>الماركة:</strong> {item.brand}</p>
                      <p><strong>الموقع:</strong> {item.location}</p>
                      <p><strong>اللون:</strong> {item.color}</p>
                      <p><strong>التاريخ:</strong> {item.date}</p>
                    </div>
                    <button
                      className="found-item-claim-btn"
                      type="button"
                      onClick={() => handleStartClaim(item)}
                    >
                      طلب الاسترجاع
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showClaimPage && selectedClaimItem && (
            <div className="claim-page-container" dir="rtl">
              <div className="claim-page-header">
                <h3 className="claim-page-title">التحقق من ملكية الغرض</h3>
                <button
                  type="button"
                  className="found-items-close-btn"
                  onClick={() => {
                    setShowClaimPage(false);
                    setShowFoundItems(true);
                    setClaimResult(null);
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="claim-item-summary">
                <p><strong>النوع:</strong> {selectedClaimItem.type}</p>
                <p><strong>الماركة:</strong> {selectedClaimItem.brand}</p>
                <p><strong>الموقع:</strong> {selectedClaimItem.location}</p>
              </div>

              <div className="claim-questions-list">
                {claimQuestions.map((question, index) => (
                  <div key={index} className="ai-question-item">
                    <label htmlFor={`claim-q-${index}`}>{question}</label>
                    <input
                      id={`claim-q-${index}`}
                      type="text"
                      className="ai-question-input"
                      placeholder="اكتب إجابتك بالتفصيل"
                      value={claimAnswers[index] || ""}
                      onChange={(e) => {
                        const next = [...claimAnswers];
                        next[index] = e.target.value;
                        setClaimAnswers(next);
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="ai-form-actions">
                <button
                  type="button"
                  className="lost-form-btn lost-form-next-btn"
                  onClick={evaluateClaim}
                >
                  تحقق من الطلب
                </button>
              </div>

              {claimResult && (
                <div className={`claim-result ${claimResult.matched ? "success" : "error"}`}>
                  {claimResult.matched ? (
                    <>
                      <p>
                        ✅ تم التحقق بنجاح. رقم الخزانة للاستلام: <strong>{claimResult.lockerNumber}</strong>
                      </p>
                      <button
                        type="button"
                        className="claim-qr-btn"
                        onClick={handleQrScanOpenLocker}
                      >
                        مسح QR الموجود على الخزانة لفتحها
                      </button>
                    </>
                  ) : (
                    <p>❌ لم يتم التوافق حالياً. يرجى مراجعة الإجابات أو التواصل مع الإدارة.</p>
                  )}
                </div>
              )}

              {isScannerOpen && (
                <div className="qr-scanner-modal" role="dialog" aria-modal="true" aria-label="QR Scanner">
                  <div className="qr-scanner-panel">
                    <h4 className="qr-scanner-title">وجّه الكاميرا نحو QR على الخزانة</h4>
                    <video ref={videoRef} className="qr-scanner-video" playsInline muted autoPlay />
                    {scannerError && <p className="qr-scanner-error">{scannerError}</p>}
                    <div className="qr-scanner-actions">
                      <button type="button" className="lost-form-btn lost-form-next-btn" onClick={stopScanner}>
                        إغلاق الكاميرا
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
