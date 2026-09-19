import React, { useState } from "react";
import {
  GripVertical,
  Plus,
  Eye,
  Edit3,
  GitBranch,
  CheckCircle,
  Layers,
  ArrowLeft,
  Settings,
  Sparkles
} from "lucide-react";
import StickerCard from "../../../components/ui/StickerCard";
import Badge from "../../../components/ui/Badge";

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
    <section id="showcase" className="py-20 md:py-28 bg-[#F8F9FA] dark:bg-[#0B0F17] dot-pattern border-t-2 border-[#202A5A]/10 dark:border-[#59BBAF]/20 relative overflow-hidden transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="flex justify-center mb-4">
            <Badge theme="teal" size="md" dot>
              <Layers size={14} className="ml-1.5" />
              رابط کاربری فرم‌ساز ماژولار
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#202A5A] dark:text-white leading-tight mb-4 whitespace-normal lg:whitespace-nowrap">
            فرمساز ماژولار؛ مرتب‌سازی، تنظیم، انتشار
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300">
            بدون کدنویسی، سوالات را بچین، ترتیب را تغییر بده و شروط پرش را در چند کلیک تعریف کن. همه‌چیز به‌صورت زنده روی پیش‌نمایش دیده می‌شود.
          </p>
        </div>

        {/* فریم شبیه‌ساز پنل فرم‌ساز - Neo-brutalist StickerCard */}
        <StickerCard
          theme="white"
          borderWidth="border-2"
          shadow="shadow-[4px_4px_0_#202A5A] dark:shadow-[4px_4px_0_#59BBAF]"
          className="p-0 overflow-hidden"
        >
          {/* هدر پنل فرم‌ساز */}
          <div className="bg-slate-100 dark:bg-[#131B2E] px-6 py-4 border-b-2 border-[#202A5A]/15 dark:border-[#59BBAF]/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#E0195B] border border-black/20" />
                <span className="w-3.5 h-3.5 rounded-full bg-[#F8A41D] border border-black/20" />
                <span className="w-3.5 h-3.5 rounded-full bg-[#59BBAF] border border-black/20" />
              </div>
              <span className="text-sm font-black text-[#202A5A] dark:text-white border-r-2 border-[#202A5A]/15 dark:border-[#59BBAF]/20 pr-3 mr-1">
                پرسشنامه بازخورد مشتریان (نسخه آزمایشی)
              </span>
              <Badge theme="teal" size="sm">
                فعال و آنلاین
              </Badge>
            </div>

            {/* تب‌های ویرایشگر / پیش‌نمایش */}
            <div className="flex items-center bg-white dark:bg-[#0B0F17] p-1 rounded-xl border-2 border-[#202A5A]/20 dark:border-[#59BBAF]/30 shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]">
              <button
                onClick={() => setActiveTab("builder")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                  activeTab === "builder"
                    ? "bg-[#59BBAF] text-slate-950 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Edit3 size={14} />
                <span>طراحی فرم</span>
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                  activeTab === "preview"
                    ? "bg-[#59BBAF] text-slate-950 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Eye size={14} />
                <span>پیش‌نمایش زنده</span>
              </button>
            </div>
          </div>

          {/* بدنه پنل */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
            {/* ستون راست: لیست سوالات */}
            <div className="lg:col-span-5 p-5 sm:p-6 border-b-2 lg:border-b-0 lg:border-l-2 border-[#202A5A]/15 dark:border-[#59BBAF]/20 bg-slate-50 dark:bg-[#0B0F17]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black text-[#202A5A] dark:text-white uppercase tracking-wider">
                  لیست سوالات و گام‌ها
                </span>
                <Badge theme="navy" size="sm">
                  <GripVertical size={12} className="ml-1" /> جابجایی ترتیبی
                </Badge>
              </div>

              <div className="space-y-3">
                {sampleQuestions.map((q) => {
                  const isSelected = selectedQuestion === q.id;
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuestion(q.id)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-[#59BBAF]/15 dark:bg-[#59BBAF]/20 border-[#59BBAF] shadow-[2.5px_2.5px_0_#59BBAF]"
                          : "bg-white dark:bg-[#131B2E] border-[#202A5A]/20 dark:border-white/10 hover:border-[#59BBAF] dark:hover:border-[#59BBAF] shadow-[2px_2px_0_#202A5A]/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white" />
                        <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-black ${
                          isSelected
                            ? "bg-[#59BBAF] text-slate-950 border-[#202A5A]"
                            : "bg-slate-100 dark:bg-[#0B0F17] text-slate-700 dark:text-slate-300 border-[#202A5A]/20 dark:border-white/10"
                        }`}>
                          {q.id}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black text-[#202A5A] dark:text-white mb-0.5">
                            {q.title}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>{q.type}</span>
                            {q.condition && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#652D90]/15 text-[#652D90] dark:text-[#c084fc] font-black flex items-center gap-0.5 border border-[#652D90]/30">
                                <GitBranch size={10} /> شرطی
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#59BBAF] ring-2 ring-[#59BBAF]/30 animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t-2 border-[#202A5A]/10 dark:border-[#59BBAF]/20">
                <button className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#59BBAF] text-[#202A5A] dark:text-[#59BBAF] hover:bg-[#59BBAF]/10 text-xs font-black flex items-center justify-center gap-2 transition-all">
                  <Plus size={16} />
                  <span>افزودن سوال جدید</span>
                </button>
              </div>
            </div>

            {/* ستون چپ: پیش‌نمایش یا ویرایشگر تنظیمات سوال */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-[#131B2E]">
              {activeTab === "builder" ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b-2 border-[#202A5A]/10 dark:border-[#59BBAF]/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تنظیمات سوال فعال:</span>
                      <span className="text-xs font-black text-[#59BBAF] bg-[#59BBAF]/10 px-2 py-0.5 rounded-lg border border-[#59BBAF]/30">
                        سوال شماره {selectedQuestion}
                      </span>
                    </div>
                    <Badge theme="teal" size="sm">
                      ذخیره خودکار زنده
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-[#202A5A] dark:text-white block mb-2">عنوان سوال</label>
                      <input
                        type="text"
                        value={sampleQuestions.find((q) => q.id === selectedQuestion)?.title || ""}
                        readOnly
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0B0F17] border-2 border-[#202A5A]/20 dark:border-[#59BBAF]/30 rounded-xl text-sm font-black text-[#202A5A] dark:text-white outline-none shadow-[2px_2px_0_#202A5A]/10"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-[#202A5A] dark:text-white block mb-2">نوع فیلد</label>
                        <div className="px-4 py-3 bg-slate-50 dark:bg-[#0B0F17] border-2 border-[#202A5A]/20 dark:border-[#59BBAF]/30 rounded-xl text-xs font-black text-[#202A5A] dark:text-[#59BBAF]">
                          {sampleQuestions.find((q) => q.id === selectedQuestion)?.type}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-black text-[#202A5A] dark:text-white block mb-2">پاسخ الزامی</label>
                        <div className="px-4 py-3 bg-slate-50 dark:bg-[#0B0F17] border-2 border-[#202A5A]/20 dark:border-[#59BBAF]/30 rounded-xl text-xs font-black text-[#59BBAF] flex items-center gap-2">
                          <CheckCircle size={16} />
                          <span>فعال (الزامی)</span>
                        </div>
                      </div>
                    </div>

                    {/* منطق شرطی نمایشی */}
                    <div className="p-4 rounded-2xl bg-[#652D90]/5 dark:bg-[#652D90]/15 border-2 border-[#652D90]/30 shadow-[2px_2px_0_#652D90]/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black text-[#652D90] dark:text-[#d8b4fe]">
                        <GitBranch size={16} />
                        <span>منطق شرطی هوشمند (Logic Branching)</span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                        اگر کاربر گزینه «بله» را انتخاب کرد ➔ مستقیماً به سوال شماره ۳ هدایت شود.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* حالت پیش‌نمایش زنده */
                <div className="py-8 text-center space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#59BBAF] text-slate-950 border-2 border-[#202A5A] flex items-center justify-center mx-auto shadow-[3px_3px_0_#202A5A]">
                    <Eye size={26} />
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-black text-[#202A5A] dark:text-white mb-2">پیش‌نمایش واکنش‌گرا</h4>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                      فرم شما به‌صورت روان و متناسب با دستگاه مخاطب نشان داده خواهد شد.
                    </p>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-[#0B0F17] border-2 border-[#202A5A]/20 dark:border-[#59BBAF]/30 rounded-2xl max-w-md mx-auto text-right space-y-3 shadow-[3px_3px_0_#202A5A]/10">
                    <Badge theme="teal" size="sm">گام ۱ از ۴</Badge>
                    <h5 className="text-sm sm:text-base font-black text-[#202A5A] dark:text-white">نام و نام خانوادگی خود را بنویسید</h5>
                    <input
                      type="text"
                      placeholder="متن پاسخ شما..."
                      className="w-full px-4 py-3 bg-white dark:bg-[#131B2E] border-2 border-[#202A5A]/20 dark:border-[#59BBAF]/30 rounded-xl text-xs font-bold text-[#202A5A] dark:text-white"
                      readOnly
                    />
                  </div>
                </div>
              )}

              <div className="pt-6 border-t-2 border-[#202A5A]/10 dark:border-[#59BBAF]/20 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">بدون نیاز به نوشتن حتی یک خط کد</span>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#202A5A] dark:text-[#59BBAF] hover:underline"
                >
                  <span>شروع ساخت فرم با تمام قابلیت‌ها</span>
                  <ArrowLeft size={14} />
                </a>
              </div>
            </div>
          </div>
        </StickerCard>
      </div>
    </section>
  );
}
