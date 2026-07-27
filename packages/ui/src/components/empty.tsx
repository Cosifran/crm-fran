import * as React from "react";

import { cn } from "@crm-fran/ui/lib/utils";

interface EmptyProps extends React.ComponentProps<"div"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

function Empty({
  className,
  title,
  description,
  children,
  ...props
}: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-10 text-center",
        className,
      )}
      {...props}
    >
      {title && <p className="text-sm font-medium">{title}</p>}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}

export { Empty };
