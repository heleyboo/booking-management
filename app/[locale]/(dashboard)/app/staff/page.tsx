import { db } from "@/lib/db"
import StaffClient from "./client"

export default async function StaffPage() {
    const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
    })

    // Serialize dates to pass to client component if needed (Next.js automatically handles some serialization but better to be safe or pass plain objects)
    // Prisma dates objects are Date instances, execution context might require clear serialization if boundary is strict.
    // Actually Next.js 13+ handles Date objects in props.

    return <StaffClient initialUsers={users} />
}
