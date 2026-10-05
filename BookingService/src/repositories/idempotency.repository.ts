import IdempotencyKey from '../db/models/idempotencyKey';
import { CreationAttributes, Transaction } from 'sequelize';
export function createIdempotencyKey(data: CreationAttributes<IdempotencyKey>, transaction: Transaction) {
  return IdempotencyKey.create(data, { transaction });
}
export function getIdempotencyKeyWithLock(idemKey: string, transaction: Transaction) {
  return IdempotencyKey.findOne({ where: { idemKey }, transaction, lock: transaction.LOCK.UPDATE });
}
