import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { logger } from "@/lib/logger"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    logger.error("Missing credentials")
                    throw new Error("Invalid credentials")
                }

                const user = await db.user.findUnique({
                    where: {
                        email: credentials.email
                    }
                })

                if (!user || !user.password) {
                    logger.error("User not found or missing password", { email: credentials.email })
                    throw new Error("Invalid credentials")
                }

                logger.info("Checking password", {
                    email: credentials.email,
                    providedLength: credentials.password.length,
                    storedHashStart: user.password.substring(0, 10)
                })

                const isCorrectPassword = await bcrypt.compare(
                    credentials.password,
                    user.password
                )

                logger.info("Password check result", { isValid: isCorrectPassword })

                if (!isCorrectPassword) {
                    logger.error("Invalid password", { email: credentials.email })
                    throw new Error("Invalid credentials")
                }

                logger.info("User authenticated successfully", { email: user.email, id: user.id })

                return user
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.sub as string
                session.user.role = token.role as any
                session.user.branchId = token.branchId
            }
            return session
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = user.role as any
                token.branchId = user.branchId
            }

            // Allow updating the branchId in the session manually
            if (trigger === "update" && session?.branchId) {
                token.branchId = session.branchId
            }

            return token
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET,
}
