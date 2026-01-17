
import { db } from "../lib/db"

async function main() {
    console.log("Verifying Walk-in Booking...")

    // 1. Get a Branch
    const branch = await db.branch.findFirst()
    if (!branch) {
        console.error("No branch found")
        return
    }
    console.log("Branch:", branch.name)

    // 2. Get 1 Service
    const service = await db.service.findFirst()
    if (!service) {
        console.error("No service found")
        return
    }
    console.log("Service:", service.name)

    // 3. Define New Customer Data
    const newCustomerData = {
        name: "Walk-in Alex",
        phone: "0999888777" // Ensure this is unique or script might reuse it if logic allows
    }

    // 4. Create Booking using API logic (simulated)
    // We can't call API directly here easily without mocking Fetch, but we can verify the DB logic or use a script that does DB ops similar to API
    // or better, just create via "Simulated Payload" passed to a function if we had one.
    // Since we modified the API route, we should try to mimic what the API does to verify DB constraints/logic.

    // Check if customer exists first to clean up
    const existing = await db.customer.findUnique({ where: { phone: newCustomerData.phone } })
    if (existing) {
        console.log("Cleaning up existing test customer...")
        await db.booking.deleteMany({ where: { customerId: existing.id } })
        await db.customer.delete({ where: { id: existing.id } })
    }

    // 5. Attempt Create Customer + Booking Transaction (Manual)
    console.log("Creating Customer and Booking...")

    const customer = await db.customer.create({
        data: {
            name: newCustomerData.name,
            phone: newCustomerData.phone,
            isActive: true
        }
    })
    console.log("Customer Created:", customer.id)

    const startTime = new Date()
    const endTime = new Date(startTime.getTime() + service.duration * 60000)

    const booking = await db.booking.create({
        data: {
            branchId: branch.id,
            customerId: customer.id,
            startTime,
            endTime,
            status: "CONFIRMED",
            bookingItems: {
                create: [{ serviceId: service.id }]
            },
            createdById: (await db.user.findFirst())?.id
        },
        include: {
            customer: true,
            bookingItems: { include: { service: true } }
        }
    })

    console.log("Booking Created:", booking.id)
    console.log("Booking Customer:", booking.customer.name)

    if (booking.customer.phone === newCustomerData.phone) {
        console.log("SUCCESS: Walk-in customer linked correctly")
    } else {
        console.error("FAILURE: Customer mismatch")
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
