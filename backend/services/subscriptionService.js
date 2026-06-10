const Admin = require('../models/Admin');

/**
 * Daily check to find accounts whose monthly cycle has ended (30 days since last reset)
 * and reset their token usage to 0.
 */
async function checkAndResetMonthlyTokens() {
  console.log('⏰ Running monthly token usage reset check...');
  try {
    const now = new Date();
    // 30 days ago limit
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find active admins whose lastTokenReset is older than 30 days
    const result = await Admin.updateMany(
      { 
        isActive: true,
        lastTokenReset: { $lte: thirtyDaysAgo } 
      },
      { 
        $set: { 
          geminiTokensUsed: 0,
          lastTokenReset: now 
        } 
      }
    );

    console.log(`✅ Reset token usage for ${result.modifiedCount} admin accounts.`);
    return result;
  } catch (error) {
    console.error('❌ Error resetting monthly token usage:', error);
    throw error;
  }
}

module.exports = {
  checkAndResetMonthlyTokens
};
