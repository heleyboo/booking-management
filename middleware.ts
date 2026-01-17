import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const isAuth = !!token
        const isAuthPage = req.nextUrl.pathname.startsWith("/login")
        const isDashboardPage = req.nextUrl.pathname.startsWith("/app")

        const isSelectBranchPage = req.nextUrl.pathname.startsWith("/select-branch")

        if (isAuthPage) {
            if (isAuth) {
                return NextResponse.redirect(new URL("/app/dashboard", req.url))
            }
            return null
        }

        if (!isAuth) {
            if (isDashboardPage || isSelectBranchPage) {
                return NextResponse.redirect(new URL("/login", req.url))
            }
            return null
        }

        // Authenticated users
        if (isAuth) {
            const role = token?.role
            const branchId = token?.branchId

            // Non-admin users must have a branch selected to access dashboard
            if (role !== "ADMIN" && !branchId && isDashboardPage) {
                return NextResponse.redirect(new URL("/select-branch", req.url))
            }
        }
    },
    {
        callbacks: {
            async authorized() {
                // This is a workaround for handling redirect on auth pages.
                // We return true here so that the middleware function above is always called.
                return true
            },
        },
    }
)

export const config = {
    matcher: ["/login", "/app/:path*", "/select-branch"],
}
