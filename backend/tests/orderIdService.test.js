const {
  extractSequenceFromOrderId,
  getCurrentMaxOrderSequence,
  getNextOrderId
} = require('../services/orderIdService');

describe('orderIdService', () => {
  describe('extractSequenceFromOrderId', () => {
    test('extracts numeric sequence from valid order id', () => {
      expect(extractSequenceFromOrderId('ORD-014')).toBe(14);
      expect(extractSequenceFromOrderId('ord-099')).toBe(99);
    });

    test('returns null for invalid order id', () => {
      expect(extractSequenceFromOrderId('ORD014')).toBeNull();
      expect(extractSequenceFromOrderId('INV-010')).toBeNull();
      expect(extractSequenceFromOrderId(null)).toBeNull();
    });
  });

  describe('getCurrentMaxOrderSequence', () => {
    test('returns highest valid sequence', async () => {
      const OrderModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { orderId: 'ORD-001' },
            { orderId: 'ORD-010' },
            { orderId: 'INVALID' },
            { orderId: 'ORD-002' }
          ])
        })
      };

      const max = await getCurrentMaxOrderSequence(OrderModel);
      expect(max).toBe(10);
    });
  });

  describe('getNextOrderId', () => {
    test('increments existing counter and returns next order id', async () => {
      const CounterModel = {
        findById: jest.fn().mockResolvedValue({ _id: 'order', seq: 13 }),
        create: jest.fn(),
        findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: 'order', seq: 14 })
      };

      const OrderModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      };

      const next = await getNextOrderId({ CounterModel, OrderModel });
      expect(next).toBe('ORD-014');
      expect(CounterModel.create).not.toHaveBeenCalled();
    });

    test('seeds counter from max existing order when missing', async () => {
      const CounterModel = {
        findById: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ _id: 'order', seq: 12 }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: 'order', seq: 13 })
      };

      const OrderModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ orderId: 'ORD-012' }, { orderId: 'ORD-003' }])
        })
      };

      const next = await getNextOrderId({ CounterModel, OrderModel });
      expect(next).toBe('ORD-013');
      expect(CounterModel.create).toHaveBeenCalledWith({ _id: 'order', seq: 12 });
    });
  });
});
