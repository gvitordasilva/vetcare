import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 12)

  // ── SuperAdmin da plataforma ──────────────────────────────────
  await prisma.superAdmin.upsert({
    where: { email: 'super@vetcare.com.br' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'super@vetcare.com.br',
      passwordHash: await bcrypt.hash('Super@123', 12),
    },
  })
  console.log('✅ SuperAdmin criado: super@vetcare.com.br / Super@123')

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-clinic' },
    update: {},
    create: {
      name: 'VetCare Demo',
      slug: 'demo-clinic',
      email: 'demo@vetcare.com.br',
      phone: '(11) 99999-0000',
      address: 'Rua das Flores, 100',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      plan: 'PRO',
    },
  })

  await prisma.user.upsert({
    where: { id: 'seed-owner' },
    update: {},
    create: {
      id: 'seed-owner',
      tenantId: tenant.id,
      name: 'Dr. Admin Demo',
      email: 'admin@vetcare.com.br',
      passwordHash,
      role: 'OWNER',
    },
  })

  const owner = await prisma.owner.create({
    data: {
      tenantId: tenant.id,
      name: 'Maria Silva',
      email: 'maria@email.com',
      phone: '(11) 98765-4321',
      cpf: '12345678900',
      address: 'Rua Augusta, 200 - Consolação',
      city: 'São Paulo',
    },
  })

  await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      ownerId: owner.id,
      name: 'Rex',
      species: 'DOG',
      breed: 'Golden Retriever',
      gender: 'MALE',
      birthDate: new Date('2020-03-15'),
      weight: 28.5,
      color: 'Dourado',
    },
  })

  console.log('✅ Seed concluído!')
  console.log('')
  console.log('─── Credenciais de Demo ──────────────────────')
  console.log('🏥 Clínica Demo')
  console.log('   Slug:  demo-clinic')
  console.log('   Email: admin@vetcare.com.br')
  console.log('   Senha: Admin@123')
  console.log('')
  console.log('🛡️  SuperAdmin da Plataforma')
  console.log('   Email: super@vetcare.com.br')
  console.log('   Senha: Super@123')
  console.log('──────────────────────────────────────────────')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
