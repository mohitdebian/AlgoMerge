import mongoose from "mongoose";
// Embedding
const embeddedSchema = new mongoose.Schema({ address: { street: String, city: String } });
// Referencing
const refSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" } });
