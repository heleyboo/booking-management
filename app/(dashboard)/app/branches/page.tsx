import { db } from "@/lib/db"
import BranchClient from "./client"

export default async function BranchesPage() {
    const branches = await db.branch.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            manager: {
                select: { name: true, email: true }
            }
        }
    })

    // Fetch users who are MANAGERS to populate the assignment dropdown
    const potentialManagers = await db.user.findMany({
        where: { role: "MANAGER" },
        select: { id: true, name: true, email: true }
    })

    return <BranchClient initialBranches={branches} potentialManagers={potentialManagers} />
}
