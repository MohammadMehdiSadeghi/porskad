import { Helmet } from "react-helmet-async";

const SITE_NAME = "پرس کاد";
const SITE_URL = "https://porskad.vercel.app";
const DEFAULT_DESCRIPTION = "پرس کاد — سیستم اختصاصی فرم و نظرسنجی مؤسسه رکاد";

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  url,
  image,
  noIndex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | سیستم اختصاصی فرم و نظرسنجی مؤسسه رکاد`;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      {image && <meta property="og:image" content={image} />}

      {/* Twitter */}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {/* Canonical */}
      <link rel="canonical" href={fullUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
