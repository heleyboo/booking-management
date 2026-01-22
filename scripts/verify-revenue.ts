
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying Daily Revenue feature...')

    // Debug: List all users and roles
    const count = await prisma.user.count()
    console.log(`Total users: ${count}`)
    const users = await prisma.user.findMany({
        select: { email: true, role: true, branchId: true },
        take: 5
    })
    console.log('Sample users:', users)

    const staff = await prisma.user.findFirst({
        where: {
            role: 'STAFF',
            branchId: { not: null }
        },
        include: { branch: true }
    })

    if (!staff || !staff.branchId) {
        console.error('No staff or branch found for testing')
        return
    }

    console.log(`Testing with Staff: ${staff.email} (${staff.branch?.name})`)

    // 2. Create a Revenue Entry (Direct DB for now as we can't easily fetch via Next API in script without running server authentication flow mock)
    // But we can simulate the API logic by using DB calls that mimic the API actions.

    // Cleanup previous test data
    await prisma.dailyRevenue.deleteMany({
        where: { staffId: staff.id }
    })

    const entry = await prisma.dailyRevenue.create({
        data: {
            date: new Date(),
            staffId: staff.id,
            branchId: staff.branchId,
            cashAmount: 100000,
            bankAmount: 50000,
            cardAmount: 200000
        }
    })

    console.log('Created entry:', entry)

    // 3. Verify Retrieval
    const retrieved = await prisma.dailyRevenue.findUnique({
        where: { id: entry.id }
    })

    if (retrieved && Number(retrieved.cashAmount) === 100000) {
        console.log('✅ Retrieval Verified')
    } else {
        console.error('❌ Retrieval Failed')
    }

    // 4. Verify Update (Simulating "Today" edit)
    const updated = await prisma.dailyRevenue.update({
        where: { id: entry.id },
        data: { cashAmount: 120000 }
    })

    if (Number(updated.cashAmount) === 120000) {
        console.log('✅ Update Verified')
    } else {
        console.error('❌ Update Failed')
    }

    // 5. Verify Relations
    const relations = await prisma.dailyRevenue.findUnique({
        where: { id: entry.id },
        include: { staff: true, branch: true }
    })

    if (relations?.staff.email === staff.email && relations?.branch.id === staff.branchId) {
        console.log('✅ Relations Verified')
    } else {
        console.error('❌ Relations Failed')
    }

    console.log('Verification Complete')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
