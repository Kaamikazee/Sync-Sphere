"use client";
import React from "react";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface Props {
  href: string;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | null;
  size?: "default" | "sm" | "icon" | "lg" | null;
  children?: React.ReactNode;
  include?: string;
  workspaceIcon?: boolean;
}
const ActiveLink = React.forwardRef<HTMLAnchorElement, Props>(
  (
    {
      href,
      className,
      variant,
      size = "default",
      children,
      include,
      workspaceIcon,
      ...props
    }: Props,
    ref
  ) => {
    const pathname = usePathname();
    return (
      <Link
        href={href}
        className={cn(
          `${buttonVariants({ variant, size })} ${
            href === pathname || (include && pathname.includes(include))
              ? workspaceIcon ? "font-semibold border-secondary-foreground border-2" : "bg-secondary font-semibold"
              : ""
          }`,
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

ActiveLink.displayName = "ActiveLink";


export default ActiveLink;