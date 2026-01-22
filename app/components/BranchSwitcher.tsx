"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Store, ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface Branch {
    id: string
    name: string
    address: string | null
}

export default function BranchSwitcher() {
    const t = useTranslations("Common")
    const router = useRouter()
    const { data: session, update } = useSession()
    const [branches, setBranches] = useState<Branch[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [isFetchingBranches, setIsFetchingBranches] = useState(false)

    const currentBranchId = session?.user?.branchId

    useEffect(() => {
        // Fetch branches when component mounts
        const fetchBranches = async () => {
            setIsFetchingBranches(true)
            try {
                const res = await fetch("/api/branches")
                if (res.ok) {
                    const data = await res.json()
                    setBranches(data)
                }
            } catch (error) {
                console.error("Failed to fetch branches", error)
            } finally {
                setIsFetchingBranches(false)
            }
        }
        fetchBranches()
    }, [])

    const handleSelectBranch = async (branchId: string) => {
        if (branchId === currentBranchId) {
            setIsOpen(false)
            return
        }

        setIsLoading(true)
        try {
            // 1. Update DB
            const res = await fetch("/api/auth/select-branch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branchId }),
            })

            if (!res.ok) {
                const error = await res.text()
                throw new Error(error || "Failed to update branch")
            }

            // 2. Update Session
            await update({ branchId })

            // 3. Refresh page to update all data
            toast.success(t("branchSwitched") || "Branch switched successfully")
            setIsOpen(false)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || t("branchSwitchFailed") || "Failed to switch branch")
        } finally {
            setIsLoading(false)
        }
    }

    const currentBranch = branches.find(b => b.id === currentBranchId)

    if (isFetchingBranches) {
        return (
            <div className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                {t("loading")}
            </div>
        )
    }

    if (branches.length === 0) {
        return null
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Store className="mr-1 h-3 w-3" />
                {currentBranch?.name || t("selectBranch") || "Select Branch"}
                <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                        <div className="py-1" role="menu">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                {t("switchBranch") || "Switch Branch"}
                            </div>
                            {branches.map((branch) => (
                                <button
                                    key={branch.id}
                                    onClick={() => handleSelectBranch(branch.id)}
                                    disabled={isLoading || branch.id === currentBranchId}
                                    className={`
                                        w-full text-left px-4 py-2 text-sm transition-colors
                                        ${branch.id === currentBranchId
                                            ? "bg-indigo-50 text-indigo-700 font-medium"
                                            : "text-gray-700 hover:bg-gray-50"
                                        }
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    `}
                                    role="menuitem"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">{branch.name}</div>
                                            {branch.address && (
                                                <div className="text-xs text-gray-500 mt-0.5">{branch.address}</div>
                                            )}
                                        </div>
                                        {branch.id === currentBranchId && (
                                            <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

