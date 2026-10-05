import { QueryInterface, DataTypes } from 'sequelize';
export default {
  async up(q: QueryInterface) {
    // Historical bookings remain readable; new requests require all stay fields.
    for (const [name, type] of Object.entries({ roomCategoryId: DataTypes.INTEGER.UNSIGNED,
      checkIn: DataTypes.DATEONLY, checkOut: DataTypes.DATEONLY, numberOfRooms: DataTypes.INTEGER.UNSIGNED,
      allocatedRoomNos: DataTypes.JSON })) {
      await q.addColumn('bookings', name, { type, allowNull: true });
    }
    await q.changeColumn('bookings', 'bookingAmount', { type: DataTypes.DECIMAL(12, 2), allowNull: false });
    await q.addIndex('bookings', ['userId', 'createdAt']);
    // idemKey remains globally unique but stores SHA256(userId + client key), so
    // keys are scoped to users without breaking the existing unique constraint.
    await q.addColumn('idempotency_keys', 'userId', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true });
    await q.addColumn('idempotency_keys', 'requestHash', { type: DataTypes.STRING(64), allowNull: true });
    await q.addColumn('idempotency_keys', 'status', { type: DataTypes.ENUM('PROCESSING', 'COMPLETED', 'COMPENSATING'), allowNull: false, defaultValue: 'PROCESSING' });
    await q.addColumn('idempotency_keys', 'response', { type: DataTypes.JSON, allowNull: true });
    await q.addColumn('idempotency_keys', 'responseStatus', { type: DataTypes.INTEGER, allowNull: true });
    await q.createTable('outbox_events', {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      eventType: { type: DataTypes.ENUM('BOOKING_CONFIRMED', 'BOOKING_CANCELLED'), allowNull: false },
      aggregateId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      payload: { type: DataTypes.JSON, allowNull: false },
      correlationId: { type: DataTypes.STRING(255), allowNull: false },
      status: { type: DataTypes.ENUM('PENDING', 'PUBLISHED'), allowNull: false, defaultValue: 'PENDING' },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lastError: { type: DataTypes.TEXT, allowNull: true },
      nextAttemptAt: { type: DataTypes.DATE, allowNull: false },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await q.addIndex('outbox_events', ['status', 'nextAttemptAt']);
    await q.addConstraint('outbox_events', { fields: ['aggregateId', 'eventType'], type: 'unique', name: 'one_event_per_booking_transition' });
  },
  async down(q: QueryInterface) {
    await q.dropTable('outbox_events');
    for (const field of ['userId', 'requestHash', 'status', 'response', 'responseStatus']) await q.removeColumn('idempotency_keys', field);
    for (const field of ['roomCategoryId', 'checkIn', 'checkOut', 'numberOfRooms', 'allocatedRoomNos']) await q.removeColumn('bookings', field);
    await q.removeIndex('bookings', ['userId', 'createdAt']);
    await q.changeColumn('bookings', 'bookingAmount', { type: DataTypes.INTEGER, allowNull: false });
  },
};
