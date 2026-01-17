import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const updateServiceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
    basePrice: z.coerce.number().min(0, "Price cannot be negative"),
    type: z.enum(["SINGLE", "COMBO"]).optional(),
    items: z.array(z.string()).optional(),
})

interface RouteContext {
    params: Promise<{ id: string }>
}

export async function DELETE(
    req: Request,
    context: RouteContext
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const { id } = await context.params

        // Soft delete: set isActive to false
        await db.service.update({
            where: { id },
            data: { isActive: false }
        })

        return new NextResponse(null, { status: 200 })
    } catch (error) {
        console.error("[SERVICE_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PATCH(
    req: Request,
    context: RouteContext
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const { id } = await context.params
        const body = await req.json()
        const result = updateServiceSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { name, description, duration, basePrice, type, items } = result.data

        // First handle basic update
        const service = await db.service.update({
            where: { id },
            data: {
                name,
                description,
                duration,
                basePrice,
                type,
            }
        })

        // If items are provided (meaning we want to update the combo list)
        // And if the service is (or became) a COMBO
        if ((type === "COMBO" || service.type === "COMBO") && items) {
            // To update items, we delete existing and create new ones (simplest approach)
            await db.serviceItem.deleteMany({
                where: { comboId: id }
            })

            if (items.length > 0) {
                await db.serviceItem.createMany({
                    data: items.map(itemId => ({
                        comboId: id,
                        serviceId: itemId
                    }))
                })
            }
        }

        // Fetch refreshed service
        const updatedService = await db.service.findUnique({
            where: { id },
            include: { comboItems: { include: { service: true } } }
        })

        return NextResponse.json(updatedService)
    } catch (error) {
        console.error("[SERVICE_PATCH]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
