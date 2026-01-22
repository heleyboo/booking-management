import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { LayoutDashboard, Users, Store, Calendar, ClipboardList, LogOut, Banknote } from "lucide-react"
import LanguageSwitcher from "@/app/components/LanguageSwitcher"
import BranchSwitcher from "@/app/components/BranchSwitcher"
import { NavLink } from "@/app/components/NavLink"
import { MobileSidebar } from "@/app/components/MobileSidebar"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const role = session.user.role

    const t = await getTranslations("Navigation")
    const tLayout = await getTranslations("Layout")

    const navigation = [
        { name: t('revenue'), href: '/app/revenue', iconName: 'Banknote' },
    ]

    if (role === 'ADMIN' || role === 'MANAGER') {
        navigation.push(
            { name: t('branches'), href: '/app/branches', iconName: 'Store' },
            { name: t('staff'), href: '/app/staff', iconName: 'Users' },
        )
    }

    // Note: BranchSwitcher will handle displaying and switching branches

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="hidden w-64 flex-col bg-gray-900 md:flex">
                <div className="flex h-16 items-center justify-center bg-gray-800">
                    <h1 className="text-xl font-bold text-white">{tLayout('appName')}</h1>
                </div>
                <div className="flex flex-1 flex-col overflow-y-auto">
                    <nav className="flex-1 space-y-1 px-2 py-4">
                        {navigation.map((item) => (
                            <NavLink
                                key={item.href}
                                href={item.href}
                                name={item.name}
                                iconName={item.iconName}
                            />
                        ))}
                    </nav>
                </div>
                <div className="flex-shrink-0 bg-gray-800 p-4">
                    <Link href="/api/auth/signout" className="group flex w-full items-center text-sm font-medium text-gray-300 hover:text-white">
                        <LogOut className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-300" />
                        <span>{tLayout('logout')}</span>
                    </Link>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="bg-white shadow">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        <MobileSidebar
                            navigation={navigation}
                            appName={tLayout('appName')}
                            logoutText={tLayout('logout')}
                            role={role}
                        />
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                            {role !== 'ADMIN' && (
                                <>
                                    <div className="h-4 w-px bg-gray-200" />
                                    <BranchSwitcher />
                                </>
                            )}
                            <span className="text-sm font-medium text-gray-500">
                                {session.user.name ?? session.user.email} ({role})
                            </span>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-8">
                    {children}
                    {/* We will add dashboard stats here later */}
                </main>
            </div>
        </div>
    )
}
