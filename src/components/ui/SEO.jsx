import { Helmet } from "react-helmet-async";

const SITE_NAME = "پرس‌کاد";
const SITE_URL = "https://porskad.vercel.app";
const DEFAULT_TITLE = "پرس‌کاد | سامانه آنلاین ساخت فرم، آزمون و نظرسنجی هوشمند";
const DEFAULT_DESCRIPTION = "پرس‌کاد، پلتفرم هوشمند و پیشرفته ساخت انواع فرم‌های آنلاین، نظرسنجی، ثبت‌نام و آزمون‌های چندمرحله‌ای با تحلیل آماری لحظه‌ای و اشتراک‌گذاری سریع.";
const DEFAULT_KEYWORDS = "فرم ساز آنلاین, نظرسنجی آنلاین, ساخت آزمون آنلاین, پرسشنامه آنلاین, پرس‌کاد, فرم ساز هوشمند, فرم ثبت نام, فرم ساز تعاملی, تایپ فرم فارسی, porskad";
const DEFAULT_IMAGE = "https://porskad.vercel.app/favicon.svg";

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  url,
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="پرس‌کاد (Porskad)" />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fa_IR" />
      {image && <meta property="og:image" content={image} />}

      {/* Twitter */}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {/* Canonical */}
      <link rel="canonical" href={fullUrl} />
    </Helmet>
  );
}
