const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'src', 'concepts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const files = {
  'JavaScript — Promises vs callbacks.tsx': 'import React, { useEffect } from "react";\nexport default function PromisesVsCallbacks() {\n  useEffect(() => {\n    // Callback\n    setTimeout(() => { console.log("callback done"); }, 1000);\n    // Promise\n    fetch("/").then(res => res.json()).then(data => console.log(data));\n  }, []);\n  return <div>Promises vs Callbacks</div>;\n}',
  'JavaScript — Hoisting.tsx': 'import React from "react";\nexport default function Hoisting() {\n  // Hoisting demonstration\n  console.log(hoistedVar);\n  var hoistedVar = "I am hoisted";\n  hoistedFunction();\n  function hoistedFunction() { console.log("Hoisted function"); }\n  return <div>Hoisting</div>;\n}',
  'Embedding vs referencing relationships.ts': 'import mongoose from "mongoose";\n// Embedding\nconst embeddedSchema = new mongoose.Schema({ address: { street: String, city: String } });\n// Referencing\nconst refSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" } });\n',
  'Filtering, ordering, grouping.sql': 'SELECT category, COUNT(*) as count, MAX(price) FROM products\nWHERE status = "active"\nGROUP BY category\nORDER BY count DESC;\n',
  'Normalization basics.sql': '-- Normalization (1NF, 2NF, 3NF)\nCREATE TABLE authors (id SERIAL PRIMARY KEY, name TEXT);\nCREATE TABLE books (id SERIAL PRIMARY KEY, title TEXT, author_id INT REFERENCES authors(id));\n',
  'ORM usage (Prisma Sequelize).ts': 'import { PrismaClient } from "@prisma/client";\nconst prisma = new PrismaClient();\nasync function ormUsage() {\n  await prisma.user.findMany({ where: { active: true } });\n}\n',
  'Transactions.sql': 'BEGIN;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\nCOMMIT;\n',
  'Caching with Redis.ts': 'import { createClient } from "redis";\nasync function cacheData() {\n  const client = createClient();\n  await client.connect();\n  await client.set("key", "value", { EX: 3600 });\n  const val = await client.get("key");\n}\n',
  'WebSocket real-time communication.ts': 'import { Server } from "socket.io";\nconst io = new Server(3000);\nio.on("connection", (socket) => {\n  socket.on("chat message", (msg) => {\n    io.emit("chat message", msg);\n  });\n});\n',
  'Scheduled jobs cron.ts': 'import cron from "node-cron";\ncron.schedule("0 0 * * *", () => {\n  console.log("Running daily job");\n});\n',
  'Server-side rendering.tsx': 'import React from "react";\n// Next.js getServerSideProps for Server-side rendering (SSR)\nexport async function getServerSideProps() {\n  return { props: { data: "server rendered" } };\n}\nexport default function SSRPage({ data }: any) { return <div>{data}</div>; }\n',
  'Payment gateway integration.ts': 'import Stripe from "stripe";\nconst stripe = new Stripe("sk_test_123");\nasync function processPayment() {\n  const stripeInstance = stripe as any;\n}\n'
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, filename), content);
}
console.log('Concepts created.');

fs.writeFileSync(path.join(process.cwd(), 'Dockerfile'), 'FROM node:18\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]\n');
fs.writeFileSync(path.join(process.cwd(), 'docker-compose.yml'), 'version: "3.8"\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n');
console.log('Docker created.');
