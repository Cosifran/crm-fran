"use client";

import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@crm-fran/ui/components/drawer";
import { Button } from "@crm-fran/ui/components/button";

interface LeadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: "view" | "edit";
  description?: string;
  /**
   * id del <form> activo dentro del drawer. El botón Guardar del footer
   * se asocia a ese form para disparar su submit. Si no se provee,
   * el footer se renderiza sin botón Guardar (degradación segura).
   */
  submitFormId?: string;
  /** Label del botón Guardar del footer. Default: "Guardar". */
  submitLabel?: string;
  children: ReactNode;
}

export default function LeadDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  type,
  submitFormId,
  submitLabel = "Guardar",
}: LeadDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="flex h-screen max-w-xl flex-col p-0">
        <DrawerHeader className="border-b px-6 py-5">
          <DrawerTitle>{title}</DrawerTitle>

          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {type === "edit" && (
          <DrawerFooter className="border-t px-6 py-4">
            <div className="grid grid-cols-1 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>

              {submitFormId && (
                <Button type="submit" form={submitFormId}>
                  {submitLabel}
                </Button>
              )}
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
