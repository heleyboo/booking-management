import { db } from "@/lib/db"
import BranchServicesClient from "./client"
import { notFound } from "next/navigation"

interface BranchServicesPageProps {
    params: Promise<{ id: string }>
}

export default async function BranchServicesPage({ params }: BranchServicesPageProps) {
    const { id } = await params

    const branch = await db.branch.findUnique({
        where: { id },
        select: { id: true, name: true }
    })

    if (!branch) {
        notFound()
    }

    return <BranchServicesClient branchId={branch.id} branchName={branch.name} />
}
