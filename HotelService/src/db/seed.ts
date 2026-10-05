import sequelize from './models/sequelize';
import Hotel from './models/hotel';
import RoomCategory, { RoomType } from './models/roomCategory';
import { generateRoomInventoryService } from '../services/roomGeneration.service';
async function seed() {
  if (process.env.SEED_DEMO !== 'true') throw new Error('Set SEED_DEMO=true for local demo data');
  const [hotel] = await Hotel.findOrCreate({ where: { name: 'Restivio Demo Hotel' }, defaults: {
    name: 'Restivio Demo Hotel', address: '12 Demo Beach Road', location: 'Goa', managerUserId: 2,
  } });
  const [category] = await RoomCategory.findOrCreate({ where: { hotelId: hotel.id, roomType: RoomType.DOUBLE }, defaults: {
    hotelId: hotel.id, roomType: RoomType.DOUBLE, price: 2500, roomCount: 3,
  } });
  const start = new Date(); const end = new Date(Date.now() + 90 * 86400000);
  await generateRoomInventoryService(hotel.id, category.id, { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) });
  console.log('Demo hotel/inventory ready', { hotelId: hotel.id, roomCategoryId: category.id });
}
seed().then(() => sequelize.close()).catch(error => { console.error(error.message); process.exitCode = 1; return sequelize.close(); });
