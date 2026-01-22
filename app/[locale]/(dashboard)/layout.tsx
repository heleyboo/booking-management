import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { LayoutDashboard, Users, Store, Calendar, ClipboardList, LogOut, Banknote } from "lucide-react"
import LanguageSwitcher from "@/app/components/LanguageSwitcher"
import BranchSwitcher from "@/app/components/BranchSwitcher"

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

    const navigation = [
        { name: t('dashboard'), href: '/app/dashboard', icon: LayoutDashboard },
        { name: t('bookings'), href: '/app/bookings', icon: Calendar },
        { name: t('customers'), href: '/app/customers', icon: Users },
        { name: t('revenue'), href: '/app/revenue', icon: Banknote },
    ]

    if (role === 'ADMIN' || role === 'MANAGER') {
        navigation.push(
            { name: t('branches'), href: '/app/branches', icon: Store },
            { name: t('staff'), href: '/app/staff', icon: Users },
            { name: t('services'), href: '/app/services', icon: ClipboardList },
        )
    }

    // Note: BranchSwitcher will handle displaying and switching branches

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="hidden w-64 flex-col bg-gray-900 md:flex">
                <div className="flex h-16 items-center justify-center bg-gray-800">
                    <h1 className="text-xl font-bold text-white">Massage Manager</h1>
                </div>
                <div className="flex flex-1 flex-col overflow-y-auto">
                    <nav className="flex-1 space-y-1 px-2 py-4">
                        {navigation.map((item) => (
                            <Link
                                key={item.href} // Changed key to href as name is now dynamic
                                href={item.href}
                                className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                            >
                                <item.icon className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-300" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="flex-shrink-0 bg-gray-800 p-4">
                    <Link href="/api/auth/signout" className="group flex w-full items-center text-sm font-medium text-gray-300 hover:text-white">
                        <LogOut className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-300" />
                        <span>Logout</span>
                    </Link>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="bg-white shadow">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                            Dashboard
                        </h2>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                            <div className="h-4 w-px bg-gray-200" />
                            <BranchSwitcher />
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
