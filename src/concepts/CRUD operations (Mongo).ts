// CRUD operations (Mongo)
import mongoose from 'mongoose';
const Model = mongoose.model('Test', new mongoose.Schema({ name: String }));
async function crud() {
  await Model.create({ name: 'a' }); // Create
  await Model.find({}); // Read
  await Model.updateOne({}, { name: 'b' }); // Update
  await Model.deleteOne({}); // Delete
}
