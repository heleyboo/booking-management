import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import BookingsClient from "./client"

export default async function BookingsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getServerSession(authOptions)

    // Redirect if not authenticated
    if (!session) {
        redirect("/login")
    }

    const branchId = session.user.branchId
    const resolvedParams = await searchParams
    const dateParam = typeof resolvedParams.date === 'string' ? resolvedParams.date : undefined
    const includeCancelled = resolvedParams.includeCancelled === 'true'
    const searchParam = typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined

    // Determine date filter (default to today if not specified)
    // Actually user requirement says "Default ... show non canceled bookings only ... and a filter for booking by date"
    // Does it mean default date IS today? Probably yes for a booking list.
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    let where: any = {
        startTime: {
            gte: startOfDay,
            lte: endOfDay
        }
    }

    if (branchId) {
        where.branchId = branchId
    } else if (session.user.role !== "ADMIN") {
        return <div>Please select a branch.</div>
    }

    // Status Filter
    if (!includeCancelled) {
        where.status = {
            not: "CANCELLED"
        }
    }

    // Search Filter
    if (searchParam) {
        where.customer = {
            OR: [
                { name: { contains: searchParam, mode: 'insensitive' } },
                { phone: { contains: searchParam, mode: 'insensitive' } }
            ]
        }
    }

    const initialBookings = await db.booking.findMany({
        where,
        include: {
            customer: true,
            bookingItems: {
                include: { service: true }
            },
            therapist: true,
            room: true
        },
        orderBy: {
            startTime: 'desc'
        }
    })

    // Also need to fetch Services, Therapists, Rooms for the booking form
    // If Admin and no branch, we can't really fetch "available" resources effectively without a branch scope.
    // So we should probably encourage Admin to pick a branch too, or UI will be empty.

    let services: any[] = []
    let therapists: any[] = []
    let rooms: any[] = []
    let customers: any[] = []

    if (branchId) {
        // Fetch Services active in this branch
        // Services are linked via BranchService
        const branchServices = await db.branchService.findMany({
            where: { branchId, isActive: true },
            include: { service: true }
        })
        services = branchServices.map((bs: any) => ({
            ...bs.service,
            price: bs.price // Use branch price
        }))

        // Fetch Therapists (Users with role THERAPIST? Or all staff?)
        // Schema has role THERAPIST.
        // Users are linked to branch via branchId? User model has branchId.
        // But some therapists might work in multiple branches? Schema says User has optional branchId.
        // Let's assume User.branchId is their "home" branch or current assignment.
        // Ideally we fetch users who have `branchId` = current branch OR some other relation.
        // For simplicity: Users with branchId = currentBranch.
        therapists = await db.user.findMany({
            where: {
                branchId,
                role: "THERAPIST" // Only show therapists? Or allow staff to perform?
                // Usually only Therapists perform service.
            }
        })

        // Fetch Rooms
        rooms = await db.room.findMany({
            where: { branchId }
        })

        // Fetch Customers? Might be too many. Better to search via API or assume small list for now.
        // Let's fetch all active customers for now (assuming clean list).
        customers = await db.customer.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        })
    } else if (session.user.role === "ADMIN") {
        // If Admin has no branch selected, maybe fetch ALL services/users?
        // Or just let them be empty and Admin has to switch branch using the header?
        // Let's leave them empty to force branch use for booking creation proper context.
    }

    // Convert Date objects to strings for Client Component serialization if needed,
    // but Next.js Server Components -> Client Components auto-serializes Dates as strings in newer versions?
    // Actually it warns typically. Better to verify or map.
    // Let's map strict JSON data.

    const sanitizedBookings = initialBookings.map((b: any) => ({
        ...b,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        bookingItems: b.bookingItems.map((item: any) => ({
            ...item,
            service: {
                ...item.service,
                basePrice: item.service.basePrice.toNumber(),
                createdAt: item.service.createdAt.toISOString(),
                updatedAt: item.service.updatedAt.toISOString(),
            }
        })),
        invoice: b.invoice ? {
            ...b.invoice,
            totalAmount: b.invoice.totalAmount.toNumber(),
            discount: b.invoice.discount.toNumber(),
            finalAmount: b.invoice.finalAmount.toNumber(),
            paidAt: b.invoice.paidAt.toISOString(),
            createdAt: b.invoice.createdAt.toISOString(),
            updatedAt: b.invoice.updatedAt.toISOString(),
        } : null
    }))

    const sanitizedServices = services.map((s: any) => ({
        ...s,
        basePrice: s.basePrice.toNumber(),
        price: s.price ? s.price.toNumber() : s.basePrice.toNumber(), // Handle price if merged
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString()
    }))

    return (
        <BookingsClient
            initialBookings={sanitizedBookings}
            services={sanitizedServices}
            therapists={therapists}
            rooms={rooms}
            customers={customers}
            branchId={branchId}
        />
    )
}
