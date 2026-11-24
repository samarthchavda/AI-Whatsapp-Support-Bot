const mongoose = require('mongoose');

// Collections owned by the main backend. This API reads them and, for plans,
// writes the same fields the main backend uses. strict:false keeps every field
// the main backend stores, even ones this API doesn't know about.
const loose = (collection) => new mongoose.Schema({}, { strict: false, collection, timestamps: false });

const PricingPlan = mongoose.models.SaPricingPlan
  || mongoose.model('SaPricingPlan', loose('pricingplans'));
const Admin = mongoose.models.SaAdmin || mongoose.model('SaAdmin', loose('admins'));
const Invoice = mongoose.models.SaInvoice || mongoose.model('SaInvoice', loose('invoices'));
const PermissionProfile = mongoose.models.SaPermissionProfile
  || mongoose.model('SaPermissionProfile', loose('permissionprofiles'));
const AuditLog = mongoose.models.SaAuditLog || mongoose.model('SaAuditLog', loose('auditlogs'));
const Coupon = require('./Coupon');

module.exports = { PricingPlan, Admin, Invoice, PermissionProfile, AuditLog, Coupon };
