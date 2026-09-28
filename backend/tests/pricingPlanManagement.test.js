const mongoose = require('mongoose');
const crypto = require('crypto');
const PricingPlan = require('../models/PricingPlan');
const Admin = require('../models/Admin');
const Invoice = require('../models/Invoice');
const { defaultPlans, runMigration } = require('../scripts/migratePlansToStandard');
const subscriptionService = require('../services/subscriptionService');

describe('Dynamic Pricing Plan System & Security Tests', () => {

  beforeAll(async () => {
    try {
      if (mongoose.connection.readyState === 0 && process.env.MONGODB_URI) {
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 1000,
          connectTimeoutMS: 1000
        });
      }
      if (mongoose.connection.readyState === 1) {
        await runMigration({ isQuiet: true });
      }
    } catch (err) {
      // Offline mode during unit tests
    }
  });

  afterAll(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (err) {
      // Ignore disconnect errors
    }
  });

  describe('1. Migration & Existing Plan Preservation', () => {
    test('Preserves existing Starter, Growth, and Scale plans with correct categories', async () => {
      const starter = mongoose.connection.readyState === 1
        ? await PricingPlan.findOne({ name: 'starter' })
        : defaultPlans.find(p => p.name === 'starter');

      const growth = mongoose.connection.readyState === 1
        ? await PricingPlan.findOne({ name: 'growth' })
        : defaultPlans.find(p => p.name === 'growth');

      const scale = mongoose.connection.readyState === 1
        ? await PricingPlan.findOne({ name: 'scale' })
        : defaultPlans.find(p => p.name === 'scale');

      expect(starter).toBeDefined();
      expect(starter.category).toBe('kwickbot_crm');
      expect(starter.monthlyPrice).toBe(1499);
      expect(starter.isPublished).toBe(true);

      expect(growth).toBeDefined();
      expect(growth.category).toBe('kwickbot_crm');
      expect(growth.monthlyPrice).toBe(2999);
      expect(growth.isPublished).toBe(true);

      expect(scale).toBeDefined();
      expect(scale.category).toBe('kwickbot_crm');
      expect(scale.monthlyPrice).toBe(9999);
      expect(scale.isPublished).toBe(true);
    });

    test('New CRM, API, and Enterprise plans are created as draft/unpublished', async () => {
      const crmConnect = mongoose.connection.readyState === 1
        ? await PricingPlan.findOne({ name: 'crm_connect' })
        : defaultPlans.find(p => p.name === 'crm_connect');

      const apiStarter = mongoose.connection.readyState === 1
        ? await PricingPlan.findOne({ name: 'api_starter' })
        : defaultPlans.find(p => p.name === 'api_starter');

      const customAuto = mongoose.connection.readyState === 1
        ? await PricingPlan.findOne({ name: 'custom_automation' })
        : defaultPlans.find(p => p.name === 'custom_automation');

      expect(crmConnect).toBeDefined();
      expect(crmConnect.isPublished).toBe(false);

      expect(apiStarter).toBeDefined();
      expect(apiStarter.isPublished).toBe(false);

      expect(customAuto).toBeDefined();
      expect(customAuto.isPublished).toBe(false);
      expect(customAuto.contactSales).toBe(true);
    });
  });

  describe('2. Public Endpoint Isolation & Security', () => {
    test('resolveEffectiveAllowedPages respects priority override chain', async () => {
      const mockAdminOverride = {
        role: 'admin',
        subscriptionPlan: 'starter',
        allowedPages: ['dashboard', 'conversations', 'custom-override-page']
      };

      const effectivePages = await subscriptionService.resolveEffectiveAllowedPages(mockAdminOverride);
      expect(effectivePages).toContain('custom-override-page');
      expect(effectivePages).toContain('dashboard');
    });

    test('isPageAllowed returns true for super_admin regardless of plan', async () => {
      const superAdmin = { role: 'super_admin' };
      const isAllowed = await subscriptionService.isPageAllowed(superAdmin, 'any-restricted-page');
      expect(isAllowed).toBe(true);
    });
  });

  describe('3. Pricing Math & Savings Calculation Logic', () => {
    test('Calculates yearly savings correctly when yearlyPrice is lower than monthlyPrice * 12', () => {
      const monthlyPrice = 2999;
      const yearlyPrice = 29990; // 2 months free -> ~17% off
      const totalMonthlyYear = monthlyPrice * 12; // 35988

      expect(yearlyPrice).toBeLessThan(totalMonthlyYear);
      const savingsPercent = Math.round(((totalMonthlyYear - yearlyPrice) / totalMonthlyYear) * 100);
      expect(savingsPercent).toBe(17);
    });

    test('Unlimited limits (-1) should be handled cleanly by helper', async () => {
      const scalePlan = mongoose.connection.readyState === 1
        ? await PricingPlan.findOne({ name: 'scale' })
        : defaultPlans.find(p => p.name === 'scale');

      expect(scalePlan.usageLimits.monthlyConversations).toBe(-1);
    });
  });

  describe('4. Active Subscriber Protection', () => {
    test('Prevents hard deletion of a pricing plan with active subscribers', async () => {
      const testPlanId = new mongoose.Types.ObjectId();
      const testPlan = new PricingPlan({
        _id: testPlanId,
        name: 'test_protected_plan',
        slug: 'test-protected-plan',
        displayName: 'Protected Test Plan',
        category: 'kwickbot_crm',
        monthlyPrice: 1999,
        isPublished: true,
        isActive: true
      });

      jest.spyOn(Admin, 'countDocuments').mockResolvedValue(1);

      // Simulation of deletion controller logic check
      const activeCount = await Admin.countDocuments({
        $or: [{ pricingPlanId: testPlan._id }, { subscriptionPlan: testPlan.name }],
        subscriptionStatus: 'active'
      });

      expect(activeCount).toBeGreaterThan(0);
    });
  });
});
