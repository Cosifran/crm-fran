"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AppSidebar as SharedAppSidebar } from "@crm-fran/ui/components/app-sidebar"
export function AppSidebar(props: React.ComponentProps<typeof SharedAppSidebar>) {
    const pathname = usePathname()
    return (
        <SharedAppSidebar
            LinkComponent={Link}
            currentPathname={pathname}
            {...props}
        />
    )
}