import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function ormUsage() {
  await prisma.user.findMany({ where: { active: true } });
}
