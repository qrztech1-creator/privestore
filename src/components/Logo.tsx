import logo from "@/assets/logo-prive.png";

export function Logo({ className = "h-10" }: { className?: string }) {
  return <img src={logo} alt="Privê" className={className} />;
}
