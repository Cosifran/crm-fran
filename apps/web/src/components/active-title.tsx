"use client"
import { usePathname } from "next/navigation"
const ROUTE_MAP: Record<string, string> = {
    "/": "Dashboard",
    "/alerts": "Alertas",
    "/users": "Usuarios",
    "/leads": "Leads",
    "/personal-statistics": "Estadísticas personales",
    "/feedback-statistics": "Estadísticas de feedback",
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
