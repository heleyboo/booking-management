
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { isSameDay } from "date-fns"

const updateRevenueSchema = z.object({
    customersServed: z.number().int().min(0).optional(),
    cashAmount: z.number().min(0).optional(),
    bankAmount: z.number().min(0).optional(),
    cardAmount: z.number().min(0).optional(),
})

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

        const entry = await db.dailyRevenue.findUnique({ where: { id } })
        if (!entry) return new NextResponse("Not Found", { status: 404 })

        // Check permissions
        const isOwner = entry.staffId === session.user.id
        const isAdmin = session.user.role === "ADMIN"

        if (!isOwner && !isAdmin) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        // Role Rule: Staff can ONLY Edit if current date
        if (!isAdmin) {
            const isToday = isSameDay(new Date(entry.date), new Date())
            if (!isToday) {
                return new NextResponse("Cannot edit past records", { status: 403 })
            }
        }

        const body = await req.json()
        const result = updateRevenueSchema.safeParse(body)
        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const updated = await db.dailyRevenue.update({
            where: { id },
            data: result.data
        })

        return NextResponse.json(updated)

    } catch (error) {
        console.error("[REVENUE_PATCH]", error)
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

        const entry = await db.dailyRevenue.findUnique({ where: { id } })
        if (!entry) return new NextResponse("Not Found", { status: 404 })

        // Check permissions
        const isOwner = entry.staffId === session.user.id
        const isAdmin = session.user.role === "ADMIN"

        if (!isOwner && !isAdmin) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        // Role Rule: Staff can ONLY Delete if current date
        if (!isAdmin) {
            const isToday = isSameDay(new Date(entry.date), new Date())
            if (!isToday) {
                return new NextResponse("Cannot delete past records", { status: 403 })
            }
        }

        const body = await req.json().catch(() => ({}))
        const { reason } = body

        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            return new NextResponse("Reason is required", { status: 400 })
        }

        await db.dailyRevenue.update({
            where: { id },
            data: {
                isDeleted: true,
                deleteReason: reason,
                deletedAt: new Date(),
                deletedBy: session.user.id
            }
        })

        return new NextResponse("Deleted", { status: 200 })

    } catch (error) {
        console.error("[REVENUE_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
