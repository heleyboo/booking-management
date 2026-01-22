"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Plus, Calendar, Clock, User, Scissors, MoreHorizontal, Loader2, Pencil, Check, X } from "lucide-react"
import { format } from "date-fns"
import { BookingForm } from "./booking-form"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface BookingsClientProps {
    initialBookings: any[]
    services: any[]
    therapists: any[]
    rooms: any[]
    customers: any[]
    branchId?: string | null
}

export default function BookingsClient({ initialBookings, services, therapists, rooms, customers, branchId }: BookingsClientProps) {
    const t = useTranslations("Bookings")
    const tCommon = useTranslations("Common")
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedBooking, setSelectedBooking] = useState<any>(null)
    const [bookings, setBookings] = useState(initialBookings)

    // Filter states
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
    const [date, setDate] = useState(searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'))
    const [includeCancelled, setIncludeCancelled] = useState(searchParams.get('includeCancelled') === 'true')

    useEffect(() => {
        setBookings(initialBookings)
    }, [initialBookings])

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams(searchParams)

        if (searchTerm) {
            params.set('search', searchTerm)
        } else {
            params.delete('search')
        }

        if (date) {
            params.set('date', date)
        } else {
            params.delete('date')
        }

        if (includeCancelled) {
            params.set('includeCancelled', 'true')
        } else {
            params.delete('includeCancelled')
        }

        // Debounce search update
        const timeoutId = setTimeout(() => {
            const newParamsString = params.toString()
            const currentParamsString = searchParams.toString()

            if (newParamsString !== currentParamsString) {
                router.replace(`${pathname}?${newParamsString}`)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [searchTerm, date, includeCancelled, pathname, router, searchParams])

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/bookings/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            })

            if (!res.ok) throw new Error("Failed to update status")

            toast.success(t("statusUpdated"))
            router.refresh()
            // Optimistic update
            setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b))
        } catch (error) {
            toast.error(t("statusUpdateFailed"))
        }
    }

    const handleCreateClick = () => {
        setSelectedBooking(null)
        setIsModalOpen(true)
    }

    const handleEditClick = (booking: any) => {
        setSelectedBooking(booking)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedBooking(null)
    }

    if (!branchId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-sm border border-gray-200">
                <p className="text-gray-500 mb-4">{t("selectBranchFirst")}</p>
                <button
                    onClick={() => router.push("/select-branch")}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    {tCommon("selectBranch")}
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("title")}</h1>
                    <p className="text-sm text-gray-500">{t("description")}</p>
                </div>
                <button
                    onClick={handleCreateClick}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 self-start sm:self-auto"
                >
                    <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                    {t("newBooking")}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex-1">
                    <label htmlFor="search" className="sr-only">{t("search")}</label>
                    <input
                        type="text"
                        name="search"
                        id="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        placeholder="Search customer name or phone..."
                    />
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="block rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                    <div className="flex items-center gap-2">
                        <input
                            id="show-cancelled"
                            type="checkbox"
                            checked={includeCancelled}
                            onChange={(e) => setIncludeCancelled(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <label htmlFor="show-cancelled" className="text-sm text-gray-700 whitespace-nowrap select-none cursor-pointer">
                            {t("showCancelled")}
                        </label>
                    </div>
                </div>
            </div>

            {/* List View */}
            <div className="overflow-visible bg-white shadow sm:rounded-md">
                <ul role="list" className="divide-y divide-gray-200">
                    {bookings.length === 0 ? (
                        <li className="px-6 py-12 text-center text-gray-500">
                            {t("noBookingsFound")}
                        </li>
                    ) : (
                        bookings.map((booking) => (
                            <li key={booking.id} className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-xs font-semibold text-indigo-800">{format(new Date(booking.startTime), "MMM dd")}</div>
                                                <div className="text-lg font-bold text-indigo-600 leading-none">{format(new Date(booking.startTime), "HH:mm")}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-base font-bold text-gray-900">{booking.customer.name}</p>
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${booking.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                booking.status === 'PENDING' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                                                    booking.status === 'CANCELLED' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                        'bg-gray-50 text-gray-600 ring-gray-500/10'
                                                }`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-col gap-1">
                                            {booking.bookingItems.map((item: any) => (
                                                <span key={item.id} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600">
                                                    <Scissors className="h-3.5 w-3.5" />
                                                    {item.service.name}
                                                </span>
                                            ))}
                                            {booking.bookingItems.length === 0 && (
                                                <span className="text-xs text-gray-400 italic">{t("noServicesSelected")}</span>
                                            )}
                                            {booking.therapist && (
                                                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <User className="h-3.5 w-3.5" />
                                                    {booking.therapist.name || booking.therapist.email}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {booking.status === 'PENDING' && (
                                        <button
                                            onClick={() => handleStatusUpdate(booking.id, 'CONFIRMED')}
                                            className="rounded bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 shadow-sm ring-1 ring-inset ring-green-600/20 hover:bg-green-100 flex items-center gap-1"
                                            title="Confirm Booking"
                                        >
                                            <Check className="h-3 w-3" />
                                            {t("confirm")}
                                        </button>
                                    )}
                                    {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                                        <button
                                            onClick={() => handleStatusUpdate(booking.id, 'CANCELLED')}
                                            className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-600/20 hover:bg-red-100 flex items-center gap-1"
                                            title="Cancel Booking"
                                        >
                                            <X className="h-3 w-3" />
                                            {t("cancel")}
                                        </button>
                                    )}
                                    {booking.status !== 'CANCELLED' && (
                                        <button
                                            onClick={() => handleEditClick(booking)}
                                            className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center gap-1"
                                        >
                                            <Pencil className="h-3 w-3 text-gray-500" />
                                            {tCommon("edit")}
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto ring-1 ring-gray-900/5">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedBooking ? t("editBooking") : t("newBooking")}</h2>
                                <p className="text-sm text-gray-500 mt-1">{selectedBooking ? t("updateDetails") : t("scheduleSession")}</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <span className="sr-only">{t("close")}</span>
                                <Plus className="h-6 w-6 rotate-45" />
                            </button>
                        </div>
                        <BookingForm
                            customers={customers}
                            services={services}
                            therapists={therapists}
                            rooms={rooms}
                            onSuccess={closeModal}
                            onCancel={closeModal}
                            initialData={selectedBooking}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
