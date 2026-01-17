import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import CustomersClient from "./client"

export default async function CustomersPage() {
    const session = await getServerSession(authOptions)
    const isManagerOrAdmin = session?.user.role === "ADMIN" || session?.user.role === "MANAGER"

    // Fetch customers
    // If Admin, fetch all (or maybe UI toggle handles it, but initial load could be active only)
    // Let's pass all active ones by default, and if Admin wants history they might toggle via API?
    // Current API logic: "If not showInactive, active only".
    // Let's just fetch active ones initially for performance/UX.

    const where: any = { isActive: true }

    const customers = await db.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { bookings: true }
            }
        }
    })

    // Fetch active services for the Walk-in dropdown
    // We need services that are active in AT LEAST ONE branch?
    // Or just master services? 
    // If we create a booking, we need a branchId.
    // Ideally, the logged-in user (if Staff/Manager) belongs to a branch.
    // If Admin, they might need to select a branch first?
    // Let's assume for now the user has a branchId or we pick the first one if Admin (edge case).

    // Actually, `User` model has `branchId`.
    const userBranchId = session?.user.branchId

    let services: any[] = []
    if (userBranchId) {
        // Fetch services active for this branch
        const branchServices = await db.branchService.findMany({
            where: { branchId: userBranchId, isActive: true },
            include: { service: true }
        })
        services = branchServices.map(bs => ({
            id: bs.service.id,
            name: bs.service.name,
            duration: bs.service.duration,
            price: Number(bs.price)
        }))
    } else if (session?.user.role === "ADMIN") {
        // Admin might not have a branch. Show all master services?
        // But we can't create a booking without a branchId.
        // For Admins, maybe disable Walk-in feature or require Branch selection.
        // Let's just fetch master services for reference, but UI handles logic.
        const masterServices = await db.service.findMany()
        services = masterServices.map(s => ({
            id: s.id,
            name: s.name,
            duration: s.duration,
            price: Number(s.basePrice)
        }))
    }

    // Fetch active branches to allow Admin to select one for walk-in
    let activeBranches: any[] = []
    if (!userBranchId) {
        activeBranches = await db.branch.findMany({
            select: { id: true, name: true }
        })
    }

    return (
        <CustomersClient
            initialCustomers={customers}
            availableServices={services}
            userBranchId={userBranchId || ""}
            userRole={session?.user.role || "STAFF"}
            activeBranches={activeBranches}
        />
    )
}
