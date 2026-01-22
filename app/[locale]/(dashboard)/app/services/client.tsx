"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, X, Sparkles, Edit, Trash2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/app/components/ConfirmDialog"
import { useTranslations } from "next-intl"

const serviceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
    basePrice: z.coerce.number().min(0, "Price cannot be negative"),
    type: z.enum(["SINGLE", "COMBO"]).default("SINGLE"),
    items: z.array(z.string()).optional(),
})

type ServiceFormData = z.infer<typeof serviceSchema>

interface ServicesClientProps {
    initialServices: any[]
    singleServices: any[]
}

export default function ServicesClient({ initialServices, singleServices }: ServicesClientProps) {
    const t = useTranslations("Services")
    const tCommon = useTranslations("Common")
    const [services, setServices] = useState(initialServices)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingService, setEditingService] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    useEffect(() => {
        setServices(initialServices)
        setSelectedIds(new Set())
    }, [initialServices])

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<ServiceFormData>({
        resolver: zodResolver(serviceSchema) as any,
        defaultValues: {
            type: "SINGLE",
            items: []
        }
    })

    const serviceType = watch("type")
    const selectedItems = watch("items") || []

    const openCreateModal = () => {
        setEditingService(null)
        reset({
            name: "",
            description: "",
            duration: 60,
            basePrice: 50000,
            type: "SINGLE",
            items: []
        })
        setIsModalOpen(true)
    }

    const openEditModal = (service: any) => {
        setEditingService(service)
        reset({
            name: service.name,
            description: service.description || "",
            duration: service.duration,
            basePrice: Number(service.basePrice), // Ensure number
            type: service.type,
            items: service.comboItems ? service.comboItems.map((ci: any) => ci.service.id) : []
        })
        setIsModalOpen(true)
    }

    const handleDeleteClick = (id: string) => {
        setDeletingId(id)
    }

    const confirmDelete = async () => {
        if (!deletingId) return

        setIsLoading(true)
        try {
            const res = await fetch(`/api/services/${deletingId}`, {
                method: "DELETE"
            })

            if (!res.ok) throw new Error("Failed to delete service")

            setServices(services.filter(s => s.id !== deletingId))
            toast.success(t("serviceDeleted"))
            router.refresh()
        } catch (error) {
            toast.error("Failed to delete service")
        } finally {
            setIsLoading(false)
            setDeletingId(null)
        }

    }

    const toggleSelectAll = () => {
        if (selectedIds.size === services.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(services.map(s => s.id)))
        }
    }

    const toggleSelectOne = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const handleBulkAction = async (action: "DELETE" | "RECOVER") => {
        if (selectedIds.size === 0) return

        if (action === "DELETE" && !confirm(`Are you sure you want to delete ${selectedIds.size} services?`)) return

        setIsLoading(true)
        try {
            const res = await fetch("/api/services/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    action
                })
            })

            if (!res.ok) throw new Error("Failed to perform bulk action")

            toast.success(`Services ${action === "DELETE" ? "deleted" : "recovered"} successfully`)
            router.refresh()
            setSelectedIds(new Set())
        } catch (error) {
            toast.error("Failed to perform bulk action")
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmit(data: ServiceFormData) {
        setIsLoading(true)
        try {
            const url = editingService ? `/api/services/${editingService.id}` : "/api/services"
            const method = editingService ? "PATCH" : "POST"

            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const errorData = await response.text()
                throw new Error(errorData || "Failed to save service")
            }

            const savedService = await response.json()

            if (editingService) {
                setServices(services.map(s => s.id === savedService.id ? savedService : s))
                toast.success("Service updated successfully")
            } else {
                setServices([savedService, ...services])
                toast.success("Service created successfully")
            }

            setIsModalOpen(false)
            reset()
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    const toggleServiceItem = (id: string, price: number, duration: number) => {
        const currentItems = watch("items") || []
        if (currentItems.includes(id)) {
            setValue("items", currentItems.filter(i => i !== id))
        } else {
            setValue("items", [...currentItems, id])
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
                <div className="flex items-center gap-4">
                    <select
                        value={searchParams.get("status") || "active"}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams)
                            if (e.target.value === "active") {
                                params.delete("status")
                            } else {
                                params.set("status", e.target.value)
                            }
                            router.push(`${pathname}?${params.toString()}`)
                        }}
                        className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    >
                        <option value="active">{t("activeServices")}</option>
                        <option value="deleted">{t("deletedServices")}</option>
                    </select>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {t("addService")}
                    </button>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-md p-4 flex items-center justify-between">
                    <span className="text-sm text-indigo-700 font-medium">
                        {selectedIds.size} {t("selected")}
                    </span>
                    <div className="flex items-center gap-2">
                        {searchParams.get("status") === "deleted" ? (
                            <button
                                onClick={() => handleBulkAction("RECOVER")}
                                disabled={isLoading}
                                className="flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                {t("recoverSelected")}
                            </button>
                        ) : (
                            <button
                                onClick={() => handleBulkAction("DELETE")}
                                disabled={isLoading}
                                className="flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("deleteSelected")}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={services.length > 0 && selectedIds.size === services.length}
                                    onChange={toggleSelectAll}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t("serviceName")}
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t("duration")}
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t("basePrice")}
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t("description")}
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {t("actions")}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {services.map((service) => (
                            <tr key={service.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(service.id)}
                                        onChange={() => toggleSelectOne(service.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{service.name}</div>
                                            {service.type === "COMBO" && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                    Combo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                    {service.duration} mins
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 font-medium">
                                    {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(service.basePrice)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {service.description || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => openEditModal(service)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                        <Edit className="h-4 w-4 inline" />
                                    </button>
                                    <button onClick={() => handleDeleteClick(service.id)} className="text-red-600 hover:text-red-900">
                                        <Trash2 className="h-4 w-4 inline" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {services.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                    {t("noServicesFound")}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold">{editingService ? t("updateService") : t("addNewService")}</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t("serviceType")}</label>
                                <div className="mt-1 flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            value="SINGLE"
                                            {...register("type")}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-900">{t("singleService")}</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            value="COMBO"
                                            {...register("type")}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-900">{t("comboPackage")}</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t("serviceName")}</label>
                                <input
                                    {...register("name")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    placeholder="e.g., Thai Massage"
                                />
                                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t("description")}</label>
                                <textarea
                                    {...register("description")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    placeholder="Relaxing traditional massage..."
                                />
                            </div>

                            {serviceType === "COMBO" && (
                                <div className="border border-indigo-100 bg-indigo-50 rounded-md p-3">
                                    <label className="block text-sm font-medium text-indigo-900 mb-2">{t("selectIncludedServices")}</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {singleServices.map(s => (
                                            <div key={s.id} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`service-${s.id}`}
                                                    checked={selectedItems.includes(s.id)}
                                                    onChange={() => toggleServiceItem(s.id, s.basePrice, s.duration)}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <label htmlFor={`service-${s.id}`} className="ml-2 text-sm text-gray-700">
                                                    {s.name} ({s.duration} min) - {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(s.basePrice)}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-indigo-700 mt-2">
                                        {t("selectedItems")}: {selectedItems.length} {t("items")}.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">{t("duration")}</label>
                                    <input
                                        {...register("duration")}
                                        type="number"
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                        placeholder="60"
                                    />
                                    {errors.duration && <p className="text-sm text-red-600">{errors.duration.message}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">{t("basePrice")}</label>
                                    <input
                                        {...register("basePrice")}
                                        type="number"
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                        placeholder="50000"
                                    />
                                    {errors.basePrice && <p className="text-sm text-red-600">{errors.basePrice.message}</p>}
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    {t("cancel")}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingService ? t("updateService") : t("createService")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={confirmDelete}
                title={t("deleteService") || "Delete Service"}
                description={t("deleteServiceConfirm") || "Are you sure you want to delete this service? This action cannot be undone."}
                variant="danger"
                isLoading={isLoading}
            />
        </div>
    )
}
