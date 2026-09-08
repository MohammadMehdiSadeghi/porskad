// ══════════════════════════════════════════════════════════════
// آیکون‌های نوع سوال — Lucide React
// ══════════════════════════════════════════════════════════════

import {
  Type,
  AlignLeft,
  Phone,
  CheckSquare,
  Image,
  ChevronDown,
  ToggleLeft,
  Sliders,
  Gauge,
  Star,
  Grid,
  ListOrdered,
  Mail,
  Hash,
  Globe,
  Send,
  Info,
  Layers,
  Upload,
  CreditCard,
} from "lucide-react";

export const QUESTION_TYPE_ICONS = {
  // گزینه‌ای و مقیاسی
  choice: CheckSquare,
  picture_choice: Image,
  dropdown: ChevronDown,
  yes_no: ToggleLeft,
  likert: Sliders,
  nps: Gauge,
  rating: Star,
  matrix: Grid,
  ranking: ListOrdered,

  // متنی و اطلاعات تماس
  short_text: Type,
  long_text: AlignLeft,
  number: Hash,
  email: Mail,
  phone_ir: Phone,
  link: Globe,
  telegram_id: Send,

  // پیشرفته و ساختار
  statement: Info,
  group: Layers,
  file_upload: Upload,
  payment: CreditCard,
};
