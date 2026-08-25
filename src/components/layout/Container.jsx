export default function Container({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag className={`w-full max-w-7xl mx-auto ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
