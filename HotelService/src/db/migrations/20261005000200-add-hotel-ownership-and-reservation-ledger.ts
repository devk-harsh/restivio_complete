import { DataTypes, QueryInterface } from 'sequelize';
export default {
  async up(q: QueryInterface) {
    await q.addColumn('hotels', 'manager_user_id', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true });
    await q.addIndex('hotels', ['manager_user_id']);
    await q.addIndex('rooms', ['booking_id', 'hotel_id'], { name: 'rooms_booking_lookup' });
    await q.addIndex('rooms', ['hotel_id', 'room_category_id', 'date_of_availability', 'booking_id'], { name: 'rooms_reservation_lookup' });
    // A persistent release tombstone fences late/retried reserve requests after compensation.
    await q.createTable('inventory_reservations', {
      bookingId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, allowNull: false },
      hotelId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      fingerprint: { type: DataTypes.STRING(64), allowNull: true },
      status: { type: DataTypes.ENUM('PENDING', 'RESERVED', 'RELEASED'), allowNull: false },
      response: { type: DataTypes.JSON, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  },
  async down(q: QueryInterface) {
    await q.dropTable('inventory_reservations');
    await q.removeIndex('rooms', 'rooms_reservation_lookup');
    await q.removeIndex('rooms', 'rooms_booking_lookup');
    await q.removeColumn('hotels', 'manager_user_id');
  },
};
