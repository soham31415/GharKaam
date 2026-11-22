"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckIcon, XIcon, InfoIcon, Loader2Icon } from "lucide-react"

/**
 * Gharkaam toasts: a dark pill at the top centre with a coloured round icon,
 * 3 seconds, optional Undo action (styles in globals.css under .gk-toast).
 * Sonner's own enter/exit motion and swipe-to-dismiss are kept as they are.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      duration={3000}
      offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 8px)", left: "16px", right: "16px" }}
      className="toaster group"
      icons={{
        success: (
          <span className="flex size-[22px] items-center justify-center rounded-full bg-[#22C55E]">
            <CheckIcon className="size-[13px] text-[#052E16]" strokeWidth={3.4} />
          </span>
        ),
        error: (
          <span className="flex size-[22px] items-center justify-center rounded-full bg-[#F87171]">
            <XIcon className="size-[13px] text-[#450A0A]" strokeWidth={3.4} />
          </span>
        ),
        info: (
          <span className="flex size-[22px] items-center justify-center rounded-full bg-white/20">
            <InfoIcon className="size-[14px] text-white" strokeWidth={2.6} />
          </span>
        ),
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{ className: "gk-toast" }}
      {...props}
    />
  )
}

export { Toaster }
