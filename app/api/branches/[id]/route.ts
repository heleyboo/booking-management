import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const updateBranchSchema = z.object({
    name: z.string().min(1, "Name is required").optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    managerId: z.string().nullable().optional(),
})

interface RouteContext {
    params: Promise<{ id: string }>
}

export async function PATCH(
    req: Request,
    context: RouteContext
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const { id } = await context.params
        const body = await req.json()
        const result = updateBranchSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { name, address, phone, managerId } = result.data

        // If setting a manager, ensure they exist and have MANAGER role (optional Check)
        // We trust the frontend mainly but good to verify if strict. 
        // For now assuming existing user ID is passed.

        const branch = await db.branch.update({
            where: { id },
            data: {
                name,
                address,
                phone,
                managerId,
            },
            include: {
                manager: {
                    select: { name: true, email: true }
                }
            }
        })

        return NextResponse.json(branch)
    } catch (error) {
        console.error("[BRANCH_PATCH]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
