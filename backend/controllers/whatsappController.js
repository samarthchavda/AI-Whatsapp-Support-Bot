const Template = require('../models/Template');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');

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

// Sync templates with Meta WhatsApp Graph API
exports.syncTemplates = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const metaTemplates = await whatsappCloudAPI.fetchTemplates();

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
          metaTemplateId: tpl.id || 'mock_id_' + Math.random().toString(36).substr(2, 9),
          name: tpl.name,
          category: tpl.category,
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
      message: `Successfully synced ${syncedTemplates.length} templates`,
      data: syncedTemplates
    });
  } catch (error) {
    console.error('Error syncing templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync templates with Meta API'
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
    const validEvents = [null, 'order_confirmation', 'order_shipped', 'order_delivered'];
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
