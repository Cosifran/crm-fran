import { AppSidebar } from "@/components/app-sidebar";
import { ActiveTitle } from "@/components/active-title";
import { ModeToggle } from "@/components/mode-toggle";

import { SiteHeader } from "@crm-fran/ui/components/site-header";
import {
    SidebarInset,
    SidebarProvider,
} from "@crm-fran/ui/components/sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />

            <SidebarInset>
                <SiteHeader toggle={<ModeToggle />}>
                    <ActiveTitle />
                </SiteHeader>

                <div className="flex flex-1 flex-col">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}