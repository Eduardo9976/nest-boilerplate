import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.user.deleteMany();
}
