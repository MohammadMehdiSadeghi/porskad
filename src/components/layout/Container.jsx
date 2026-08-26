// همه‌ی سکشن‌های صفحه عرض محتواشون رو از این کامپوننت می‌گیرند.
// layout.container = 1200px (75rem) — مثل رکاد
export default function Container({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag className={`w-full max-w-[75rem] mx-auto ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
