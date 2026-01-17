import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const updateCustomerSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().min(10).optional(),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
})

interface RouteContext {
    params: Promise<{ id: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const { id } = await context.params
        const body = await req.json()
        const result = updateCustomerSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        // Role check for soft delete?
        // "admin can simply add, edit, soft delete customer"
        // "manager and other role can add customer" -> implies others shouldn't delete?
        // Let's restrict isActive toggle to ADMIN only for now, or Manager too?
        // Requirement says "admin can ... soft delete".

        if (result.data.isActive !== undefined && session.user.role !== "ADMIN") {
            return new NextResponse("Only Admins can change active status", { status: 403 })
        }

        const customer = await db.customer.update({
            where: { id },
            data: {
                ...result.data,
                email: result.data.email === "" ? null : result.data.email,
            }
        })

        return NextResponse.json(customer)
    } catch (error) {
        console.error("[CUSTOMER_PATCH]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
