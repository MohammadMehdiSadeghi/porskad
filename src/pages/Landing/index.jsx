import React, { useState } from "react";
import SEO from "../../components/ui/SEO";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import SocialProof from "./components/SocialProof";
import ProblemSolution from "./components/ProblemSolution";
import Features from "./components/Features";
import ProductShowcase from "./components/ProductShowcase";
import AnalyticsHighlight from "./components/AnalyticsHighlight";
import Security from "./components/Security";
import Integrations from "./components/Integrations";
import Pricing from "./components/Pricing";
import FAQ from "./components/FAQ";
import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";
import DemoModal from "./components/DemoModal";

export default function Landing() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] selection:bg-[#2DD4BF] selection:text-[#0B0F19] overflow-x-hidden font-sans">
      <SEO
        title="فرمساز آنلاین فارسی با منطق شرطی و تحلیل زنده"
        description="با پرسکاد فرم و پرسشنامه حرفه‌ای بساز؛ منطق شرطی هوشمند، داشبورد تحلیلی زنده، خروجی اکسل فارسی سالم و امنیت سطح دیتابیس — رایگان شروع کن."
        keywords="فرمساز فارسی, ساخت فرم آنلاین, پرسشنامه آنلاین, فرمساز با منطق شرطی, تایپ فرم فارسی, خروجی اکسل سالم فارسی, پرسکاد, porskad"
      />

      {/* ۱. Navbar */}
      <Navbar onOpenDemo={() => setIsDemoOpen(true)} />

      {/* ۲. Hero Section */}
      <Hero onOpenDemo={() => setIsDemoOpen(true)} />

      {/* ۳. Social Proof / نوار اعتماد */}
      <SocialProof />

      {/* ۴. مشکل → راه‌حل */}
      <ProblemSolution />

      {/* ۵. ویژگی‌های محوری */}
      <Features />

      {/* ۶. نمایش محصول و فرم‌ساز ماژولار */}
      <ProductShowcase />

      {/* ۷. بخش تحلیل و داشبورد */}
      <AnalyticsHighlight />

      {/* ۸. امنیت و زیرساخت */}
      <Security />

      {/* ۹. یکپارچه‌سازی‌ها */}
      <Integrations />

      {/* ۱۰. جدول پلن‌ها و قیمت‌گذاری */}
      <Pricing />

      {/* ۱۱. سوالات متداول */}
      <FAQ />

      {/* ۱۲. کال تو اکشن نهایی */}
      <FinalCTA />

      {/* ۱۳. فوتر */}
      <Footer />

      {/* پنجره مودال دموی تعاملی */}
      <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </div>
  );
}
