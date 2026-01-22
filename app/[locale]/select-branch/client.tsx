"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2, Store } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface Branch {
    id: string
    name: string
    address: string | null
}

export default function BranchSelectorClient({ branches }: { branches: Branch[] }) {
    const t = useTranslations("SelectBranch")
    const router = useRouter()
    const { update } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const handleSelectBranch = async (branchId: string) => {
        setSelectedId(branchId)
        setIsLoading(true)

        try {
            // 1. Update DB
            const res = await fetch("/api/auth/select-branch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branchId }),
            })

            if (!res.ok) throw new Error("Failed to update branch")

            // 2. Update Session
            await update({ branchId })

            // 3. Redirect
            toast.success(t("branchSelected"))
            router.push("/app/dashboard")
            router.refresh()
        } catch (error) {
            toast.error(t("branchSelectFailed"))
            setIsLoading(false)
            setSelectedId(null)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="rounded-full bg-indigo-100 p-3">
                        <Store className="h-8 w-8 text-indigo-600" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    {t("title")}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    {t("description")}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 px-4">
                    {branches.map((branch) => (
                        <button
                            key={branch.id}
                            onClick={() => handleSelectBranch(branch.id)}
                            disabled={isLoading}
                            className={`
                                relative flex flex-col items-center p-6 rounded-lg border-2 transition-all
                                ${selectedId === branch.id
                                    ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2"
                                    : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md"
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                        >
                            {selectedId === branch.id && isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                                </div>
                            )}
                            <h3 className="text-lg font-medium text-gray-900">{branch.name}</h3>
                            {branch.address && (
                                <p className="mt-1 text-sm text-gray-500 text-center">{branch.address}</p>
                            )}
                        </button>
                    ))}
                </div>

                {branches.length === 0 && (
                    <div className="text-center p-6 bg-white rounded-lg border border-gray-200 shadow-sm mx-4">
                        <p className="text-gray-500">{t("noBranches")}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
