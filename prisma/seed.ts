import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // 1. Admin
    const adminEmail = 'admin@example.com'
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { password: hashedPassword },
        create: {
            email: adminEmail,
            name: 'Super Admin',
            password: hashedPassword,
            role: Role.ADMIN,
        }
    })
    console.log({ admin })

    // 2. Branches
    const branchesData = Array.from({ length: 10 }).map((_, i) => ({
        name: `Branch ${String(i + 1).padStart(2, '0')} - ${['Downtown', 'Uptown', 'Westside', 'Eastside', 'North', 'South', 'Central', 'Plaza', 'Mall', 'Resort'][i]}`,
        address: `${100 + i} Main St, City ${i + 1}`,
        phone: `010-1234-${1000 + i}`
    }))

    const branches = []
    for (const data of branchesData) {
        // Find or create to avoid duplicates on re-run if name unique constraint existed (it doesn't strictly, but good practice)
        // For simplicity in seed, clean slate is better, but here we just create.
        // Let's check existence by name to avoid dupes if re-seeded without clean.
        const existing = await prisma.branch.findFirst({ where: { name: data.name } })
        if (existing) {
            branches.push(existing)
        } else {
            const branch = await prisma.branch.create({ data })
            branches.push(branch)
        }
    }
    console.log(`Seeded ${branches.length} branches`)

    // 3. Services (Master)
    const servicesData = [
        { name: 'Swedish Massage (60m)', duration: 60, basePrice: 60000 },
        { name: 'Swedish Massage (90m)', duration: 90, basePrice: 90000 },
        { name: 'Deep Tissue (60m)', duration: 60, basePrice: 70000 },
        { name: 'Deep Tissue (90m)', duration: 90, basePrice: 100000 },
        { name: 'Hot Stone (60m)', duration: 60, basePrice: 80000 },
        { name: 'Hot Stone (90m)', duration: 90, basePrice: 110000 },
        { name: 'Thai Massage (60m)', duration: 60, basePrice: 50000 },
        { name: 'Thai Massage (90m)', duration: 90, basePrice: 75000 },
        { name: 'Aromatherapy (60m)', duration: 60, basePrice: 70000 },
        { name: 'Aromatherapy (90m)', duration: 90, basePrice: 100000 },
        { name: 'Foot Reflexology (30m)', duration: 30, basePrice: 30000 },
        { name: 'Foot Reflexology (60m)', duration: 60, basePrice: 50000 },
        { name: 'Head & Shoulder (30m)', duration: 30, basePrice: 30000 },
        { name: 'Head & Shoulder (45m)', duration: 45, basePrice: 45000 },
        { name: 'Body Scrub (45m)', duration: 45, basePrice: 50000 },
        { name: 'Facial Basic (60m)', duration: 60, basePrice: 60000 },
        { name: 'Facial Premium (90m)', duration: 90, basePrice: 100000 },
        { name: 'Couples Massage (60m)', duration: 60, basePrice: 120000 },
        { name: 'Couples Massage (90m)', duration: 90, basePrice: 180000 },
        { name: 'Four Hands (60m)', duration: 60, basePrice: 120000 },
    ]

    const services = []
    for (const data of servicesData) {
        const service = await prisma.service.create({
            data: {
                ...data,
                isActive: true
            }
        })
        services.push(service)
    }
    console.log(`Seeded ${services.length} services`)

    // 4. Managers (1 per Branch)
    for (let i = 0; i < 10; i++) {
        const email = `manager${i + 1}@example.com`
        await prisma.user.upsert({
            where: { email },
            update: { password: hashedPassword, branchId: branches[i].id },
            create: {
                email,
                name: `Manager ${branches[i].name}`,
                password: hashedPassword,
                role: Role.MANAGER,
                branchId: branches[i].id
            }
        })
    }
    console.log('Seeded 10 Managers')

    // 5. Staff (Distributed)
    for (let i = 0; i < 10; i++) {
        const email = `staff${i + 1}@example.com`
        const branch = branches[i % branches.length]
        await prisma.user.upsert({
            where: { email },
            update: { password: hashedPassword, branchId: branch.id },
            create: {
                email,
                name: `Staff ${i + 1}`,
                password: hashedPassword,
                role: Role.STAFF,
                branchId: branch.id
            }
        })
    }
    console.log('Seeded 10 Staff')

    // 6. Therapists (Distributed)
    for (let i = 0; i < 10; i++) {
        const email = `therapist${i + 1}@example.com`
        const branch = branches[i % branches.length]
        await prisma.user.upsert({
            where: { email },
            update: { password: hashedPassword, branchId: branch.id },
            create: {
                email,
                name: `Therapist ${i + 1}`,
                password: hashedPassword,
                role: Role.THERAPIST,
                branchId: branch.id
            }
        })
    }
    console.log('Seeded 10 Therapists')

    // 7. Demo Customers (Optional, adding a few)
    const customer = await prisma.customer.create({
        data: {
            name: "Demo Customer",
            phone: "010-9999-8888",
            isActive: true
        }
    })
    console.log('Seeded Demo Customer')
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
