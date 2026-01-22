"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"

const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
    const t = useTranslations("Auth")
    const locale = useLocale()
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
    })

    async function onSubmit(data: FormData) {
        setIsLoading(true)
        try {
            const result = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            })

            if (result?.error) {
                toast.error(t("invalidCredentials"))
            } else {
                // Check for callbackUrl in search params, otherwise redirect to revenue
                let callbackUrl = searchParams.get("callbackUrl")
                
                // Decode the callbackUrl if it's URL encoded
                if (callbackUrl) {
                    try {
                        callbackUrl = decodeURIComponent(callbackUrl)
                    } catch (e) {
                        // If decoding fails, use the original
                    }
                }
                
                // If callbackUrl is empty, "/", or not provided, redirect to revenue
                const shouldRedirectToRevenue = !callbackUrl || callbackUrl === "/" || callbackUrl === "" || callbackUrl === `/${locale}` || callbackUrl === `/${locale}/`
                
                let redirectUrl: string
                if (shouldRedirectToRevenue) {
                    redirectUrl = `/${locale}/app/revenue`
                } else {
                    // If callbackUrl doesn't start with locale, add it
                    if (!callbackUrl.startsWith(`/${locale}`) && !callbackUrl.startsWith('/en/') && !callbackUrl.startsWith('/vi/') && !callbackUrl.startsWith('/ko/')) {
                        redirectUrl = `/${locale}${callbackUrl.startsWith('/') ? callbackUrl : '/' + callbackUrl}`
                    } else {
                        redirectUrl = callbackUrl
                    }
                }
                
                router.push(redirectUrl)
                toast.success(t("loggedInSuccess"))
            }
        } catch (error) {
            toast.error(t("somethingWentWrong"))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900">{t("welcomeBack")}</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {t("signInToAccount")}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                {t("emailAddress")}
                            </label>
                            <input
                                {...register("email")}
                                id="email"
                                type="email"
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700"
                            >
                                {t("password")}
                            </label>
                            <input
                                {...register("password")}
                                id="password"
                                type="password"
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            />
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("signIn")}
                    </button>
                </form>
            </div>
        </div>
    )
}
