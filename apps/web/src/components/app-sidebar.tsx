"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar as SharedAppSidebar } from "@crm-fran/ui/components/app-sidebar"
import { authClient } from "@/lib/auth-client"
import * as React from "react"

export function AppSidebar(props: React.ComponentProps<typeof SharedAppSidebar>) {
    const pathname = usePathname()
    const router = useRouter()

    const { data: session } = authClient.useSession()

    const handleSignOut = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login")
                }
            }
        })
    }

    const currentUser = session?.user ? {
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image ?? "",
    } : undefined

    return (
        <SharedAppSidebar
            LinkComponent={Link}
            currentPathname={pathname}
            user={currentUser}
            onSignOut={handleSignOut}
            {...props}
        />
    )
}