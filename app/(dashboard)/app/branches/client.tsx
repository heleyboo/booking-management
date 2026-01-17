"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, X, Store, User, Pencil } from "lucide-react"
import { toast } from "sonner"

const branchSchema = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().optional(),
    phone: z.string().optional(),
    managerId: z.string().optional().nullable(),
})

type BranchFormData = z.infer<typeof branchSchema>

interface BranchClientProps {
    initialBranches: any[]
    potentialManagers: any[]
}

export default function BranchClient({ initialBranches, potentialManagers }: BranchClientProps) {
    const [branches, setBranches] = useState(initialBranches)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBranch, setEditingBranch] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<BranchFormData>({
        resolver: zodResolver(branchSchema),
    })

    const openCreateModal = () => {
        setEditingBranch(null)
        reset({ name: "", address: "", phone: "", managerId: "" })
        setIsModalOpen(true)
    }

    const openEditModal = (branch: any) => {
        setEditingBranch(branch)
        reset({
            name: branch.name,
            address: branch.address || "",
            phone: branch.phone || "",
            managerId: branch.managerId || ""
        })
        setIsModalOpen(true)
    }

    async function onSubmit(data: BranchFormData) {
        setIsLoading(true)
        try {
            const url = editingBranch ? `/api/branches/${editingBranch.id}` : "/api/branches"
            const method = editingBranch ? "PATCH" : "POST"

            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                throw new Error("Failed to save branch")
            }

            const savedBranch = await response.json()

            if (editingBranch) {
                setBranches(branches.map(b => b.id === savedBranch.id ? savedBranch : b))
                toast.success("Branch updated successfully")
            } else {
                setBranches([savedBranch, ...branches])
                toast.success("Branch created successfully")
            }

            setIsModalOpen(false)
            reset()
            router.refresh()
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Branch Management</h1>
                <button
                    onClick={openCreateModal}
                    className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Branch
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {branches.map((branch) => (
                    <div key={branch.id} className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm flex flex-col group">
                        <button
                            onClick={() => openEditModal(branch)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors z-10"
                            title="Edit Branch"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>

                        <div className="mb-4 flex items-center justify-between pr-10">
                            <div className="flex items-center justify-center rounded-full bg-indigo-100 p-3 h-12 w-12 text-indigo-600">
                                <Store className="h-6 w-6" />
                            </div>
                        </div>

                        <div className="mb-4">
                            {branch.manager ? (
                                <div className="inline-flex items-center text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                                    <User className="h-3 w-3 mr-1" />
                                    Manager: {branch.manager.name}
                                </div>
                            ) : (
                                <div className="inline-flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                    No Manager Assigned
                                </div>
                            )}
                        </div>

                        <h3 className="text-lg font-medium text-gray-900">{branch.name}</h3>
                        <div className="mt-2 flex-grow space-y-1 text-sm text-gray-500">
                            <p>{branch.address || "No address provided"}</p>
                            <p>{branch.phone || "No phone provided"}</p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                            <span className="text-gray-400" suppressHydrationWarning>Created: {new Date(branch.createdAt).toLocaleDateString()}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/app/branches/${branch.id}/services`);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 font-medium z-10"
                            >
                                Manage Services
                            </button>
                        </div>
                    </div>
                ))}
                {branches.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        No branches found. Click "Add Branch" to create one.
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold">{editingBranch ? "Edit Branch" : "Add New Branch"}</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Branch Name</label>
                                <input
                                    {...register("name")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    placeholder="e.g., Downtown Location"
                                />
                                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <input
                                    {...register("address")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    placeholder="e.g., 123 Main St"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input
                                    {...register("phone")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    placeholder="e.g., (555) 123-4567"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Branch Manager</label>
                                <select
                                    {...register("managerId")}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                >
                                    <option value="">-- No Manager --</option>
                                    {(potentialManagers || []).map(manager => (
                                        <option key={manager.id} value={manager.id}>
                                            {manager.name} ({manager.email})
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">Only users with 'MANAGER' role are shown.</p>
                            </div>

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
                                    {editingBranch ? "Update Branch" : "Create Branch"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
