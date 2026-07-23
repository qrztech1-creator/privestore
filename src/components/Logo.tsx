import logo from "@/assets/logo-prive.png";

export function Logo({ className = "h-16" }: { className?: string }) {
  return <img src={logo} alt="Privê" className={className} />;
}
