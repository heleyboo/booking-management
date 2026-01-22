"use client"

import { useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"
import { ChangeEvent, useTransition } from "react"

export default function LanguageSwitcher() {
    const locale = useLocale()
    const router = useRouter()
    const pathname = usePathname()
    const [isPending, startTransition] = useTransition()

    const onSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const nextLocale = e.target.value
        startTransition(() => {
            // Replace the locale segment in the pathname
            // e.g., /en/dashboard -> /vi/dashboard
            // e.g., /dashboard (if implicit) -> /vi/dashboard

            // Note: rudimentary replacement, ideally use next-intl's navigation wrappers
            // But since we are using standard next/navigation with middleware, we can construct the URL.
            // Actually, next-intl recommends using their Link/useRouter.
            // For now, let's just do a hard location replace or basic router push with path manipulation

            // Standard approach with middleware strip/prefix:
            const segments = pathname.split('/')
            // segments[0] is empty, segments[1] is locale or path
            if (['vi', 'en', 'ko'].includes(segments[1])) {
                segments[1] = nextLocale
            } else {
                segments.splice(1, 0, nextLocale)
            }
            const newPath = segments.join('/')
            router.replace(newPath)
        })
    }

    return (
        <select
            defaultValue={locale}
            onChange={onSelectChange}
            disabled={isPending}
            className="text-xs border-none bg-transparent text-gray-500 focus:ring-0 cursor-pointer"
        >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
            <option value="ko">한국어</option>
        </select>
    )
}
