
import { db } from "../lib/db"

async function main() {
    console.log("Verifying Multi-Service Booking...")

    // 1. Get a Branch
    const branch = await db.branch.findFirst()
    if (!branch) {
        console.error("No branch found")
        return
    }
    console.log("Branch:", branch.name)

    // 2. Get a Customer
    const customer = await db.customer.findFirst({ where: { isActive: true } })
    if (!customer) {
        console.error("No customer found")
        return
    }
    console.log("Customer:", customer.name)

    // 3. Get 2 Services
    const services = await db.service.findMany({ take: 2 })
    if (services.length < 2) {
        console.error("Need at least 2 services")
        return
    }
    console.log("Services:", services.map(s => s.name).join(", "))

    // 4. Create Booking
    const startTime = new Date()
    startTime.setHours(startTime.getHours() + 1) // 1 hour from now

    const totalDuration = services.reduce((acc, curr) => acc + curr.duration, 0)
    const endTime = new Date(startTime.getTime() + totalDuration * 60000)

    const booking = await db.booking.create({
        data: {
            branchId: branch.id,
            customerId: customer.id,
            startTime,
            endTime,
            status: "PENDING",
            bookingItems: {
                create: services.map(s => ({ serviceId: s.id }))
            },
            createdById: (await db.user.findFirst())?.id // Assign to first user (admin?)
        },
        include: {
            bookingItems: {
                include: { service: true }
            }
        }
    })

    console.log("Booking created:", booking.id)
    console.log("Items:", booking.bookingItems.length)
    booking.bookingItems.forEach(item => {
        console.log("- Service:", item.service.name)
    })

    if (booking.bookingItems.length === 2) {
        console.log("SUCCESS: Booking has 2 services")
    } else {
        console.error("FAILURE: Booking items count mismatch")
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
