import { DefaultSession } from "next-auth"
import { Role } from "@prisma/client"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: Role
            branchId?: string | null
        } & DefaultSession["user"]
    }

    interface User {
        role: Role
        branchId?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: Role
        branchId?: string | null
    }
}
