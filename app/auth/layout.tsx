import { Logo } from "@/components/app/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-svh overflow-hidden bg-background">
      <div aria-hidden className="absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-24 -right-24 -z-10 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
      <header className="absolute left-0 right-0 top-0 mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      {children}
    </div>
  );
}
