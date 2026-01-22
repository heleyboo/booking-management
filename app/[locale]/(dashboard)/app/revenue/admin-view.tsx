
"use client"

import { useState, useEffect, useRef } from "react"
import { format, startOfMonth, endOfMonth, parseISO, startOfWeek, isSameDay } from "date-fns"
import { Loader2, Download, Filter, DollarSign, CreditCard, Banknote } from "lucide-react"
import { SearchableSelect, Option } from "@/app/components/SearchableSelect"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function AdminView() {
    const t = useTranslations("Revenue")
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const isUpdatingFromUrl = useRef(false)

    const [entries, setEntries] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [branches, setBranches] = useState<any[]>([])
    const [staffOptions, setStaffOptions] = useState<Option[]>([])

    // Initialize filters from URL or defaults
    const getInitialFilters = () => {
        const urlFrom = searchParams.get("from")
        const urlTo = searchParams.get("to")
        const urlBranch = searchParams.get("branchId")
        const urlStaffIds = searchParams.getAll("staffId")

        return {
            dateFrom: urlFrom || format(startOfMonth(new Date()), "yyyy-MM-dd"),
            dateTo: urlTo || format(new Date(), "yyyy-MM-dd"),
            selectedBranch: urlBranch || "",
            selectedStaffIds: urlStaffIds || []
        }
    }

    const initialFilters = getInitialFilters()
    const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom)
    const [dateTo, setDateTo] = useState(initialFilters.dateTo)
    const [selectedBranch, setSelectedBranch] = useState<string>(initialFilters.selectedBranch)
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(initialFilters.selectedStaffIds)

    useEffect(() => {
        // Fetch branches for filter
        fetch("/api/branches")
            .then(res => res.json())
            .then(setBranches)
            .catch(err => {
                console.error("Failed to fetch branches:", err)
                toast.error(t("loadingError") || "Failed to load branches")
            })
        
        // Fetch all staff/users for filter
        fetch("/api/users")
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to fetch users")
                }
                return res.json()
            })
            .then((users: any[]) => {
                // Map all users to options, sorted by name
                const options: Option[] = users
                    .map(user => ({
                        id: user.id,
                        label: user.name || user.email,
                        subLabel: user.email
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label))
                setStaffOptions(options)
            })
            .catch(err => {
                console.error("Failed to fetch users:", err)
                toast.error(t("loadingError") || "Failed to load staff list")
            })
    }, [])

    // Sync URL params to state when URL changes (e.g., browser back/forward)
    useEffect(() => {
        const urlFrom = searchParams.get("from")
        const urlTo = searchParams.get("to")
        const urlBranch = searchParams.get("branchId")
        const urlStaffIds = searchParams.getAll("staffId")

        if (
            (urlFrom && urlFrom !== dateFrom) ||
            (urlTo && urlTo !== dateTo) ||
            (urlBranch !== selectedBranch) ||
            (JSON.stringify(urlStaffIds) !== JSON.stringify(selectedStaffIds))
        ) {
            isUpdatingFromUrl.current = true
            if (urlFrom) setDateFrom(urlFrom)
            if (urlTo) setDateTo(urlTo)
            setSelectedBranch(urlBranch || "")
            setSelectedStaffIds(urlStaffIds)
            setTimeout(() => {
                isUpdatingFromUrl.current = false
            }, 0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.toString()])

    // Update URL when filters change
    useEffect(() => {
        if (isUpdatingFromUrl.current) return

        const params = new URLSearchParams()
        if (dateFrom) params.set("from", dateFrom)
        if (dateTo) params.set("to", dateTo)
        if (selectedBranch) params.set("branchId", selectedBranch)
        selectedStaffIds.forEach(id => params.append("staffId", id))

        const newUrl = `${pathname}?${params.toString()}`
        router.replace(newUrl, { scroll: false })
    }, [dateFrom, dateTo, selectedBranch, selectedStaffIds, pathname, router])

    useEffect(() => {
        fetchData()
    }, [dateFrom, dateTo, selectedBranch, selectedStaffIds])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (dateFrom) params.append("from", dateFrom)
            if (dateTo) params.append("to", dateTo)
            if (selectedBranch) params.append("branchId", selectedBranch)
            // Add multiple staff IDs
            if (selectedStaffIds.length > 0) {
                selectedStaffIds.forEach(id => params.append("staffId", id))
            }

            const res = await fetch(`/api/revenue?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setEntries(data)
            }
        } catch (error) {
            toast.error(t("loadingError") || "Failed to load revenue data")
        } finally {
            setIsLoading(false)
        }
    }

    // No need for local filtering since API handles it now
    const filteredEntries = entries

    // Calculate Totals
    const totals = filteredEntries.reduce((acc, curr) => ({
        cash: acc.cash + Number(curr.cashAmount),
        bank: acc.bank + Number(curr.bankAmount),
        card: acc.card + Number(curr.cardAmount),
    }), { cash: 0, bank: 0, card: 0 })

    const grandTotal = totals.cash + totals.bank + totals.card

    const setQuickFilter = (type: 'today' | 'week' | 'month') => {
        const today = new Date()
        let from = today
        const to = today

        if (type === 'week') from = startOfWeek(today, { weekStartsOn: 1 })
        if (type === 'month') from = startOfMonth(today)

        setDateFrom(format(from, 'yyyy-MM-dd'))
        setDateTo(format(to, 'yyyy-MM-dd'))
    }

    // Determine which quick filter is currently active
    const getActiveFilter = (): 'today' | 'week' | 'month' | null => {
        const today = new Date()
        const fromDate = parseISO(dateFrom)
        const toDate = parseISO(dateTo)
        
        // Check if to date is today
        if (!isSameDay(toDate, today)) return null
        
        // Check if it's today
        if (isSameDay(fromDate, today)) return 'today'
        
        // Check if it's this week
        const weekStart = startOfWeek(today, { weekStartsOn: 1 })
        if (isSameDay(fromDate, weekStart)) return 'week'
        
        // Check if it's this month
        const monthStart = startOfMonth(today)
        if (isSameDay(fromDate, monthStart)) return 'month'
        
        return null
    }

    const handleExport = () => {
        // Simple CSV Export
        const headers = [t("table.date"), t("table.branch"), t("table.staff"), t("cash"), t("bank"), t("card"), t("total")]
        const csvData = filteredEntries.map(e => [
            format(parseISO(e.date), "yyyy-MM-dd"),
            e.branch.name,
            e.staff.name,
            e.cashAmount,
            e.bankAmount,
            e.cardAmount,
            Number(e.cashAmount) + Number(e.bankAmount) + Number(e.cardAmount)
        ])

        const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = `revenue_report_${dateFrom}_${dateTo}.csv`
        link.click()
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                {/* Quick Filters */}
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={() => setQuickFilter('today')} 
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            getActiveFilter() === 'today'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {t('today')}
                    </button>
                    <button 
                        onClick={() => setQuickFilter('week')} 
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            getActiveFilter() === 'week'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {t('week')}
                    </button>
                    <button 
                        onClick={() => setQuickFilter('month')} 
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            getActiveFilter() === 'month'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {t('month')}
                    </button>
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t("filters.from")}</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="block rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t("filters.to")}</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="block rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                        />
                    </div>
                    <div className="w-56">
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t("filters.branch")}</label>
                    <select
                        value={selectedBranch}
                        onChange={e => setSelectedBranch(e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                    >
                        <option value="">{t("filters.allBranches")}</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t("filters.searchStaff")}</label>
                    <SearchableSelect
                        options={staffOptions}
                        value={selectedStaffIds}
                        onChange={(ids: string[]) => setSelectedStaffIds(ids)}
                        placeholder={t("filters.searchStaffPlaceholder")}
                        multiple={true}
                        className="w-full"
                    />
                </div>
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {t("exportCSV")}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">{t("totalRevenue")}</p>
                            <p className="text-3xl font-bold mt-1">₩{grandTotal.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Banknote className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">{t("cash")}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">₩{totals.cash.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">{t("bank")}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">₩{totals.bank.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                            <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">{t("card")}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">₩{totals.card.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("table.date")}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("table.branch")}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("table.staff")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("cash")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("bank")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("card")}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t("total")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        {t("loadingData")}
                                    </td>
                                </tr>
                            ) : filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        {t("noRecords")}
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map((entry) => {
                                    const total = Number(entry.cashAmount) + Number(entry.bankAmount) + Number(entry.cardAmount)
                                    return (
                                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {format(parseISO(entry.date), "MMM d, yyyy")}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {entry.branch.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {entry.staff.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-mono">
                                                {Number(entry.cashAmount).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-mono">
                                                {Number(entry.bankAmount).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-mono">
                                                {Number(entry.cardAmount).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-bold text-right font-mono">
                                                {total.toLocaleString()}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                        {/* Footer Totals */}
                        {!isLoading && filteredEntries.length > 0 && (
                            <tfoot className="bg-gray-50 font-semibold">
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-sm text-gray-900">{t("total")}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 text-right font-mono">{totals.cash.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 text-right font-mono">{totals.bank.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 text-right font-mono">{totals.card.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-indigo-700 text-right font-mono">{grandTotal.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    )
}
