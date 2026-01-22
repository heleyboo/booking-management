"use client"

import { useState, useEffect, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, isSameDay, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns"
import { Loader2, Plus, Pencil, Trash2, CheckCircle2, Calendar, TrendingUp, Users, DollarSign, CreditCard, Banknote } from "lucide-react"
import { toast } from "sonner"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

// --- Helper Component: SmartMoneyInput ---
interface SmartMoneyInputProps {
    label: string
    value: number
    onChange: (val: number) => void
    error?: string
}

function SmartMoneyInput({ label, value, onChange, error }: SmartMoneyInputProps) {
    const [suggestions, setSuggestions] = useState<number[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value
        const numValue = Number(rawValue)
        onChange(numValue)

        if (rawValue && !isNaN(numValue) && numValue > 0 && numValue < 1000000000) {
            // Suggest multipliers: x1,000, x10,000, x100,000 if they differ from current
            const multipliers = [1000, 10000, 100000]
            const newSuggestions = multipliers
                .map(m => numValue * m)
                .filter(s => s !== numValue) // Don't suggest if user typed full amount already

            setSuggestions(newSuggestions)
            setShowSuggestions(newSuggestions.length > 0)
        } else {
            setShowSuggestions(false)
        }
    }

    const applySuggestion = (val: number) => {
        onChange(val)
        setShowSuggestions(false)
    }

    return (
        <div ref={wrapperRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">₩</span>
                </div>
                <input
                    type="number"
                    value={value === 0 ? '' : value}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (value > 0) handleInputChange({ target: { value: value.toString() } } as any)
                    }}
                    placeholder="0"
                    className="block w-full rounded-lg border-gray-300 pl-7 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2"
                />
            </div>

            {/* Suggestions Popover */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-100 py-1 max-h-40 overflow-auto">
                    {suggestions.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => applySuggestion(s)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                            <span className="font-medium">₩{s.toLocaleString()}</span>
                            <span className="ml-2 text-xs text-gray-400">
                                ({value.toLocaleString()} × {s / value})
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    )
}

// --- Main Component ---

export function StaffView() {
    const t = useTranslations("Revenue")

    // Define schema inside component to use translations (optional, or just pass static keys)
    // For simplicity, we keep schema outside or use default messages for Zod if needed.
    // Usually Zod messages are static or we use a custom resolver.
    // Here we will just use hardcoded english for Zod internal errors or generic messages for now,
    // as passing t to schema requires memoization.
    // A simpler way is to translate the error message in the UI if possible, or just accept English for validation edge cases for now.
    // Let's stick to English for validation logic for now unless requested.

    const revenueSchema = z.object({
        customersServed: z.coerce.number().int().min(0, t("validation.customersMin")),
        cashAmount: z.coerce.number().min(0, t("validation.amountMin")),
        bankAmount: z.coerce.number().min(0, t("validation.amountMin")),
        cardAmount: z.coerce.number().min(0, t("validation.amountMin")),
    })

    type RevenueFormValues = z.infer<typeof revenueSchema>

    const [entries, setEntries] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleteReason, setDeleteReason] = useState("")
    const [activeTab, setActiveTab] = useState<"entry" | "history">("entry")
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const isUpdatingFromUrl = useRef(false)

    // Analytics State - Initialize from URL or defaults
    const getInitialDateRange = () => {
        const fromParam = searchParams.get("from")
        const toParam = searchParams.get("to")
        
        if (fromParam && toParam) {
            return {
                from: fromParam,
                to: toParam
            }
        }
        
        return {
            from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            to: format(new Date(), 'yyyy-MM-dd')
        }
    }

    const [dateRange, setDateRange] = useState<{ from: string, to: string }>(getInitialDateRange())
    const [stats, setStats] = useState({
        totalCustomers: 0,
        totalRevenue: 0,
        totalCash: 0,
        totalBank: 0,
        totalCard: 0
    })

    const form = useForm<RevenueFormValues>({
        resolver: zodResolver(revenueSchema),
        defaultValues: {
            customersServed: 0,
            cashAmount: 0,
            bankAmount: 0,
            cardAmount: 0,
        }
    })

    const fetchEntries = async () => {
        setIsLoading(true)
        try {
            const query = new URLSearchParams({
                from: dateRange.from,
                to: dateRange.to
            })
            const res = await fetch(`/api/revenue?${query.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setEntries(data)
                calculateStats(data)
            }
        } catch (error) {
            toast.error(t("loadingHistory") + " Error")
        } finally {
            setIsLoading(false)
        }
    }

    const calculateStats = (data: any[]) => {
        const newStats = data.reduce((acc, curr) => ({
            totalCustomers: acc.totalCustomers + (curr.customersServed || 0),
            totalRevenue: acc.totalRevenue + Number(curr.cashAmount) + Number(curr.bankAmount) + Number(curr.cardAmount),
            totalCash: acc.totalCash + Number(curr.cashAmount),
            totalBank: acc.totalBank + Number(curr.bankAmount),
            totalCard: acc.totalCard + Number(curr.cardAmount)
        }), {
            totalCustomers: 0,
            totalRevenue: 0,
            totalCash: 0,
            totalBank: 0,
            totalCard: 0
        })
        setStats(newStats)
    }

    // Sync URL params to state when URL changes (e.g., browser back/forward)
    useEffect(() => {
        const urlFrom = searchParams.get("from")
        const urlTo = searchParams.get("to")
        
        if (urlFrom && urlTo && (urlFrom !== dateRange.from || urlTo !== dateRange.to)) {
            isUpdatingFromUrl.current = true
            setDateRange({
                from: urlFrom,
                to: urlTo
            })
            // Reset flag after state update
            setTimeout(() => {
                isUpdatingFromUrl.current = false
            }, 0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.toString()])

    // Update URL when dateRange changes (but not when updating from URL)
    useEffect(() => {
        if (isUpdatingFromUrl.current) return
        
        const currentFrom = searchParams.get("from")
        const currentTo = searchParams.get("to")
        
        // Only update URL if it's different from current URL params
        if (currentFrom !== dateRange.from || currentTo !== dateRange.to) {
            const params = new URLSearchParams()
            params.set("from", dateRange.from)
            params.set("to", dateRange.to)
            
            const newUrl = `${pathname}?${params.toString()}`
            router.replace(newUrl, { scroll: false })
        }
    }, [dateRange.from, dateRange.to, pathname, router, searchParams])

    useEffect(() => {
        fetchEntries()
    }, [dateRange])

    const setQuickFilter = (type: 'today' | 'week' | 'month') => {
        const today = new Date()
        let from = today
        const to = today

        if (type === 'week') from = startOfWeek(today, { weekStartsOn: 1 })
        if (type === 'month') from = startOfMonth(today)

        setDateRange({
            from: format(from, 'yyyy-MM-dd'),
            to: format(to, 'yyyy-MM-dd')
        })
    }

    // Determine which quick filter is currently active
    const getActiveFilter = (): 'today' | 'week' | 'month' | null => {
        const today = new Date()
        const fromDate = parseISO(dateRange.from)
        const toDate = parseISO(dateRange.to)
        
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

    const onSubmit = async (data: RevenueFormValues) => {
        setIsSubmitting(true)
        try {
            const url = editingId ? `/api/revenue/${editingId}` : "/api/revenue"
            const method = editingId ? "PATCH" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!res.ok) {
                const error = await res.text()
                throw new Error(error || "Failed to save entry")
            }

            toast.success(editingId ? t("entryUpdated") : t("entryRecorded"))
            if (editingId) {
                cancelEdit()
            } else {
                form.reset()
            }
            fetchEntries()
            router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = (id: string) => {
        setDeleteId(id)
        setDeleteModalOpen(true)
        setDeleteReason("")
    }

    const confirmDelete = async () => {
        if (!deleteId) return
        if (!deleteReason.trim()) {
            toast.error(t("deleteModal.reasonRequired") || "Please provide a reason for deletion")
            return
        }

        try {
            const res = await fetch(`/api/revenue/${deleteId}`, { 
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: deleteReason })
            })
            if (!res.ok) throw new Error("Failed to delete")

            toast.success(t("entryDeleted"))
            setDeleteModalOpen(false)
            setDeleteId(null)
            setDeleteReason("")
            fetchEntries()
        } catch (error) {
            toast.error("Failed to delete entry")
        }
    }

    const handleEdit = (entry: any) => {
        setEditingId(entry.id)
        form.reset({
            customersServed: entry.customersServed || 0,
            cashAmount: entry.cashAmount,
            bankAmount: entry.bankAmount,
            cardAmount: entry.cardAmount,
        })
        // Scroll to form if needed, or simple focus
        const formElement = document.getElementById('revenue-form')
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth' })
    }

    const cancelEdit = () => {
        setEditingId(null)
        form.reset({
            customersServed: 0,
            cashAmount: 0,
            bankAmount: 0,
            cardAmount: 0,
        })
    }

    // Check if entry is from today for editing permissions
    const isToday = (dateString: string) => isSameDay(parseISO(dateString), new Date())

    return (
        <div className="space-y-8">
            {/* Tabs for small screens */}
            <div className="lg:hidden border-b border-gray-200 mb-6">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab("entry")}
                        className={`
                            py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                            ${activeTab === "entry"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }
                        `}
                    >
                        {t('newEntry')}
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`
                            py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                            ${activeTab === "history"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }
                        `}
                    >
                        {t('historyLog')}
                    </button>
                </nav>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className={`lg:col-span-1 ${activeTab !== "entry" ? "hidden lg:block" : ""}`} id="revenue-form">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {editingId ? t('editEntry') : t('newEntry')}
                            </h2>
                            <span className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                                {format(new Date(), "MMM d, yyyy")}
                            </span>
                        </div>

                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('customersServed')}
                                </label>
                                <input
                                    type="number"
                                    {...form.register("customersServed")}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                />
                                {form.formState.errors.customersServed && (
                                    <p className="mt-1 text-xs text-red-600">{form.formState.errors.customersServed.message}</p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">{t('breakdown')}</label>

                                <Controller
                                    control={form.control}
                                    name="cashAmount"
                                    render={({ field }) => (
                                        <SmartMoneyInput
                                            label={t('cash').toUpperCase()}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={form.formState.errors.cashAmount?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    control={form.control}
                                    name="bankAmount"
                                    render={({ field }) => (
                                        <SmartMoneyInput
                                            label={t('bank').toUpperCase()}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={form.formState.errors.bankAmount?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    control={form.control}
                                    name="cardAmount"
                                    render={({ field }) => (
                                        <SmartMoneyInput
                                            label={t('card').toUpperCase()}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={form.formState.errors.cardAmount?.message}
                                        />
                                    )}
                                />
                            </div>

                            <div className="pt-4 flex gap-2">
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                                    >
                                        {t('cancel')}
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 inline-flex justify-center items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (editingId ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />)}
                                    {editingId ? t('updateEntry') : t('saveEntry')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* History Section */}
                <div className={`lg:col-span-2 ${activeTab !== "history" ? "hidden lg:block" : ""}`}>
                    {/* Analytics Dashboard - Inside history tab */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {/* Controls */}
                        <div className="md:col-span-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex gap-2">
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
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                    className="text-xs border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <span className="text-gray-400 text-xs">{t('to')}</span>
                                <input
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                    className="text-xs border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Scorecards */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{t('customers')}</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Cash Widget */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Banknote className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{t('cash')}</p>
                                    <h3 className="text-2xl font-bold text-gray-900">₩{stats.totalCash.toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Bank Widget */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <DollarSign className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{t('bank')}</p>
                                    <h3 className="text-2xl font-bold text-gray-900">₩{stats.totalBank.toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Card Widget */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{t('card')}</p>
                                    <h3 className="text-2xl font-bold text-gray-900">₩{stats.totalCard.toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="text-base font-semibold text-gray-900">{t('historyLog')}</h3>
                            <span className="text-xs text-gray-500">
                                {format(parseISO(dateRange.from), 'MMM d')} - {format(parseISO(dateRange.to), 'MMM d')}
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500">{t('loadingHistory')}</div>
                        ) : entries.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                    <Loader2 className="h-6 w-6 text-gray-400" />
                                </div>
                                <h3 className="text-sm font-medium text-gray-900">{t('noEntries')}</h3>
                                <p className="mt-1 text-sm text-gray-500">{t('adjustFilters')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {entries.map((entry) => {
                                    const total = Number(entry.cashAmount) + Number(entry.bankAmount) + Number(entry.cardAmount)
                                    const canEdit = isToday(entry.date)

                                    return (
                                        <div key={entry.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors group">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {format(parseISO(entry.date), "MMMM d, yyyy")}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {format(parseISO(entry.createdAt), "h:mm a")}
                                                    </span>
                                                    {!canEdit && (
                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t('locked')}</span>
                                                    )}
                                                </div>
                                                {canEdit && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleEdit(entry)}
                                                            className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(entry.id)}
                                                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                                                <div>
                                                    <p className="text-xs text-gray-500">{t('customers')}</p>
                                                    <p className="font-medium text-gray-900">{entry.customersServed || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">{t('cash')}</p>
                                                    <p className="font-mono text-gray-600">₩{Number(entry.cashAmount).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">{t('bank')}</p>
                                                    <p className="font-mono text-gray-600">₩{Number(entry.bankAmount).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">{t('card')}</p>
                                                    <p className="font-mono text-gray-600">₩{Number(entry.cardAmount).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">{t('total')}</p>
                                                    <p className="font-bold text-indigo-600">₩{total.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('deleteModal.title')}</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('deleteModal.description')}
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('deleteModal.reasonLabel')} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder={t('deleteModal.placeholder')}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2"
                                rows={3}
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setDeleteModalOpen(false)
                                    setDeleteId(null)
                                    setDeleteReason("")
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                {t('deleteModal.cancel')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                                {t('deleteModal.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

