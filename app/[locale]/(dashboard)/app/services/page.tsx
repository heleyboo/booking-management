import { db } from "@/lib/db"
import ServicesClient from "./client"

// Define types for Props
type ServiceInclude = {
    comboItems: {
        include: {
            service: true
        }
    }
}

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function ServicesPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getServerSession(authOptions)
    const searchParams = await props.searchParams
    const status = typeof searchParams.status === 'string' ? searchParams.status : 'active'

    let where: any = status === 'deleted' ? { isActive: false } : { isActive: true }

    // If not admin and has branchId, filter by branch
    if (session?.user?.role !== "ADMIN" && session?.user?.branchId) {
        where = {
            ...where,
            branchServices: {
                some: {
                    branchId: session.user.branchId,
                    isActive: true
                }
            }
        }
    }

    const services = await db.service.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            comboItems: {
                include: { service: true }
            }
        }
    })

    // Convert Decimal to number for client component including nested combo items
    const formattedServices = services.map((service: any) => ({
        ...service,
        basePrice: service.basePrice.toNumber(),
        comboItems: service.comboItems.map((item: any) => ({
            ...item,
            service: {
                ...item.service,
                basePrice: item.service.basePrice.toNumber()
            }
        }))
    }))

    // Separate single services for combo builder
    const singleServices = formattedServices.filter((s: any) => s.type === "SINGLE")

    return <ServicesClient initialServices={formattedServices} singleServices={singleServices} />
}
