function extractSequenceFromOrderId(orderId, prefix = 'ORD') {
  if (typeof orderId !== 'string') {
    return null;
  }

  const normalizedPrefix = prefix.toUpperCase();
  const pattern = new RegExp(`^${normalizedPrefix}-(\\d+)$`, 'i');
  const match = orderId.trim().match(pattern);

  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function getCurrentMaxOrderSequence(OrderModel, prefix = 'ORD', adminId = null) {
  const filter = adminId ? { admin: adminId } : {};
  const orders = await OrderModel.find(filter, { orderId: 1 }).lean();
  let max = 0;

  for (const order of orders) {
    const seq = extractSequenceFromOrderId(order.orderId, prefix);
    if (typeof seq === 'number' && seq > max) {
      max = seq;
    }
  }

  return max;
}

async function getNextOrderId({
  CounterModel,
  OrderModel,
  counterId = 'order',
  prefix = 'ORD',
  padLength = 3,
  adminId = null
}) {
  const actualCounterId = adminId ? `${adminId}_order` : counterId;
  const existingCounter = await CounterModel.findById(actualCounterId);

  if (!existingCounter) {
    const maxSeq = await getCurrentMaxOrderSequence(OrderModel, prefix, adminId);

    try {
      await CounterModel.create({ _id: actualCounterId, seq: maxSeq });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  const counter = await CounterModel.findByIdAndUpdate(
    actualCounterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}-${String(counter.seq).padStart(padLength, '0')}`;
}

module.exports = {
  extractSequenceFromOrderId,
  getCurrentMaxOrderSequence,
  getNextOrderId
};
