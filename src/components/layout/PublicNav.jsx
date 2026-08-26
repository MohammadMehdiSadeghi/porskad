import { Link } from "react-router-dom";
import Logo from "../ui/Logo";
import Button from "../ui/Button";

export default function PublicNav() {
  return (
    <header className="sticky top-0 z-40 bg-bg-mint/90 backdrop-blur shadow-navbar">
      <div className="w-full max-w-[75rem] mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <nav className="hidden sm:flex items-center gap-6 text-base2 font-bold text-navy">
          <a href="#features" className="hover:text-teal-text transition-colors">امکانات</a>
          <a href="#how" className="hover:text-teal-text transition-colors">چطور کار می‌کند</a>
          <a href="#faq" className="hover:text-teal-text transition-colors">سوال‌های پرتکرار</a>
        </nav>
        <div className="flex items-center gap-3">
          <Button as={Link} to="/admin" variant="navy" size="sm" rotate="-rotate-[1.5deg]">
            ورود ادمین
          </Button>
        </div>
      </div>
    </header>
  );
}
