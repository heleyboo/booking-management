import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const bulkActionSchema = z.object({
    ids: z.array(z.string()),
    action: z.enum(["DELETE", "RECOVER"]),
})

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const body = await req.json()
        const result = bulkActionSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { ids, action } = result.data

        await db.service.updateMany({
            where: {
                id: { in: ids },
            },
            data: {
                isActive: action === "RECOVER",
            },
        })

        return new NextResponse(null, { status: 200 })
    } catch (error) {
        console.error("[SERVICES_BULK]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
