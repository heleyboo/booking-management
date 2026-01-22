import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import BranchSelectorClient from "./client"

export default async function SelectBranchPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    // Optional: If user is ADMIN, they might not need to select a branch, 
    // but the requirement scrictly says "for other user roles except admin".
    // If admin lands here, maybe let them pick too? Or redirect to dashboard?
    // Let's allow them to pick if they want, or redirect. 
    // For now, let's just render the page.

    const branches = await db.branch.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            address: true
        }
    })

    return <BranchSelectorClient branches={branches} />
}
