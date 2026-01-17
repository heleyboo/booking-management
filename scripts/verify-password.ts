import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@example.com'
    const password = 'password123'

    console.log(`Checking user: ${email}`)

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user) {
        console.error("User not found!")
        return
    }

    console.log("User found.")
    console.log("Stored hash:", user.password)

    const isValid = await bcrypt.compare(password, user.password)
    console.log(`Password '${password}' is valid: ${isValid}`)

    // Test hashing again to see if it matches expectations
    const newHash = await bcrypt.hash(password, 10)
    console.log("New hash sample:", newHash)
    const verifyNew = await bcrypt.compare(password, newHash)
    console.log("Verify new hash:", verifyNew)

    if (!isValid) {
        console.log("Attempting to fix password...")
        const fixedHash = await bcrypt.hash(password, 10)
        await prisma.user.update({
            where: { email },
            data: { password: fixedHash }
        })
        console.log("Password updated manually.")
    }
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
