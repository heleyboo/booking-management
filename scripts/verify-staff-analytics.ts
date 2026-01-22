
import { PrismaClient } from "@prisma/client"
import { startOfDay, endOfDay, subDays } from "date-fns"

const prisma = new PrismaClient()

async function main() {
    console.log("🔍 Starting Staff Analytics Verification...")

    // 1. Setup: Get a user
    const staff = await prisma.user.findFirst({
        where: { role: "STAFF", branchId: { not: null } }
    })

    if (!staff) {
        console.error("❌ No eligible staff found for testing")
        process.exit(1)
    }
    console.log(`👤 Using staff: ${staff.name} (${staff.id})`)

    // 2. Clean previous test data for clean calculation
    await prisma.dailyRevenue.deleteMany({
        where: { staffId: staff.id }
    })
    console.log("🧹 Cleaned previous revenue data for staff")

    // 3. Create Data Points
    const today = new Date()
    const yesterday = subDays(today, 1)

    // Entry 1: Today
    await prisma.dailyRevenue.create({
        data: {
            date: today,
            staffId: staff.id,
            branchId: staff.branchId!,
            customersServed: 5,
            cashAmount: 100000,
            bankAmount: 50000,
            cardAmount: 0
        }
    })

    // Entry 2: Yesterday
    await prisma.dailyRevenue.create({
        data: {
            date: yesterday,
            staffId: staff.id,
            branchId: staff.branchId!,
            customersServed: 3,
            cashAmount: 0,
            bankAmount: 0,
            cardAmount: 150000
        }
    })
    console.log("✅ Created test entries for Today and Yesterday")

    // 4. Verify API Logic (Simulation)
    // Scenario A: Filter for "Today"
    const todayEntries = await prisma.dailyRevenue.findMany({
        where: {
            staffId: staff.id,
            date: {
                gte: startOfDay(today),
                lte: endOfDay(today)
            }
        }
    })

    const todayStats = todayEntries.reduce((acc, curr) => ({
        customers: acc.customers + curr.customersServed, // Default 0 handled in schema
        revenue: acc.revenue + Number(curr.cashAmount) + Number(curr.bankAmount) + Number(curr.cardAmount)
    }), { customers: 0, revenue: 0 })

    if (todayStats.customers !== 5 || todayStats.revenue !== 150000) {
        console.error(`❌ Today Stats Mismatch: Wanted 5/$150000, Got ${todayStats.customers}/$${todayStats.revenue}`)
    } else {
        console.log("✅ Today Stats Verified: 5 Customers, 150,000 KRW")
    }

    // Scenario B: Filter for "This Month" (Both entries)
    const allEntries = await prisma.dailyRevenue.findMany({
        where: {
            staffId: staff.id,
            // Assuming both are in same month for simplicity of this script run
        }
    })

    const totalStats = allEntries.reduce((acc, curr) => ({
        customers: acc.customers + curr.customersServed,
        revenue: acc.revenue + Number(curr.cashAmount) + Number(curr.bankAmount) + Number(curr.cardAmount)
    }), { customers: 0, revenue: 0 })

    if (totalStats.customers !== 8 || totalStats.revenue !== 300000) {
        console.error(`❌ Total Stats Mismatch: Wanted 8/$300000, Got ${totalStats.customers}/$${totalStats.revenue}`)
    } else {
        console.log("✅ Cumulative Stats Verified: 8 Customers, 300,000 KRW")
    }

    // 5. Verify customersServed persistence specifically
    const entry = await prisma.dailyRevenue.findFirst({ where: { staffId: staff.id, customersServed: 5 } })
    if (!entry) {
        console.error("❌ Failed to query specific entry by customersServed")
    } else {
        console.log("✅ Persistence Verified: customersServed field is queryable")
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
