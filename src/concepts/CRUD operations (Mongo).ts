// CRUD operations (Mongo)
import mongoose from 'mongoose';

const AiAnalysis = mongoose.model('AiAnalysis', new mongoose.Schema({ 
  repo: String, 
  analysis: String,
  status: String 
}));

export async function crudOps() {
  // CREATE
  await AiAnalysis.create({ repo: "a", analysis: "b", status: "c" });

  // READ
  await AiAnalysis.find({ repo: "a" });
  await AiAnalysis.findOne({ repo: "a" });

  // UPDATE
  await AiAnalysis.updateOne({ repo: "a" }, { status: "d" });

  // DELETE
  await AiAnalysis.deleteOne({ repo: "a" });
}
