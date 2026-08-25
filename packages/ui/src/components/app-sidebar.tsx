"use client"

import * as React from "react"

import { NavMain } from "@crm-fran/ui/components/nav-main"
import { NavSecondary } from "@crm-fran/ui/components/nav-secondary"
import { NavUser } from "@crm-fran/ui/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@crm-fran/ui/components/sidebar"
import { BrainCircuitIcon, FlaskConicalIcon, CircleAlertIcon, HouseIcon, ChartBarIcon, CalendarDaysIcon, ChartNoAxesCombinedIcon, CameraIcon, FileTextIcon, Settings2Icon, CircleHelpIcon, SearchIcon, DatabaseIcon, FileChartColumnIcon, FileIcon, CommandIcon, MessageSquareIcon, TrophyIcon, ListChecksIcon, BadgeEuroIcon, GoalIcon } from "lucide-react"
import { usePermissions } from "@crm-fran/ui/permissions"
import type { Permission } from "@crm-fran/db/schema/auth"

export function canViewNavigationItem(
  item: { globalOnly?: boolean },
  permissions: readonly Permission[],
) {
  return !item.globalOnly || permissions.includes("*")
}

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: (
        <HouseIcon
        />
      ),
    },
    {
      title: "Centro de decisiones",
      url: "/centro-de-decisiones",
      icon: <GoalIcon />,
      globalOnly: true,
    },
    {
      title: "Próxima mejor acción",
      url: "/next-best-action",
      icon: <ListChecksIcon />,
    },
    {
      title: "Experimentos comerciales",
      url: "/experimentos-comerciales",
      icon: <FlaskConicalIcon />,
    },
    {
      title: "Inteligencia comercial",
      url: "/inteligencia-comercial",
      icon: <BrainCircuitIcon />,
    },
    {
      title: "Rentabilidad y verdad económica",
      url: "/rentabilidad",
      icon: <BadgeEuroIcon />,
    },
    /*  {
       title: "Usuarios",
       url: "/users",
       icon: (
         <UsersIcon
         />
       ),
     }, */
    {
      title: "Leads generales",
      url: "/general-leads",
      icon: (
        <DatabaseIcon
        />
      ),
    },
    {
      title: "Leads VSL",
      url: "/vsl-leads",
      icon: (
        <CalendarDaysIcon
        />
      ),
    },
    {
      title: "Leads personales",
      url: "/leads",
      icon: (
        <ChartBarIcon
        />
      ),
    },
    {
      title: "Alertas",
      url: "/alerts",
      icon: (
        <CircleAlertIcon
        />
      ),
    },
    {
      title: "Agendas",
      url: "/agendas",
      icon: <CalendarDaysIcon />,
    },
    {
      title: "Calendario",
      url: "/calendar",
      icon: <CalendarDaysIcon />,
    },
    {
      title: "Mensajes",
      url: "/messages",
      icon: <MessageSquareIcon />,
    },
    {
      title: "Rankings",
      url: "/rankings",
      icon: <TrophyIcon />,
    },
    {
      title: "Estadísticas personales",
      url: "/personal-statistics",
      icon: <ChartNoAxesCombinedIcon />,
    },
    {
      title: "Estadísticas de feedback",
      url: "/feedback-statistics",
      icon: <FileChartColumnIcon />,
    },
    /*  {
       title: "Analitica",
       url: "/analytical",
       icon: (
         <ChartColumnIcon
         />
       ),
     },
     {
       title: "Campañas",
       url: "/campaigns",
       icon: (
         <FlameIcon
         />
       ),
     }, */
    /*  {
       title: "Calendario",
       url: "/calendar",
       icon: (
         <CalendarIcon
         />
       ),
     },
     {
       title: "Ranking",
       url: "/ranking",
       icon: (
         <TrophyIcon
         />
       ),
     },
     {
       title: "Tickets",
       url: "/tickets",
       icon: (
         <MessageSquareIcon
         />
       ),
     }, */
  ],
  navClouds: [
    {
      title: "Capture",
      icon: (
        <CameraIcon
        />
      ),
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: (
        <FileTextIcon
        />
      ),
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: (
        <FileTextIcon
        />
      ),
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: (
        <Settings2Icon
        />
      ),
    },
    {
      title: "Get Help",
      url: "#",
      icon: (
        <CircleHelpIcon
        />
      ),
    },
    {
      title: "Search",
      url: "#",
      icon: (
        <SearchIcon
        />
      ),
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: (
        <DatabaseIcon
        />
      ),
    },
    {
      name: "Reports",
      url: "#",
      icon: (
        <FileChartColumnIcon
        />
      ),
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: (
        <FileIcon
        />
      ),
    },
  ],
}
export function AppSidebar({
  LinkComponent = "a",
  currentPathname,
  user,
  onSignOut,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  LinkComponent?: React.ComponentType<any> | string
  currentPathname?: string
  user?: {
    name: string
    email: string
    avatar: string
  }
  onSignOut?: () => void
}) {
  const permissions = usePermissions()
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<LinkComponent href="#" />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">CRM-FRAN</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={data.navMain.filter((item) => canViewNavigationItem(item, permissions))}
          LinkComponent={LinkComponent}
          currentPathname={currentPathname}
        />
        {/* <NavDocuments items={data.documents} /> */}

        <NavSecondary
          items={data.navSecondary}
          LinkComponent={LinkComponent}
          currentPathname={currentPathname}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user ?? data.user} onSignOut={onSignOut} />
      </SidebarFooter>
    </Sidebar>
  )
}
