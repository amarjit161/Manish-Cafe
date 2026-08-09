import { PrismaClient, StationType } from "@prisma/client";

const prisma = new PrismaClient();

const stations: { name: string; type: StationType; specs: string; hourlyRate: number }[] = [
  { name: "PC-01", type: "PC", specs: "Intel i5, RTX 3060, 16GB RAM", hourlyRate: 60 },
  { name: "PC-02", type: "PC", specs: "Intel i5, RTX 3060, 16GB RAM", hourlyRate: 60 },
  { name: "PC-03", type: "PC", specs: "Intel i5, RTX 3060, 16GB RAM", hourlyRate: 60 },
  { name: "PC-04", type: "PC", specs: "Intel i5, RTX 3060, 16GB RAM", hourlyRate: 60 },
  { name: "PC-05", type: "PC", specs: "Intel i5, RTX 3060, 16GB RAM", hourlyRate: 60 },
  { name: "PC-06", type: "PC", specs: "Intel i5, RTX 3060, 16GB RAM", hourlyRate: 60 },
  { name: "PC-07", type: "PC", specs: "Intel i7, RTX 4070, 32GB RAM", hourlyRate: 90 },
  { name: "PC-08", type: "PC", specs: "Intel i7, RTX 4070, 32GB RAM", hourlyRate: 90 },
  { name: "PS5-01", type: "CONSOLE", specs: "PlayStation 5 Console + 2 Controllers", hourlyRate: 100 },
  { name: "PS5-02", type: "CONSOLE", specs: "PlayStation 5 Console + 2 Controllers", hourlyRate: 100 },
  { name: "Xbox-01", type: "CONSOLE", specs: "Xbox Series X + 2 Controllers", hourlyRate: 100 },
];

async function main() {
  for (const station of stations) {
    await prisma.station.upsert({
      where: { name: station.name },
      update: {},
      create: station,
    });
  }
  console.log(`Seeded ${stations.length} stations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
