import React, { useState } from "react";
import {
  GripVertical,
  Plus,
  Settings,
  Eye,
  Edit3,
  GitBranch,
  Trash2,
  CheckCircle,
  Smartphone,
  Laptop,
  Sparkles,
  Layers,
  ArrowLeft
} from "lucide-react";

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState("builder"); // 'builder' | 'preview'
  const [selectedQuestion, setSelectedQuestion] = useState(1);

  const sampleQuestions = [
    {
      id: 1,
      title: "نام و نام خانوادگی",
      type: "متن کوتاه (Text)",
      required: true,
      condition: null,
    },
    {
      id: 2,
      title: "آیا قبلاً از سرویس‌های آنلاین مشابه استفاده کرده‌اید؟",
      type: "چندگزینه‌ای (Single Choice)",
      required: true,
      condition: "اگر پاسخ = بله ➔ پرش به سوال ۳",
    },
    {
      id: 3,
      title: "شماره موبایل جهت دریافت کد تخفیف",
      type: "موبایل ایران (Phone)",
      required: true,
      condition: null,
    },
    {
      id: 4,
      title: "میزان رضایت از روند ثبت‌نام",
      type: "امتیاز ستاره‌ای (Rating)",
      required: false,
      condition: null,
    },
  ];

  return (
    <section id="showcase" className="py-20 md:py-28 bg-[#0B0F19] border-t border-[#1E293B]/60 relative overflow-hidden">
      {/* هاله‌های پس‌زمینه */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#2DD4BF]/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131B2E] border border-[#38BDF8]/30 text-xs font-bold text-[#38BDF8] mb-4">
            <Layers size={14} />
            رابط کاربری فرم‌ساز ماژولار
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            فرمساز ماژولار؛ کشیدن، رها کردن، انتشار
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8]">
            بدون کدنویسی، سوالات را با درگ‌ان‌دراپ بچین، ترتیب را تغییر بده و شروط پرش را در چند کلیک تعریف کن. همه‌چیز به‌صورت زنده روی پیش‌نمایش دیده می‌شود.
          </p>
        </div>

        {/* فریم شبیه‌ساز پنل فرم‌ساز */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-3xl shadow-2xl overflow-hidden">
          {/* هدر پنل فرم‌ساز */}
          <div className="bg-[#0B0F19] px-6 py-4 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#F43F5E]" />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              </div>
              <span className="text-sm font-bold text-white border-r border-[#1E293B] pr-3 mr-1">
                پرسشنامه بازخورد مشتریان (نسخه آزمایشی)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] text-[11px] font-bold">
                فعال و آنلاین
              </span>
            </div>

            {/* تب‌های ویرایشگر / پیش‌نمایش */}
            <div className="flex items-center bg-[#131B2E] p-1 rounded-xl border border-[#1E293B]">
              <button
                onClick={() => setActiveTab("builder")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "builder"
                    ? "bg-[#2DD4BF] text-[#0B0F19]"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                <Edit3 size={14} />
                <span>طراحی فرم</span>
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "preview"
                    ? "bg-[#2DD4BF] text-[#0B0F19]"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                <Eye size={14} />
                <span>پیش‌نمایش زنده</span>
              </button>
            </div>
          </div>

          {/* بدنه پنل */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
            {/* ستون راست: لیست سوالات (درگ اند دراپ و شروط) */}
            <div className="lg:col-span-5 p-5 sm:p-6 border-b lg:border-b-0 lg:border-l border-[#1E293B] bg-[#0E1524]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                  لیست سوالات و گام‌ها ({sampleQuestions.length})
                </span>
                <span className="text-[11px] font-bold text-[#2DD4BF] bg-[#2DD4BF]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <GripVertical size={12} /> Drag & Drop
                </span>
              </div>

              <div className="space-y-3">
                {sampleQuestions.map((q) => {
                  const isSelected = selectedQuestion === q.id;
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuestion(q.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-[#131B2E] border-[#2DD4BF] shadow-lg shadow-[#2DD4BF]/10"
                          : "bg-[#131B2E]/60 border-[#1E293B] hover:border-[#38BDF8]/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-[#64748B] hover:text-white" />
                        <div className="w-6 h-6 rounded-lg bg-[#0B0F19] text-[#2DD4BF] flex items-center justify-center text-xs font-black">
                          {q.id}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-white mb-0.5">
                            {q.title}
                          </div>
                          <div className="text-[11px] text-[#94A3B8] flex items-center gap-2">
                            <span>{q.type}</span>
                            {q.condition && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#A855F7]/20 text-[#A855F7] font-bold flex items-center gap-0.5">
                                <GitBranch size={10} /> شرطی
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-[#1E293B]">
                <button className="w-full py-3 rounded-xl border border-dashed border-[#2DD4BF]/40 text-[#2DD4BF] hover:bg-[#2DD4BF]/10 text-xs font-bold flex items-center justify-center gap-2 transition-all">
                  <Plus size={16} />
                  <span>افزودن سوال جدید (از ۸ فیلد استاندارد)</span>
                </button>
              </div>
            </div>

            {/* ستون چپ: پیش‌نمایش یا ویرایشگر تنظیمات سوال */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-[#131B2E]">
              {activeTab === "builder" ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#94A3B8]">تنظیمات سوال فعال:</span>
                      <span className="text-xs font-black text-[#2DD4BF]">
                        سوال شماره {selectedQuestion}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#10B981] font-bold bg-[#10B981]/10 px-2 py-0.5 rounded">
                      ذخیره زنده و آنی (Auto-save)
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-[#94A3B8] block mb-2">عنوان سوال</label>
                      <input
                        type="text"
                        value={sampleQuestions.find((q) => q.id === selectedQuestion)?.title || ""}
                        readOnly
                        className="w-full px-4 py-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-sm font-bold text-white outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-[#94A3B8] block mb-2">نوع فیلد</label>
                        <div className="px-4 py-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-xs font-bold text-[#38BDF8]">
                          {sampleQuestions.find((q) => q.id === selectedQuestion)?.type}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#94A3B8] block mb-2">پاسخ الزامی</label>
                        <div className="px-4 py-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-xs font-bold text-[#10B981] flex items-center gap-2">
                          <CheckCircle size={16} />
                          <span>فعال (الزامی)</span>
                        </div>
                      </div>
                    </div>

                    {/* منطق شرطی نمایشی */}
                    <div className="p-4 rounded-2xl bg-[#0B0F19] border border-[#A855F7]/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#A855F7]">
                        <GitBranch size={16} />
                        <span>منطق شرطی پیشرفته (Logic Branching)</span>
                      </div>
                      <p className="text-xs text-[#94A3B8]">
                        اگر کاربر گزینه «بله» را انتخاب کرد ➔ مستقیماً به سوال شماره ۳ هدایت شود.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* حالت پیش‌نمایش زنده */
                <div className="py-8 text-center space-y-6">
                  <div className="w-12 h-12 rounded-full bg-[#2DD4BF]/20 text-[#2DD4BF] flex items-center justify-center mx-auto">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white mb-2">پیش‌نمایش واکنش‌گرا</h4>
                    <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                      فرم شما دقیقاً به همین صورت و بدون لگ روی موبایل و دسکتاپ به مخاطب نشان داده خواهد شد.
                    </p>
                  </div>
                  <div className="p-6 bg-[#0B0F19] border border-[#1E293B] rounded-2xl max-w-md mx-auto text-right space-y-3">
                    <span className="text-xs font-bold text-[#2DD4BF]">گام ۱ از ۴</span>
                    <h5 className="text-base font-black text-white">نام و نام خانوادگی خود را بنویسید</h5>
                    <input
                      type="text"
                      placeholder="متن پاسخ شما..."
                      className="w-full px-4 py-3 bg-[#131B2E] border border-[#1E293B] rounded-xl text-xs text-white"
                      readOnly
                    />
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-[#1E293B] flex items-center justify-between">
                <span className="text-xs text-[#94A3B8]">بدون نیاز به نوشتن حتی یک خط کد</span>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#2DD4BF] hover:underline"
                >
                  <span>شروع ساخت فرم با تمام قابلیت‌ها</span>
                  <ArrowLeft size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
