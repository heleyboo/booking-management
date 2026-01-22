
"use client"

import { useState, useEffect } from "react"
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns"
import { Loader2, Download, Filter, Search } from "lucide-react"
import { SearchableSelect } from "@/app/components/SearchableSelect"
import { toast } from "sonner"

export function AdminView() {
    const [entries, setEntries] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [branches, setBranches] = useState<any[]>([])

    // Filters
    const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
    const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
    const [selectedBranch, setSelectedBranch] = useState<string>("")
    const [searchStaff, setSearchStaff] = useState("")

    useEffect(() => {
        // Fetch branches for filter
        fetch("/api/branches").then(res => res.json()).then(setBranches).catch(console.error)
    }, [])

    useEffect(() => {
        fetchData()
    }, [dateFrom, dateTo, selectedBranch])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (dateFrom) params.append("from", dateFrom)
            if (dateTo) params.append("to", dateTo)
            if (selectedBranch) params.append("branchId", selectedBranch)

            const res = await fetch(`/api/revenue?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setEntries(data)
            }
        } catch (error) {
            toast.error("Failed to load revenue data")
        } finally {
            setIsLoading(false)
        }
    }

    // Filter by staff name locally (since API filter is ID based, simpler for UI to just filter loaded list if list isn't huge, or can update API to search. For now local.)
    const filteredEntries = entries.filter(entry =>
        !searchStaff || entry.staff.name?.toLowerCase().includes(searchStaff.toLowerCase())
    )

    // Calculate Totals
    const totals = filteredEntries.reduce((acc, curr) => ({
        cash: acc.cash + Number(curr.cashAmount),
        bank: acc.bank + Number(curr.bankAmount),
        card: acc.card + Number(curr.cardAmount),
    }), { cash: 0, bank: 0, card: 0 })

    const grandTotal = totals.cash + totals.bank + totals.card

    const handleExport = () => {
        // Simple CSV Export
        const headers = ["Date", "Branch", "Staff", "Cash", "Bank", "Card", "Total"]
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="block rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="block rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                    />
                </div>
                <div className="w-56">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Branch</label>
                    <select
                        value={selectedBranch}
                        onChange={e => setSelectedBranch(e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                    >
                        <option value="">All Branches</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Search Staff</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by staff name..."
                            value={searchStaff}
                            onChange={e => setSearchStaff(e.target.value)}
                            className="block w-full rounded-lg border-gray-300 pl-9 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                        />
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-sm">
                    <p className="text-indigo-100 text-sm font-medium">Total Revenue</p>
                    <p className="text-3xl font-bold mt-2">₩{grandTotal.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Card Payments</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">₩{totals.card.toLocaleString()}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${grandTotal ? (totals.card / grandTotal * 100) : 0}%` }}></div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Cash & Bank</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">₩{(totals.cash + totals.bank).toLocaleString()}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${grandTotal ? ((totals.cash + totals.bank) / grandTotal * 100) : 0}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cash</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Card</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        Loading data...
                                    </td>
                                </tr>
                            ) : filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No records found for the selected period.
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
                                    <td colSpan={3} className="px-6 py-4 text-sm text-gray-900">Total</td>
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
