import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { Role } from "@prisma/client"

const createUserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.nativeEnum(Role),
    branchId: z.string().optional().nullable(),
})

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const body = await req.json()
        const result = createUserSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(JSON.stringify(result.error), { status: 400 })
        }

        const { name, email, password, role, branchId } = result.data

        const existingUser = await db.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return new NextResponse("User already exists", { status: 409 })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await db.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                branchId,
            },
        })

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user

        return NextResponse.json(userWithoutPassword)
    } catch (error) {
        console.error("[USERS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const users = await db.user.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                branchId: true,
                branch: {
                    select: {
                        name: true
                    }
                },
                createdAt: true,
            }
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error("[USERS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
