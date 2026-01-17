# Massage Management System

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd massage-management
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory. You can copy an example or use the following template (ensure you have a valid database URL):
    ```env
    DATABASE_URL="file:./dev.db"
    NEXTAUTH_SECRET="your-secret-key"
    NEXTAUTH_URL="http://localhost:3000"
    ```

4.  **Database Setup:**
    Initialize the database, push the schema, and seed demo data:
    ```bash
    # Generate Prisma Client
    npx prisma generate

    # Push schema to database
    npx prisma db push

    # Seed demo data (Admin, Branches, Services, Staff)
    npx prisma db seed
    ```

5.  **Run Development Server:**
    ```bash
    npm run dev
    ```

6.  **Login:**
    Open [http://localhost:3000](http://localhost:3000).
    - **Admin**: `admin@example.com` / `password123`
    - **Manager**: `manager1@example.com` / `password123`
