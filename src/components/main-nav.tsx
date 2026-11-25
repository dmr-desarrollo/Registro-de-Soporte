"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart, FilePlus, Home, List, Shield, Smile, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

type MainNavProps = {
  userRole?: 'admin' | 'tecnico' | 'usuario';
};

export function MainNav({ userRole }: MainNavProps) {
  const pathname = usePathname()

  const menuItems = [
    { href: "/dashboard", icon: Home, label: "Inicio" },
    { href: "/dashboard/tickets/new", icon: FilePlus, label: "Registro de Actividad" },
    { href: "/dashboard/tickets", icon: List, label: "Actividades Atendidas" },
    { href: "/dashboard/reports", icon: BarChart, label: "Reportes" },
    { href: "/dashboard/survey-test", icon: Smile, label: "Test Encuesta" },
    { 
      href: "/dashboard/admin", 
      label: "Administración", 
      icon: Shield,
      roles: ['admin'], // Only users with the 'admin' role can see this
      subItems: [
        { href: "/dashboard/admin", label: "Usuarios" },
        { href: "/dashboard/admin/clients", label: "Clientes" },
        { href: "/dashboard/admin/import", label: "Importar Datos" },
      ]
    },
  ]

  const isActive = (href: string, isSubItem: boolean = false) => {
    // For main items with sub-items, check if path starts with the href
    if (menuItems.find(item => item.href === href && item.subItems)) {
        return pathname.startsWith(href);
    }
    // For main items without sub-items, check for exact match
    return pathname === href;
  }

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true; // If no roles are specified, show the item to everyone
    return item.roles.includes(userRole || ''); // Otherwise, check if the user's role is in the list
  });


  return (
    <SidebarMenu>
      {filteredMenuItems.map(({ href, icon: Icon, label, subItems }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            asChild
            isActive={isActive(href)}
            tooltip={label}
          >
            <Link href={href}>
              <Icon />
              <span>{label}</span>
            </Link>
          </SidebarMenuButton>
          {subItems && pathname.startsWith(href) && (
             <ul className="pl-8 pt-2 space-y-1">
                {subItems.map(sub => (
                   <li key={sub.href}>
                     <Link href={sub.href} className={cn(
                        "text-sm hover:text-sidebar-foreground",
                         isActive(sub.href, true) ? "text-sidebar-foreground font-semibold" : "text-sidebar-foreground/70"
                     )}>
                       {sub.label}
                     </Link>
                   </li>
                ))}
             </ul>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
