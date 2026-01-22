
"use client"

import { useSession } from "next-auth/react"
import { StaffView } from "./staff-view"
import { AdminView } from "./admin-view"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

export default function RevenuePage() {
    const t = useTranslations("Revenue")
    const { data: session, status } = useSession()

    if (status === "loading") {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (!session) {
        return <div>Please sign in to view this page.</div>
    }

    const isAdmin = session.user.role === "ADMIN"

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    {isAdmin ? t("adminTitle") : t("title")}
                </h1>
                <p className="text-sm text-gray-500">
                    {isAdmin
                        ? t("adminDescription")
                        : t("description")
                    }
                </p>
            </div>

            {isAdmin ? <AdminView /> : <StaffView />}
        </div>
    )
}
