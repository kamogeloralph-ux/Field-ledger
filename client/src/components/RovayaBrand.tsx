import React from "react";
import { cn } from "@/lib/utils";

export function RovayaBrand({ className, imageClassName, subtitle = "Fleet Manager" }: { className?: string; imageClassName?: string; subtitle?: string | null }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", className)}>
      <img
        src={`${import.meta.env.BASE_URL}rovaya-wordmark-logo.png`}
        alt="Rovaya"
        className={cn("h-auto w-[min(15rem,72vw)] object-contain", imageClassName)}
      />
      {subtitle ? <span className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[#6b7264]">{subtitle}</span> : null}
    </div>
  );
}
