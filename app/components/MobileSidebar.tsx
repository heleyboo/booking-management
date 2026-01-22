"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { NavLink } from "@/app/components/NavLink"
import Link from "next/link"
import { LogOut } from "lucide-react"
import { useTranslations } from "next-intl"

interface NavigationItem {
    name: string
    href: string
    iconName: string
}

interface MobileSidebarProps {
    navigation: NavigationItem[]
    appName: string
    logoutText: string
    role: string
}

export function MobileSidebar({ navigation, appName, logoutText, role }: MobileSidebarProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Mobile menu button */}
            <button
                type="button"
                className="md:hidden -m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
                onClick={() => setIsOpen(true)}
            >
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Mobile sidebar overlay */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-gray-900/50 md:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 md:hidden">
                        <div className="flex h-16 items-center justify-between px-4 bg-gray-800">
                            <h1 className="text-xl font-bold text-white">{appName}</h1>
                            <button
                                type="button"
                                className="-m-2.5 rounded-md p-2.5 text-gray-300 hover:text-white"
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="sr-only">Close sidebar</span>
                                <X className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="flex flex-1 flex-col overflow-y-auto">
                            <nav className="flex-1 space-y-1 px-2 py-4">
                                {navigation.map((item) => (
                                    <div key={item.href} onClick={() => setIsOpen(false)}>
                                        <NavLink
                                            href={item.href}
                                            name={item.name}
                                            iconName={item.iconName}
                                        />
                                    </div>
                                ))}
                            </nav>
                        </div>
                        <div className="flex-shrink-0 bg-gray-800 p-4">
                            <Link
                                href="/api/auth/signout"
                                className="group flex w-full items-center text-sm font-medium text-gray-300 hover:text-white"
                                onClick={() => setIsOpen(false)}
                            >
                                <LogOut className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-300" />
                                <span>{logoutText}</span>
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}

