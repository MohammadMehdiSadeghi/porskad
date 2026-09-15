import { Link } from "react-router-dom";
import Logo from "../ui/Logo";
import Button from "../ui/Button";

export default function PublicNav() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md border-b border-[#EAEAEA] dark:border-gray-800">
      <div className="w-full max-w-[75rem] mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <div className="flex items-center gap-3">
          <Button as={Link} to="/admin" variant="sec" size="sm">
            ورود ادمین
          </Button>
        </div>
      </div>
    </header>
  );
}

