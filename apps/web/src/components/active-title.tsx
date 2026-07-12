"use client"
import { usePathname } from "next/navigation"
const ROUTE_MAP: Record<string, string> = {
    "/": "Dashboard",
    "/users": "Usuarios",
    "/leads": "Leads",
    "/analytical": "Analitica",
    "/campaigns": "Campañas",
    "/calendar": "Calendario",
    "/ranking": "Ranking",
    "/tickets": "Tickets",
    "/login": "Iniciar Sesión",
    "/signup": "Registrarse",
}
export function ActiveTitle() {
    const pathname = usePathname()
    return <>{ROUTE_MAP[pathname] ?? "CRM"}</>
}