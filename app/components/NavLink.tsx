"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { LayoutDashboard, Users, Store, Calendar, ClipboardList, Banknote, type LucideIcon } from "lucide-react"
import { clsx } from "clsx"

interface NavLinkProps {
    href: string
    name: string
    iconName: string
}

const iconMap: Record<string, LucideIcon> = {
    LayoutDashboard,
    Users,
    Store,
    Calendar,
    ClipboardList,
    Banknote,
}

export function NavLink({ href, name, iconName }: NavLinkProps) {
    const pathname = usePathname()
    const locale = useLocale()
    
    // Remove locale prefix from pathname for comparison
    const pathnameWithoutLocale = pathname.replace(`/${locale}`, '') || '/'
    const hrefWithLocale = `/${locale}${href}`
    
    // Check if current path matches the href (exact match or starts with)
    const isActive = pathnameWithoutLocale === href || pathnameWithoutLocale.startsWith(`${href}/`)

    const Icon = iconMap[iconName] || LayoutDashboard

    return (
        <Link
            href={hrefWithLocale}
            className={clsx(
                "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
            )}
        >
            <Icon
                className={clsx(
                    "mr-3 h-6 w-6 flex-shrink-0 transition-colors",
                    isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-gray-300"
                )}
            />
            {name}
        </Link>
    )
}

