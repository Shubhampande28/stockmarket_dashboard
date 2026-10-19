import Link from "next/link";

export default function Logo({ size = "normal" }: { size?: "normal" | "large" }) {
  return (
    <Link
      href="/"
      className={
        size === "large"
          ? "text-[52px] font-extrabold leading-none tracking-[-0.05em] sm:text-[76px]"
          : "text-[1.2rem] font-bold tracking-tight"
      }
    >
      Equi<span className="text-brand">lytics</span>
    </Link>
  );
}
