"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"

interface BranchServiceItem {
    id: string
    name: string
    description?: string
    duration: number
    basePrice: number
    currentPrice: number
    isActive: boolean
    branchServiceId?: string
}

interface BranchServicesClientProps {
    branchId: string
    branchName: string
}

export default function BranchServicesClient({ branchId, branchName }: BranchServicesClientProps) {
    const [services, setServices] = useState<BranchServiceItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [savingId, setSavingId] = useState<string | null>(null)
    const router = useRouter()

    const fetchServices = useCallback(async () => {
        try {
            const res = await fetch(`/api/branches/${branchId}/services`)
            if (!res.ok) throw new Error("Failed to load services")
            const data = await res.json()
            setServices(data)
        } catch (error) {
            toast.error("Failed to load services")
        } finally {
            setIsLoading(false)
        }
    }, [branchId])

    useEffect(() => {
        fetchServices()
    }, [fetchServices])

    const handleUpdate = async (service: BranchServiceItem, changes: Partial<BranchServiceItem>) => {
        // Optimistic update
        const updatedServices = services.map(s =>
            s.id === service.id ? { ...s, ...changes } : s
        )
        setServices(updatedServices)

        // Using a debounced save or direct save? Direct save for toggle, maybe debounced for price?
        // For simplicity, direct save on toggle, and explicit save button or blur for price could be better.
        // Let's implement "Auto-save" on toggle, and maybe "Save" button for the row or blur.

        // For this implementation, I'll trigger save immediately.
        const newSettings = { ...service, ...changes }

        setSavingId(service.id)
        try {
            const res = await fetch(`/api/branches/${branchId}/services`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serviceId: service.id,
                    price: Number(newSettings.currentPrice),
                    isActive: newSettings.isActive
                })
            })

            if (!res.ok) throw new Error("Failed to save")

            // Update with server response if needed, but optimistic is usually fine
        } catch (error) {
            toast.error("Failed to save changes")
            // Revert on error
            fetchServices()
        } finally {
            setSavingId(null)
        }
    }

    const handlePriceChange = (id: string, newPrice: string) => {
        setServices(services.map(s =>
            s.id === id ? { ...s, currentPrice: Number(newPrice) } : s
        ))
    }

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Services</h1>
                    <p className="text-sm text-gray-500">for {branchName}</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Service
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Duration
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Base Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Branch Price
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {services.map((service) => (
                            <tr key={service.id} className={service.isActive ? "bg-white" : "bg-gray-50"}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={service.isActive}
                                            onChange={(e) => handleUpdate(service, { isActive: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                                    {service.description && (
                                        <div className="text-xs text-gray-500 truncate max-w-xs">{service.description}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {service.duration} mins
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(service.basePrice)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="relative rounded-md shadow-sm w-32">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-gray-500 sm:text-sm">₩</span>
                                        </div>
                                        <input
                                            type="number"
                                            value={service.currentPrice}
                                            disabled={!service.isActive}
                                            onChange={(e) => handlePriceChange(service.id, e.target.value)}
                                            className="block w-full rounded-md border-gray-300 pl-7 pr-3 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {service.isActive && (
                                        <button
                                            onClick={() => handleUpdate(service, { currentPrice: service.currentPrice })}
                                            disabled={savingId === service.id}
                                            className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                        >
                                            {savingId === service.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Price"}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {services.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No master services found. Create specific services in the Services menu first.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
