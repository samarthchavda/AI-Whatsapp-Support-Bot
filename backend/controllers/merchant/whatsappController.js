const Template = require('../../models/Template');
const whatsappCloudAPI = require('../../services/whatsappCloudAPI');
const GlobalSettings = require('../../models/GlobalSettings');

const TEMPLATE_NAME_PATTERN = /^[a-z0-9_]+$/;
const ALLOWED_CATEGORIES = new Set(['MARKETING', 'UTILITY', 'AUTHENTICATION']);

exports.getCostAnalytics = async (req, res) => {
  const period = req.query.period || 'this_month';
  if (!['today', 'last_7_days', 'this_month'].includes(period)) {
    return res.status(400).json({ success: false, error: 'Choose today, last_7_days, or this_month.' });
  }
  try {
    const data = await whatsappCloudAPI.getEstimatedCosts(req.admin._id, period);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error loading Meta cost analytics:', error);
    return res.status(500).json({ success: false, error: 'Unable to load Meta cost analytics.' });
  }
};

const getTemplateVariables = (text = '') => [...new Set(
  [...String(text).matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]))
)].sort((a, b) => a - b);

const buildTemplateComponents = ({ header, body, footer, buttons, variableSamples }) => {
  const components = [];
  const cleanHeader = header && typeof header === 'object' ? header : {};

  if (cleanHeader.type === 'TEXT') {
    const text = String(cleanHeader.text || '').trim();
    if (!text || text.length > 60) throw new Error('Header text is required and must be 60 characters or fewer.');
    components.push({ type: 'HEADER', format: 'TEXT', text });
  }

  if (cleanHeader.type === 'IMAGE') {
    const mediaHandle = String(cleanHeader.mediaHandle || '').trim();
    if (!mediaHandle) throw new Error('An Image header requires a Meta media handle.');
    components.push({ type: 'HEADER', format: 'IMAGE', example: { header_handle: [mediaHandle] } });
  }

  const bodyText = String(body || '').trim();
  if (!bodyText || bodyText.length > 1024) throw new Error('Body text is required and must be 1,024 characters or fewer.');
  const variables = getTemplateVariables(bodyText);
  if (variables.some((value, index) => value !== index + 1)) {
    throw new Error('Body variables must be sequential, starting from {{1}}.');
  }

  const bodyComponent = { type: 'BODY', text: bodyText };
  if (variables.length) {
    const samples = Array.isArray(variableSamples) ? variableSamples.map((value) => String(value || '').trim()) : [];
    if (samples.length !== variables.length || samples.some((value) => !value)) {
      throw new Error('Add a sample value for every body variable before submitting to Meta.');
    }
    bodyComponent.example = { body_text: [samples] };
  }
  components.push(bodyComponent);

  const footerText = String(footer || '').trim();
  if (footerText) {
    if (footerText.length > 60) throw new Error('Footer text must be 60 characters or fewer.');
    components.push({ type: 'FOOTER', text: footerText });
  }

  if (Array.isArray(buttons) && buttons.length) {
    const normalizedButtons = buttons.map((button) => ({
      type: String(button.type || '').toUpperCase(),
      text: String(button.text || '').trim(),
      url: button.url ? String(button.url).trim() : undefined,
      phone_number: button.phone_number ? String(button.phone_number).trim() : undefined
    }));
    const quickReplies = normalizedButtons.every((button) => button.type === 'QUICK_REPLY');
    const ctas = normalizedButtons.every((button) => ['URL', 'PHONE_NUMBER'].includes(button.type));
    if ((!quickReplies && !ctas) || (quickReplies && normalizedButtons.length > 3) || (ctas && normalizedButtons.length > 2)) {
      throw new Error('Use up to 3 Quick Reply buttons or up to 2 CTA buttons.');
    }
    normalizedButtons.forEach((button) => {
      if (!button.text || button.text.length > 25) throw new Error('Each button needs text of 25 characters or fewer.');
      if (button.type === 'URL' && !/^https:\/\//i.test(button.url || '')) throw new Error('CTA URL buttons require a valid HTTPS URL.');
      if (button.type === 'PHONE_NUMBER' && !/^\+?[1-9]\d{6,14}$/.test(button.phone_number || '')) throw new Error('CTA phone buttons require an international phone number.');
    });
    components.push({ type: 'BUTTONS', buttons: normalizedButtons });
  }

  return components;
};

// Get all templates for the current admin
exports.getTemplates = async (req, res) => {
  try {
    const templates = await Template.find({ adminId: req.admin._id }).sort({ name: 1 });
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
};

// Create a template directly in the merchant's connected Meta WABA.
exports.createTemplate = async (req, res) => {
  try {
    const creationFlag = await GlobalSettings.findOne({ key: 'merchantTemplateCreationEnabled' });
    if (!creationFlag?.value) {
      return res.status(403).json({
        success: false,
        error: 'Template creation is currently disabled by the platform administrator.'
      });
    }

    const { name, category, language = 'en_US', header, body, footer, buttons, variableSamples } = req.body || {};
    const normalizedName = String(name || '').trim().toLowerCase();
    const normalizedCategory = String(category || '').toUpperCase();

    if (!TEMPLATE_NAME_PATTERN.test(normalizedName) || normalizedName.length > 512) {
      return res.status(400).json({ success: false, error: 'Template name must use lowercase letters, numbers, and underscores only.' });
    }
    if (!ALLOWED_CATEGORIES.has(normalizedCategory)) {
      return res.status(400).json({ success: false, error: 'Choose MARKETING, UTILITY, or AUTHENTICATION as the category.' });
    }
    if (await Template.exists({ adminId: req.admin._id, name: normalizedName })) {
      return res.status(409).json({ success: false, error: 'A template with this name already exists in your Kwickbot account.' });
    }
    if (!req.admin.whatsappAccessToken || !req.admin.whatsappBusinessAccountId) {
      return res.status(400).json({ success: false, error: 'Connect your WhatsApp Business account before creating a template.' });
    }

    const components = buildTemplateComponents({ header, body, footer, buttons, variableSamples });
    const metaPayload = { name: normalizedName, category: normalizedCategory, language: String(language || 'en_US'), components };
    const metaTemplate = await whatsappCloudAPI.createTemplate(metaPayload, {
      accessToken: req.admin.whatsappAccessToken,
      businessAccountId: req.admin.whatsappBusinessAccountId
    });
    const returnedStatus = String(metaTemplate.status || '').toUpperCase();
    const status = ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED'].includes(returnedStatus)
      ? returnedStatus
      : 'PENDING';
    const template = await Template.create({
      adminId: req.admin._id,
      metaTemplateId: metaTemplate.id,
      name: normalizedName,
      category: normalizedCategory,
      language: metaPayload.language,
      status,
      components
    });

    res.status(201).json({
      success: true,
      message: 'Template submitted to Meta for review.',
      data: template
    });
  } catch (error) {
    console.error('Error creating WhatsApp template:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      error: error.metaDetails || error.message || 'Failed to create template with Meta.',
      metaCode: error.metaCode
    });
  }
};

// Sync templates with Meta WhatsApp Graph API
exports.syncTemplates = async (req, res) => {
  try {
    const admin = req.admin;
    const adminId = admin._id;

    let customCredentials = null;
    if (admin && admin.whatsappAccessToken && admin.whatsappBusinessAccountId) {
      customCredentials = {
        accessToken: admin.whatsappAccessToken,
        businessAccountId: admin.whatsappBusinessAccountId
      };
    }

    const metaTemplates = await whatsappCloudAPI.fetchTemplates(customCredentials);

    // Extract valid template names returned from Meta Graph API
    const metaNames = metaTemplates.map(t => t.name);

    // Remove legacy mock templates AND any deleted templates no longer present on Meta Graph API
    await Template.deleteMany({
      adminId,
      $or: [
        { metaTemplateId: /^mock_/ },
        { name: { $nin: metaNames } }
      ]
    });

    const syncedTemplates = [];

    for (const tpl of metaTemplates) {
      // Find template by name and adminId
      let localTemplate = await Template.findOne({ adminId, name: tpl.name });

      const components = tpl.components || [];

      if (localTemplate) {
        // Update components, status, category, language
        localTemplate.metaTemplateId = tpl.id || localTemplate.metaTemplateId;
        localTemplate.category = tpl.category || localTemplate.category;
        localTemplate.language = tpl.language || localTemplate.language;
        localTemplate.status = tpl.status || localTemplate.status;
        localTemplate.components = components;
        await localTemplate.save();
        syncedTemplates.push(localTemplate);
      } else {
        // Create new template
        const newTemplate = new Template({
          adminId,
          metaTemplateId: tpl.id,
          name: tpl.name,
          category: tpl.category || 'UTILITY',
          language: tpl.language || 'en_US',
          status: tpl.status || 'APPROVED',
          components: components
        });
        await newTemplate.save();
        syncedTemplates.push(newTemplate);
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncedTemplates.length} real templates from Meta API`,
      data: syncedTemplates
    });
  } catch (error) {
    console.error('Error syncing templates:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Failed to sync templates with Meta API'
    });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin._id;

    const template = await Template.findOneAndDelete({ _id: id, adminId });
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
};

// Map template to transactional event
exports.mapTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { mappedEvent } = req.body;
    const adminId = req.admin._id;

    // Validate event type
    const validEvents = [null, 'order_confirmation', 'order_shipped', 'order_delivered', 'order_cancelled', 'abandoned_cart'];
    if (!validEvents.includes(mappedEvent)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mapped event type'
      });
    }

    // Find the targeted template
    const template = await Template.findOne({ _id: id, adminId });
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // If mapping to an event, unmap any other template currently assigned to this event
    if (mappedEvent) {
      await Template.updateMany(
        { adminId, mappedEvent },
        { $set: { mappedEvent: null } }
      );
    }

    // Set new mapping
    template.mappedEvent = mappedEvent;
    await template.save();

    res.json({
      success: true,
      message: mappedEvent 
        ? `Successfully mapped template to ${mappedEvent}`
        : 'Successfully unmapped template',
      data: template
    });
  } catch (error) {
    console.error('Error mapping template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to map template'
    });
  }
};
