import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

interface RouteContext {
    params: Promise<{ id: string }>
}

const updateServiceSchema = z.object({
    serviceId: z.string().min(1),
    price: z.number().min(0),
    isActive: z.boolean(),
})

export async function GET(
    req: Request,
    context: RouteContext
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const { id: branchId } = await context.params

        // 1. Get all master services
        const masterServices = await db.service.findMany({
            orderBy: { name: "asc" }
        })

        // 2. Get existing branch service settings
        const branchServices = await db.branchService.findMany({
            where: { branchId }
        })

        // 3. Merge data
        // Return a list where we see the custom price/active status if it exists, otherwise defaults
        const combinedServices = masterServices.map(service => {
            const branchSetting = branchServices.find(bs => bs.serviceId === service.id)
            return {
                ...service, // id, name, basePrice, duration
                currentPrice: branchSetting ? Number(branchSetting.price) : Number(service.basePrice),
                isActive: branchSetting ? branchSetting.isActive : false, // Default to inactive or active? Let's default to false (opt-in)
                branchServiceId: branchSetting?.id
            }
        })

        return NextResponse.json(combinedServices)
    } catch (error) {
        console.error("[BRANCH_SERVICES_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(
    req: Request,
    context: RouteContext
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const { id: branchId } = await context.params
        const body = await req.json()
        const result = updateServiceSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { serviceId, price, isActive } = result.data

        // Upsert the branch service record
        const branchService = await db.branchService.upsert({
            where: {
                branchId_serviceId: {
                    branchId,
                    serviceId
                }
            },
            update: {
                price,
                isActive
            },
            create: {
                branchId,
                serviceId,
                price,
                isActive
            }
        })

        return NextResponse.json(branchService)
    } catch (error) {
        console.error("[BRANCH_SERVICES_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
