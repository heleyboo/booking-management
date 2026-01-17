import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const customerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional(),

    // Optional Walk-in booking
    serviceId: z.string().optional(),
    branchId: z.string().optional(), // Required if serviceId is present
})

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const showInactive = searchParams.get("showInactive") === "true"

        // If not Admin, force active only (unless we decide Managers also see history)
        // Let's allow Managers to see everything for now, or stick to requirements.
        // "admin can simply add, edit, soft delete... manager and other role can add customer"
        // Usually Managers need to see all customers too. Soft deleted ones might be hidden by default.

        const where: any = {}
        if (!showInactive && session.user.role !== "ADMIN") {
            where.isActive = true
        } else if (!showInactive) {
            // Admin default view also hides inactive unless requested?
            // Let's hide inactive by default for everyone to keep list clean
            where.isActive = true
        }

        const customers = await db.customer.findMany({
            where,
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(customers)
    } catch (error) {
        console.error("[CUSTOMERS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const body = await req.json()
        const result = customerSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { name, phone, email, notes, serviceId, branchId } = result.data

        // 1. Create Customer
        // Check if phone exists? Prisma will throw unique constraint error.
        // Better to handle it gracefully or let it fail.

        // We can use a transaction if creating booking too
        const newCustomer = await db.$transaction(async (tx) => {
            const customer = await tx.customer.create({
                data: {
                    name,
                    phone,
                    email: email || null,
                    notes,
                }
            })

            // 2. If Service ID provided, create walk-in booking
            if (serviceId && branchId) {
                // Fetch service duration/price to set end time? 
                // For now, let's keep it simple: Confirmed booking starting NOW.
                const service = await tx.service.findUnique({ where: { id: serviceId } })
                if (!service) throw new Error("Service not found")

                // Determine End Time
                const startTime = new Date()
                const endTime = new Date(startTime.getTime() + service.duration * 60000)

                await tx.booking.create({
                    data: {
                        branchId,
                        customerId: customer.id,
                        startTime,
                        endTime,
                        status: "CONFIRMED", // Walk-in is confirmed immediately
                        bookingItems: {
                            create: [{ serviceId }]
                        },
                        createdById: session.user.id
                    }
                })
            }

            return customer
        })

        return NextResponse.json(newCustomer)
    } catch (error: any) {
        console.error("[CUSTOMERS_POST]", error)
        if (error.code === 'P2002') {
            return new NextResponse("Phone number already registered", { status: 409 })
        }
        return new NextResponse("Internal Error", { status: 500 })
    }
}
