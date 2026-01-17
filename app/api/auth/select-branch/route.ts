import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const selectBranchSchema = z.object({
    branchId: z.string().min(1, "Branch ID is required"),
})

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const body = await req.json()
        const result = selectBranchSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { branchId } = result.data

        // Verify branch exists
        const branch = await db.branch.findUnique({
            where: { id: branchId }
        })

        if (!branch) {
            return new NextResponse("Branch not found", { status: 404 })
        }

        // Update user
        await db.user.update({
            where: { id: session.user.id },
            data: { branchId }
        })

        return new NextResponse(null, { status: 200 })
    } catch (error) {
        console.error("[SELECT_BRANCH]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
