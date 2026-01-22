import { withAuth } from "next-auth/middleware"
import createMiddleware from "next-intl/middleware"
import { NextRequest, NextResponse } from "next/server"

const intlMiddleware = createMiddleware({
    locales: ["en", "vi", "ko"],
    defaultLocale: "vi",
    localePrefix: "always"
})

const authMiddleware = withAuth(
    function onSuccess(req) {
        return intlMiddleware(req)
    },
    {
        callbacks: {
            authorized: ({ token }) => token != null
        },
        pages: {
            signIn: "/login"
        }
    }
)

export default function middleware(req: NextRequest) {
    // Exclude public paths from Auth
    // Exclude public paths from Auth
    const publicPathnameRegex = /^(\/(en|vi|ko))?\/(login|api|_next|static|.*\\..*)/;
    const isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);

    if (isPublicPage) {
        return intlMiddleware(req);
    } else {
        return (authMiddleware as any)(req);
    }
}

export const config = {
    matcher: ["/((?!api|_next|.*\\..*).*)"]
}
