import { getTranslations } from "next-intl/server"

export default async function Dashboard() {
    const t = await getTranslations("Dashboard")
    
    return (
        <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('welcome')}</h1>
            <p className="mt-4 text-gray-600">{t('underConstruction')}</p>
        </div>
    )
}
