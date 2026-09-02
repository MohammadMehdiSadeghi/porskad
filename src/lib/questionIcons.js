// ══════════════════════════════════════════════════════════════
// آیکون‌های نوع سوال — Lucide React
// منبع: https://icones.hxlab.ir/ → Lucide
// ══════════════════════════════════════════════════════════════

import {
  Type,
  AlignLeft,
  Phone,
  CheckSquare,
  Mail,
  Hash,
  Star,
  ToggleLeft,
  Send,
} from "lucide-react";

export const QUESTION_TYPE_ICONS = {
  short_text: Type,
  long_text: AlignLeft,
  phone_ir: Phone,
  choice: CheckSquare,
  email: Mail,
  number: Hash,
  rating: Star,
  yes_no: ToggleLeft,
  telegram_id: Send,
};
