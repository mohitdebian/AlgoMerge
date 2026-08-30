// ORM usage (Prisma/Sequelize)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create
async function createUser(name: string, email: string) {
  return prisma.user.create({ data: { name, email } });
}

// Read
async function getUsers() {
  return prisma.user.findMany({ where: { email: { contains: '@' } } });
}

// Update
async function updateUser(id: number, name: string) {
  return prisma.user.update({ where: { id }, data: { name } });
}

// Delete
async function deleteUser(id: number) {
  return prisma.user.delete({ where: { id } });
}

// Relations
async function getUserWithPosts(id: number) {
  return prisma.user.findUnique({ where: { id }, include: { posts: true } });
}
