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
        console.error('User not found')
        return
    }

    console.log('User found:', user.id)
    console.log('Stored hash:', user.password)

    const isValid = await bcrypt.compare(password, user.password)
    console.log('Password valid:', isValid)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
