"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { SearchableSelect } from "@/app/components/SearchableSelect"
import { Loader2, Calendar as CalendarIcon, User, Scissors } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

const bookingSchema = z.object({
    isNewCustomer: z.boolean().default(false),
    customerId: z.string().optional(),
    newCustomer: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
    }).optional(),
    serviceIds: z.array(z.string()).min(1, "At least one service is required"),
    therapistId: z.string().optional(),
    roomId: z.string().optional(),
    startTime: z.string().min(1, "Start time is required"),
    notes: z.string().optional(),
    status: z.enum(["PENDING", "CONFIRMED"]).optional(),
}).superRefine((data, ctx) => {
    if (data.isNewCustomer) {
        if (!data.newCustomer?.name) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Customer name is required",
                path: ["newCustomer", "name"]
            })
        }
        if (!data.newCustomer?.phone) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Customer phone is required",
                path: ["newCustomer", "phone"]
            })
        }
    } else {
        if (!data.customerId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Customer is required",
                path: ["customerId"]
            })
        }
    }
})

type BookingFormValues = z.infer<typeof bookingSchema>

interface BookingFormProps {
    customers: any[]
    services: any[]
    therapists: any[]
    rooms: any[]
    onSuccess: () => void
    onCancel: () => void
    initialData?: any
}

export function BookingForm({ customers, services, therapists, rooms, onSuccess, onCancel, initialData }: BookingFormProps) {
    const t = useTranslations("Bookings")
    const tCommon = useTranslations("Common")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingSchema),
        defaultValues: initialData ? {
            isNewCustomer: false,
            customerId: initialData.customerId,
            serviceIds: initialData.bookingItems ? initialData.bookingItems.map((item: any) => item.serviceId) : [],
            therapistId: initialData.therapistId || "",
            roomId: initialData.roomId || "",
            startTime: initialData.startTime ? format(new Date(initialData.startTime), "yyyy-MM-dd'T'HH:mm") : "",
            notes: initialData.notes || "",
            status: initialData.status,
            newCustomer: { name: "", phone: "" }
        } : {
            isNewCustomer: false,
            serviceIds: [],
            notes: "",
            newCustomer: { name: "", phone: "" }
        },
    })

    const isNewCustomer = form.watch("isNewCustomer")
    const selectedServiceIds = form.watch("serviceIds")
    const selectedServices = services.filter(s => selectedServiceIds.includes(s.id))
    const totalDuration = selectedServices.reduce((acc, curr) => acc + curr.duration, 0)
    const totalPrice = selectedServices.reduce((acc, curr) => acc + (curr.price || curr.basePrice), 0)

    const onSubmit = async (data: BookingFormValues) => {
        setIsLoading(true)
        try {
            // Ensure startTime is ISO
            const date = new Date(data.startTime)
            const isoDate = date.toISOString()

            const url = initialData ? `/api/bookings/${initialData.id}` : "/api/bookings"
            const method = initialData ? "PATCH" : "POST"

            // Prepare payload
            const payload: any = {
                ...data,
                startTime: isoDate,
            }

            // Cleanup payload based on mode
            if (data.isNewCustomer) {
                delete payload.customerId
            } else {
                delete payload.newCustomer
            }
            delete payload.isNewCustomer

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const error = await res.text()
                throw new Error(error || `Failed to ${initialData ? 'update' : 'create'} booking`)
            }

            toast.success(`Booking ${initialData ? 'updated' : 'created'} successfully`)
            router.refresh()
            onSuccess()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Customer Section */}
                <div className="col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                            <User className="h-4 w-4 text-indigo-500" />
                            Customer
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                id="isNewCustomer"
                                type="checkbox"
                                {...form.register("isNewCustomer")}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <label htmlFor="isNewCustomer" className="text-sm text-gray-600 select-none cursor-pointer">
                                New Customer (Walk-in)
                            </label>
                        </div>
                    </div>

                    {isNewCustomer ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">{t("fullName")} <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    {...form.register("newCustomer.name")}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                                    placeholder={t("fullName")}
                                />
                                {form.formState.errors.newCustomer?.name && (
                                    <p className="mt-1 text-sm text-red-600">{form.formState.errors.newCustomer.name.message}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">{t("phoneNumber")} <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    {...form.register("newCustomer.phone")}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                                    placeholder={t("phoneNumber")}
                                />
                                {form.formState.errors.newCustomer?.phone && (
                                    <p className="mt-1 text-sm text-red-600">{form.formState.errors.newCustomer.phone.message}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="relative">
                                <SearchableSelect
                                    options={customers.map(c => ({
                                        id: c.id,
                                        label: c.name,
                                        subLabel: c.phone
                                    }))}
                                    value={form.watch("customerId")}
                                    onChange={(val) => form.setValue("customerId", val, { shouldValidate: true })}
                                    placeholder={t("searchCustomer")}
                                />
                            </div>
                            {form.formState.errors.customerId && (
                                <p className="mt-1 text-sm text-red-600">{form.formState.errors.customerId.message}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Service Select - Multi */}
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                        <Scissors className="h-4 w-4 text-indigo-500" />
                        {t("services") || "Services"}
                    </label>
                    <SearchableSelect
                        multiple
                        options={services.map(s => ({
                            id: s.id,
                            label: s.name,
                            subLabel: `${s.duration}${t("min")} - ${new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(s.price || s.basePrice)}`
                        }))}
                        value={form.watch("serviceIds")}
                        onChange={(val) => form.setValue("serviceIds", val, { shouldValidate: true })}
                        placeholder={t("selectServices") || "Select services..."}
                    />
                    {form.formState.errors.serviceIds && (
                        <p className="mt-1 text-sm text-red-600">{form.formState.errors.serviceIds.message}</p>
                    )}
                </div>

                {/* Date & Time */}
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                        <CalendarIcon className="h-4 w-4 text-indigo-500" />
                        {t("startTime") || "Start Time"}
                    </label>
                    <input
                        type="datetime-local"
                        {...form.register("startTime")}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3"
                    />
                    {form.formState.errors.startTime && (
                        <p className="mt-1 text-sm text-red-600">{form.formState.errors.startTime.message}</p>
                    )}
                </div>

                {/* Therapist */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-indigo-500" />
                        {t("therapist")} <span className="text-gray-400 text-xs font-normal">({t("optional")})</span>
                    </label>
                    <select
                        {...form.register("therapistId")}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3"
                    >
                        <option value="">{t("anyTherapist") || "Any Therapist"}</option>
                        {therapists.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name || t.email}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Room */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                        <CalendarIcon className="h-4 w-4 text-indigo-500" /> {/* Should be Room icon or Door? CalendarIcon used as placeholder previously */}
                        {t("room")} <span className="text-gray-400 text-xs font-normal">({t("optional")})</span>
                    </label>
                    <select
                        {...form.register("roomId")}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3"
                    >
                        <option value="">{t("anyRoom") || "Any Room"}</option>
                        {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Service Summary Card */}
            {selectedServices.length > 0 && (
                <div className="rounded-lg bg-indigo-50 p-4 border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-2">{t("selectedServices")} ({selectedServices.length})</h4>
                    <ul className="space-y-1 mb-3">
                        {selectedServices.map(s => (
                            <li key={s.id} className="flex justify-between text-xs text-indigo-700">
                                <span>{s.name}</span>
                                <span>{s.duration}min - {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(s.price || s.basePrice)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="border-t border-indigo-200 pt-2 flex justify-between items-center">
                        <span className="text-sm font-medium text-indigo-900">{t("totalDuration")}: {totalDuration} {t("min")}</span>
                        <span className="text-lg font-bold text-indigo-600">
                            {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(totalPrice)}
                        </span>
                    </div>
                </div>
            )}

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("notes")}</label>
                <textarea
                    {...form.register("notes")}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                    rows={3}
                    placeholder={t("specialRequests")}
                />
            </div>


            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                >
                    {tCommon("cancel")}
                </button>
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={form.handleSubmit((data) => onSubmit({ ...data, status: "PENDING" }))}
                    className="inline-flex justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {initialData ? t("save") : t("createBooking")}
                </button>
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={form.handleSubmit((data) => onSubmit({ ...data, status: "CONFIRMED" }))}
                    className="inline-flex justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {initialData ? t("saveAndConfirm") : t("createAndConfirm")}
                </button>
            </div>
        </form>
    )
}
