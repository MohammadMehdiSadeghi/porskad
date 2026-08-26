import Logo from "../ui/Logo";

export default function PublicNav() {
  return (
    <header className="sticky top-0 z-40 bg-bg-mint/95 backdrop-blur-md border-b border-navy/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        <Logo />
      </div>
    </header>
  );
}
