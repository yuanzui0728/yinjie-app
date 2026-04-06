import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function AppPage({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-6 px-4 py-6 sm:px-5", className)} {...props} />;
}
