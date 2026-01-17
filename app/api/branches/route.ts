import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createBranchSchema = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().optional(),
    phone: z.string().optional(),
})

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const body = await req.json()
        const result = createBranchSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { name, address, phone } = result.data

        const branch = await db.branch.create({
            data: {
                name,
                address,
                phone,
            },
        })

        return NextResponse.json(branch)
    } catch (error) {
        console.error("[BRANCHES_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        // List all branches, ordered by creation date
        const branches = await db.branch.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                manager: {
                    select: { name: true, email: true }
                }
            }
        })

        return NextResponse.json(branches)
    } catch (error) {
        console.error("[BRANCHES_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
