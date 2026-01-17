import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createServiceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    duration: z.number().min(1, "Duration must be at least 1 minute"),
    basePrice: z.number().min(0, "Price cannot be negative"),
    type: z.enum(["SINGLE", "COMBO"]).default("SINGLE"),
    items: z.array(z.string()).optional(), // List of Service IDs for combos
})

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const body = await req.json()
        const result = createServiceSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { name, description, duration, basePrice, type, items } = result.data

        // If COMBO, ensure items are provided
        if (type === "COMBO" && (!items || items.length === 0)) {
            return new NextResponse("Combo services must include at least one service item", { status: 400 })
        }

        const service = await db.service.create({
            data: {
                name,
                description,
                duration,
                basePrice,
                type,
                comboItems: type === "COMBO" && items ? {
                    create: items.map(id => ({ serviceId: id }))
                } : undefined
            },
            include: {
                comboItems: {
                    include: { service: true }
                }
            }
        })

        return NextResponse.json(service)
    } catch (error) {
        console.error("[SERVICES_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const services = await db.service.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            include: {
                comboItems: {
                    include: { service: true }
                }
            }
        })

        return NextResponse.json(services)
    } catch (error) {
        console.error("[SERVICES_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
