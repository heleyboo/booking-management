import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createBookingSchema = z.object({
    customerId: z.string().optional(),
    newCustomer: z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
    }).optional(),
    serviceIds: z.array(z.string().min(1)).min(1),
    therapistId: z.string().optional().nullable(),
    roomId: z.string().optional().nullable(),
    startTime: z.string().datetime(), // ISO string
    notes: z.string().optional(),
    status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
}).refine(data => data.customerId || data.newCustomer, {
    message: "Either customerId or newCustomer must be provided"
})

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const body = await req.json()
        const result = createBookingSchema.safeParse(body)
        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { serviceIds, therapistId, roomId, startTime, notes, newCustomer } = result.data
        let { customerId } = result.data
        const branchId = session.user.branchId

        if (!branchId && session.user.role !== "ADMIN") {
            return new NextResponse("Branch context required", { status: 400 })
        }

        if (!branchId) {
            return new NextResponse("Branch is required", { status: 400 })
        }

        // Handle New Customer
        if (newCustomer) {
            // Check if customer with phone already exists
            let customer = await db.customer.findUnique({
                where: { phone: newCustomer.phone }
            })

            if (!customer) {
                // Create new
                customer = await db.customer.create({
                    data: {
                        name: newCustomer.name,
                        phone: newCustomer.phone,
                        isActive: true
                    }
                })
            } else {
                // Reactivate if inactive? Or just use it?
                // Let's ensure name matches? Or just update name?
                // For now, assume if phone matches, it is the user.
                // We could update the name if provided.
                // But simplified: use the found customer id.
                if (!customer.isActive) {
                    await db.customer.update({
                        where: { id: customer.id },
                        data: { isActive: true }
                    })
                }
            }
            customerId = customer.id
        }

        if (!customerId) {
            return new NextResponse("Customer creation failed", { status: 500 })
        }

        // Fetch all services to calculate total duration
        const services = await db.service.findMany({
            where: { id: { in: serviceIds } }
        })

        if (services.length !== serviceIds.length) {
            return new NextResponse("One or more services not found", { status: 404 })
        }

        const totalDuration = services.reduce((acc: number, curr: any) => acc + curr.duration, 0)
        const start = new Date(startTime)
        const endTime = new Date(start.getTime() + totalDuration * 60000)

        // Basic availability check (optional for now, but good to have)
        // Check if therapist is busy
        if (therapistId) {
            const conflictingBooking = await db.booking.findFirst({
                where: {
                    therapistId,
                    status: { not: "CANCELLED" },
                    OR: [
                        { startTime: { lt: endTime }, endTime: { gt: start } }
                    ]
                }
            })
            if (conflictingBooking) {
                return new NextResponse("Therapist is not available at this time", { status: 409 })
            }
        }

        // Check if room is busy
        if (roomId) {
            const conflictingRoom = await db.booking.findFirst({
                where: {
                    roomId,
                    status: { not: "CANCELLED" },
                    OR: [
                        { startTime: { lt: endTime }, endTime: { gt: start } }
                    ]
                }
            })
            if (conflictingRoom) {
                return new NextResponse("Room is not available at this time", { status: 409 })
            }
        }

        const booking = await db.booking.create({
            data: {
                branchId,
                customerId,
                therapistId: therapistId || null,
                roomId: roomId || null,
                startTime: start,
                endTime,
                notes,
                createdById: session.user.id,
                status: result.data.status || "PENDING",
                bookingItems: {
                    create: serviceIds.map(id => ({ serviceId: id }))
                }
            },
            include: {
                bookingItems: {
                    include: { service: true }
                }
            }
        })

        return NextResponse.json(booking)
    } catch (error) {
        console.error("[BOOKINGS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const date = searchParams.get("date") // YYYY-MM-DD
        const includeCancelled = searchParams.get("includeCancelled") === "true"
        const search = searchParams.get("search")

        const branchId = session.user.branchId

        // Initial filters
        let where: any = {}

        // Scoping by branch for non-admins (and admins if they selected one)
        if (branchId) {
            where.branchId = branchId
        } else if (session.user.role !== "ADMIN") {
            return new NextResponse("Branch required", { status: 400 })
        }

        // Filter by date
        if (date) {
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)

            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)

            where.startTime = {
                gte: startOfDay,
                lte: endOfDay
            }
        }

        // Status filter
        if (!includeCancelled) {
            where.status = {
                not: "CANCELLED"
            }
        }

        // Search filter (Customer Name or Phone)
        if (search) {
            where.customer = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } }
                ]
            }
        }

        const bookings = await db.booking.findMany({
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

        return NextResponse.json(bookings)

    } catch (error) {
        console.error("[BOOKINGS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
