"use client"

import * as React from "react"

import { NavDocuments } from "@crm-fran/ui/components/nav-documents"
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
import { HouseIcon, ChartBarIcon, FlameIcon, CalendarIcon, TrophyIcon, MessageSquareIcon, ChartColumnIcon, UsersIcon, CameraIcon, FileTextIcon, Settings2Icon, CircleHelpIcon, SearchIcon, DatabaseIcon, FileChartColumnIcon, FileIcon, CommandIcon } from "lucide-react"

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
      title: "Usuarios",
      url: "/users",
      icon: (
        <UsersIcon
        />
      ),
    },
    {
      title: "Leads",
      url: "/leads",
      icon: (
        <ChartBarIcon
        />
      ),
    },
    {
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
    },
    {
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
    },
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
          items={data.navMain}
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
