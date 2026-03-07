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

async function getCurrentMaxOrderSequence(OrderModel, prefix = 'ORD') {
  const orders = await OrderModel.find({}, { orderId: 1 }).lean();
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
  padLength = 3
}) {
  const existingCounter = await CounterModel.findById(counterId);

  if (!existingCounter) {
    const maxSeq = await getCurrentMaxOrderSequence(OrderModel, prefix);

    try {
      await CounterModel.create({ _id: counterId, seq: maxSeq });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  const counter = await CounterModel.findByIdAndUpdate(
    counterId,
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
