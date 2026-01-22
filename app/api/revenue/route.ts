
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { startOfDay, endOfDay } from "date-fns"

const createRevenueSchema = z.object({
    date: z.string().datetime().optional(), // ISO string, defaults to now if missing
    customersServed: z.number().int().min(0),
    cashAmount: z.number().min(0),
    bankAmount: z.number().min(0),
    cardAmount: z.number().min(0),
})

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        // Branch check: Staff must have a branch. Admins might need to specify one if implementing global create (unlikely for this specific feature flow, usually simpler logic).
        // For now, use session.branchId.
        const branchId = session.user.branchId

        // If Admin and no branch in session (e.g. strict global admin), they can't create "staff" entries easily without more context. 
        // Usually Daily Revenue is entered BY staff AT a branch.
        // Ensure we have a branch.
        if (!branchId) {
            return new NextResponse("Branch context required", { status: 400 })
        }

        const body = await req.json()
        const result = createRevenueSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { customersServed, cashAmount, bankAmount, cardAmount } = result.data
        // Use provided date or default to now
        const entryDate = result.data.date ? new Date(result.data.date) : new Date()

        // Validate: Is entry for today? (Optional strictness, but requested "Manual Entry" usually implies current shift)
        // Task requirement "Edit/Delete only current date". Creation might also be restricted or just allow back-fill if Admin allows?
        // Let's standard: Create is open, Edit/Delete is restricted.

        const revenue = await db.dailyRevenue.create({
            data: {
                date: entryDate,
                staffId: session.user.id,
                branchId: branchId,
                customersServed,
                cashAmount,
                bankAmount,
                cardAmount
            }
        })

        return NextResponse.json(revenue)
    } catch (error) {
        console.error("[REVENUE_POST]", error)
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
        const from = searchParams.get("from")
        const to = searchParams.get("to")
        const staffIds = searchParams.getAll("staffId") // Get all staffId params (supports multiple)
        const branchIdParam = searchParams.get("branchId")

        // RBAC:
        // Admin: Can view all, filter by anything.
        // Staff/Manager: Can view OWN logs (Task says "View a history of THEIR OWN submitted records").
        // Let's implement:
        // If Admin: Use params.
        // If Staff: Force staffId = session.user.id.

        let where: any = {}

        if (session.user.role === "ADMIN") {
            if (staffIds.length > 0) {
                where.staffId = { in: staffIds }
            }
            if (branchIdParam) where.branchId = branchIdParam
        } else {
            // Staff/Manager/Therapist: Filter by current branch
            where.staffId = session.user.id
            // Filter by current selected branch
            if (session.user.branchId) {
                where.branchId = session.user.branchId
            }
        }

        if (from && to) {
            where.date = {
                gte: startOfDay(new Date(from)).toISOString(),
                lte: endOfDay(new Date(to)).toISOString()
            }
        }

        // Filter out deleted entries
        where.isDeleted = false

        const revenue = await db.dailyRevenue.findMany({
            where,
            include: {
                staff: { select: { name: true, email: true } },
                branch: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        })

        return NextResponse.json(revenue)

    } catch (error) {
        console.error("[REVENUE_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
