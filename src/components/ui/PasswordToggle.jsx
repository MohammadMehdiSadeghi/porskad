import React from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Animated Password/Token reveal toggle button.
 * - Prevents transform collision with parent translateY(-50%)
 * - Smooth rotation and micro-scaling on toggle
 * - Accessible with proper aria-label
 */
export default function PasswordToggle({
  visible,
  onToggle,
  size = 17,
  className = "",
  ariaLabel,
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={ariaLabel || (visible ? "مخفی کردن" : "نمایش")}
      className={`password-toggle-btn no-anim text-ink-subtle hover:text-navy dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer ${className}`}
    >
      <span
        className={`password-toggle-icon ${
          visible ? "is-active" : ""
        }`}
      >
        {visible ? <EyeOff size={size} /> : <Eye size={size} />}
      </span>
    </button>
  );
}
