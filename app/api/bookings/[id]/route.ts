import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const updateBookingSchema = z.object({
    customerId: z.string().optional(),
    newCustomer: z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
    }).optional(),
    serviceIds: z.array(z.string().min(1)).optional(),
    therapistId: z.string().optional().nullable(),
    roomId: z.string().optional().nullable(),
    startTime: z.string().datetime().optional(),
    status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
    notes: z.string().optional().nullable(),
})

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }
        const { id } = await params

        const booking = await db.booking.findUnique({
            where: { id },
            include: {
                customer: true,
                bookingItems: {
                    include: { service: true }
                },
                therapist: true,
                room: true
            }
        })

        if (!booking) {
            return new NextResponse("Booking not found", { status: 404 })
        }

        // Branch check for non-admins
        if (session.user.role !== "ADMIN" && booking.branchId !== session.user.branchId) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        return NextResponse.json(booking)
    } catch (error) {
        console.error("[BOOKING_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }
        const { id } = await params
        const body = await req.json()
        const result = updateBookingSchema.safeParse(body)
        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const booking = await db.booking.findUnique({
            where: { id },
            include: { bookingItems: { include: { service: true } } }
        })
        if (!booking) {
            return new NextResponse("Booking not found", { status: 404 })
        }

        // Branch check
        if (session.user.role !== "ADMIN" && booking.branchId !== session.user.branchId) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const { startTime, serviceIds, newCustomer } = result.data
        let { customerId } = result.data
        let endTime = booking.endTime

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
                // Reactivate if inactive
                if (!customer.isActive) {
                    await db.customer.update({
                        where: { id: customer.id },
                        data: { isActive: true }
                    })
                }
            }
            customerId = customer.id
        }

        // If startTime or serviceIds changes, recalculate endTime
        if (startTime || serviceIds) {
            const newStart = startTime ? new Date(startTime) : booking.startTime
            let duration = 0

            // Determine services to calculate duration
            // We use new list if provided, otherwise existing list.
            if (serviceIds) {
                const services = await db.service.findMany({ where: { id: { in: serviceIds } } })
                duration = services.reduce((acc: number, curr: any) => acc + curr.duration, 0)
            } else {
                duration = booking.bookingItems.reduce((acc: number, item: any) => acc + item.service.duration, 0)
            }

            endTime = new Date(newStart.getTime() + duration * 60000)
        }

        // Prepare update data
        const updateData: any = {
            ...result.data,
            customerId, // Update if changed/new
            therapistId: result.data.therapistId || null, // Convert "" to null
            roomId: result.data.roomId || null,       // Convert "" to null
            endTime,
            serviceIds: undefined, // Remove serviceIds from direct update
            newCustomer: undefined // Remove newCustomer from data
        }

        // If serviceIds provided, update relations
        if (serviceIds) {
            updateData.bookingItems = {
                deleteMany: {}, // Remove all existing
                create: serviceIds.map(sid => ({ serviceId: sid })) // Add new
            }
        }

        const updatedBooking = await db.booking.update({
            where: { id },
            data: updateData,
            include: {
                bookingItems: {
                    include: { service: true }
                }
            }
        })

        return NextResponse.json(updatedBooking)
    } catch (error) {
        console.error("[BOOKING_PATCH]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }
        const { id } = await params

        const booking = await db.booking.findUnique({ where: { id } })
        if (!booking) {
            return new NextResponse("Booking not found", { status: 404 })
        }

        // Branch check
        if (session.user.role !== "ADMIN" && booking.branchId !== session.user.branchId) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        // Hard delete or cancel? User asked for management, usually cancel is better than delete for bookings.
        // But let's implement Delete as Delete for now, or update status to CANCELLED?
        // Let's do delete for the API, but UI might use PATCH to Cancel.
        // Or if it's "Delete", it removes the record.

        await db.booking.delete({
            where: { id }
        })

        return new NextResponse(null, { status: 200 })
    } catch (error) {
        console.error("[BOOKING_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
