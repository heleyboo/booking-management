"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, X, User, Phone, Mail, Search, Trash2, Edit, History, CalendarCheck } from "lucide-react"
import { toast } from "sonner"

const customerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional(),

    // Walk-in fields
    isWalkIn: z.boolean().default(false),
    serviceId: z.string().optional(),
    branchId: z.string().optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

interface CustomerClientProps {
    initialCustomers: any[]
    availableServices: any[]
    userBranchId: string
    userRole: string
    activeBranches?: any[]
}

export default function CustomersClient({ initialCustomers, availableServices, userBranchId, userRole, activeBranches = [] }: CustomerClientProps) {
    const [customers, setCustomers] = useState(initialCustomers)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    const router = useRouter()

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema) as any,
        defaultValues: {
            isWalkIn: false
        }
    })

    const isWalkIn = watch("isWalkIn")

    // Filter customers
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const openCreateModal = () => {
        setEditingCustomer(null)
        reset({ name: "", phone: "", email: "", notes: "", isWalkIn: false, serviceId: "" })
        setIsModalOpen(true)
    }

    const openEditModal = (customer: any) => {
        setEditingCustomer(customer)
        reset({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || "",
            notes: customer.notes || "",
            isWalkIn: false // Cannot do walk-in on edit
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this customer?")) return;

        try {
            const res = await fetch(`/api/customers/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: false })
            })

            if (!res.ok) throw new Error("Failed to delete")

            setCustomers(customers.filter(c => c.id !== id))
            toast.success("Customer deleted")
        } catch (error) {
            toast.error("Failed to delete customer")
        }
    }

    async function onSubmit(data: CustomerFormData) {
        setIsLoading(true)
        try {
            const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers"
            const method = editingCustomer ? "PATCH" : "POST"

            const payload: any = {
                name: data.name,
                phone: data.phone,
                email: data.email,
                notes: data.notes,
            }

            // If creating new and walk-in selected
            if (!editingCustomer && data.isWalkIn && data.serviceId) {
                if (!userBranchId && !data.branchId && userRole !== 'ADMIN') {
                    toast.error("You must belong to a branch to create a walk-in booking.")
                    setIsLoading(false)
                    return
                }

                if (!userBranchId && !data.branchId) {
                    toast.error("Please select a branch.")
                    setIsLoading(false)
                    return
                }

                payload.serviceId = data.serviceId
                payload.branchId = userBranchId || data.branchId
            }

            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                if (response.status === 409) throw new Error("Phone number already registered")
                throw new Error("Failed to save customer")
            }

            const savedCustomer = await response.json()

            if (editingCustomer) {
                setCustomers(customers.map(c => c.id === savedCustomer.id ? { ...savedCustomer, _count: c._count } : c))
                toast.success("Customer updated successfully")
            } else {
                // Optimistically add count
                setCustomers([{ ...savedCustomer, _count: { bookings: data.isWalkIn ? 1 : 0 } }, ...customers])
                if (data.isWalkIn) {
                    toast.success("Customer created & Walk-in booking confirmed!")
                } else {
                    toast.success("Customer created successfully")
                }
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                <div className="flex w-full sm:w-auto items-center gap-2">
                    <div className="relative flex-grow sm:flex-grow-0">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:w-64"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 whitespace-nowrap"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Customer
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Notes</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">History</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {filteredCustomers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                            <div className="text-xs text-gray-400">Since {new Date(customer.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900 flex items-center gap-2">
                                        <Phone className="h-3 w-3 text-gray-400" /> {customer.phone}
                                    </div>
                                    {customer.email && (
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <Mail className="h-3 w-3 text-gray-400" /> {customer.email}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell max-w-xs truncate">
                                    {customer.notes || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {customer._count?.bookings || 0} bookings
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => openEditModal(customer)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    {userRole === 'ADMIN' && (
                                        <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-900">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredCustomers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No customers found.
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
                            <h2 className="text-xl font-bold">{editingCustomer ? "Edit Customer" : "Add Customer"}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input
                                    {...register("name")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    placeholder="John Doe"
                                />
                                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <input
                                    {...register("phone")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    placeholder="(555) 123-4567"
                                />
                                {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                                <input
                                    {...register("email")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    placeholder="john@example.com"
                                />
                                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes</label>
                                <textarea
                                    {...register("notes")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    placeholder="Preferences, allergies..."
                                />
                            </div>

                            {!editingCustomer && (
                                <div className="pt-2 border-t border-gray-100">
                                    <div className="flex items-center mb-4">
                                        <input
                                            id="isWalkIn"
                                            type="checkbox"
                                            {...register("isWalkIn")}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="isWalkIn" className="ml-2 block text-sm font-medium text-gray-900 flex items-center gap-2">
                                            <CalendarCheck className="h-4 w-4 text-green-600" />
                                            Register Service immediately? (Walk-in)
                                        </label>
                                    </div>

                                    {isWalkIn && (
                                        <div className="bg-gray-50 p-3 rounded-md border border-gray-200 animate-in fade-in slide-in-from-top-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Service</label>
                                            <select
                                                {...register("serviceId")}
                                                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                            >
                                                <option value="">-- Choose a service --</option>
                                                {availableServices.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name} ({s.duration} min) - {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(s.price)}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">This will create a CONFIRMED booking starting now.</p>
                                        </div>
                                    )}

                                    {/* Branch Selector for Admin/User without Branch */}
                                    {isWalkIn && !userBranchId && (
                                        <div className="bg-orange-50 p-3 rounded-md border border-orange-200 mt-2 animate-in fade-in">
                                            <label className="block text-sm font-medium text-orange-800 mb-1">Select Branch</label>
                                            <select
                                                {...register("branchId")}
                                                className="block w-full rounded-md border border-orange-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500"
                                            >
                                                <option value="">-- Choose a branch --</option>
                                                {activeBranches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                            {errors.branchId && <p className="text-sm text-red-600 mt-1">{errors.branchId.message}</p>}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingCustomer ? "Update Customer" : (isWalkIn ? "Create & Book" : "Create Customer")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }
        </div >
    )
}
