import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}

export function Logo({ src, alt, className, sizes = "8rem" }: LogoProps) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-contain" />
    </div>
  );
}