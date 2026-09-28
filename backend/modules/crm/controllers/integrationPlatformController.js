const CRMConnection = require('../../../models/CRMConnection');
const CRMFieldMapping = require('../../../models/CRMFieldMapping');
const AutomationRule = require('../../../models/AutomationRule');
const IntegrationEvent = require('../../../models/IntegrationEvent');
const crmProviderRegistry = require('../providers/crmProviderRegistry');
const { replayEvent } = require('../services/eventPipelineService');
const { validateSSRF } = require('../../../utils/ssrfValidator');
const { logAction } = require('../../../services/auditLogService');

// 1. Overview Dashboard
exports.getOverview = async (req, res) => {
  try {
    const adminId = req.admin._id;

    const [
      totalConnections,
      activeConnections,
      totalAutomations,
      activeAutomations,
      totalFieldMappings,
      recentEvents,
      failedEventsCount
    ] = await Promise.all([
      CRMConnection.countDocuments({ adminId }),
      CRMConnection.countDocuments({ adminId, status: 'connected', isActive: true }),
      AutomationRule.countDocuments({ adminId }),
      AutomationRule.countDocuments({ adminId, status: 'active' }),
      CRMFieldMapping.countDocuments({ adminId, isActive: true }),
      IntegrationEvent.find({ adminId }).sort({ createdAt: -1 }).limit(10),
      IntegrationEvent.countDocuments({ adminId, status: { $in: ['failed', 'dead_letter'] } })
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalConnections,
          activeConnections,
          totalAutomations,
          activeAutomations,
          totalFieldMappings,
          failedEventsCount
        },
        recentEvents,
        supportedProviders: crmProviderRegistry.listSupportedProviders()
      }
    });
  } catch (error) {
    console.error('Error fetching integration overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch integration overview' });
  }
};

// 2. CRM Connections CRUD
exports.getConnections = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { adminId };
    if (req.query.provider) query.provider = req.query.provider.toLowerCase();
    if (req.query.status) query.status = req.query.status.toLowerCase();

    const [connections, total] = await Promise.all([
      CRMConnection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CRMConnection.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: connections,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching CRM connections:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch connections' });
  }
};

exports.getConnectionById = async (req, res) => {
  try {
    const connection = await CRMConnection.findOne({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!connection) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    res.json({
      success: true,
      data: connection
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch connection' });
  }
};

exports.createConnection = async (req, res) => {
  try {
    const {
      provider,
      displayName,
      baseUrl,
      databaseName,
      tenantIdentifier,
      credentials,
      configuration
    } = req.body;

    if (!provider || !displayName || !baseUrl) {
      return res.status(400).json({ success: false, error: 'Provider, display name, and base URL are required' });
    }

    // SSRF validation
    const ssrfCheck = await validateSSRF(baseUrl);
    if (!ssrfCheck.isValid) {
      return res.status(400).json({ success: false, error: `Invalid connection URL: ${ssrfCheck.error}` });
    }

    const connection = new CRMConnection({
      adminId: req.admin._id,
      provider: provider.toLowerCase(),
      displayName: displayName.trim(),
      baseUrl: ssrfCheck.sanitizedUrl,
      databaseName: databaseName || null,
      tenantIdentifier: tenantIdentifier || null,
      configuration: configuration || {},
      status: 'configuring'
    });

    if (credentials) {
      connection.setCredentials(credentials);
    } else {
      connection.setCredentials({});
    }

    await connection.save();

    await logAction({
      action: 'crm_connection_created',
      actor: req.admin,
      target: connection._id.toString(),
      details: { provider: connection.provider, displayName: connection.displayName }
    });

    res.status(201).json({
      success: true,
      message: 'CRM connection configured successfully',
      data: connection
    });
  } catch (error) {
    console.error('Error creating CRM connection:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create connection' });
  }
};

exports.updateConnection = async (req, res) => {
  try {
    const connection = await CRMConnection.findOne({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!connection) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    const {
      displayName,
      baseUrl,
      databaseName,
      tenantIdentifier,
      credentials,
      configuration,
      isActive
    } = req.body;

    if (displayName) connection.displayName = displayName.trim();
    if (databaseName !== undefined) connection.databaseName = databaseName;
    if (tenantIdentifier !== undefined) connection.tenantIdentifier = tenantIdentifier;
    if (configuration) connection.configuration = configuration;
    if (isActive !== undefined) connection.isActive = Boolean(isActive);

    if (baseUrl) {
      const ssrfCheck = await validateSSRF(baseUrl);
      if (!ssrfCheck.isValid) {
        return res.status(400).json({ success: false, error: `Invalid connection URL: ${ssrfCheck.error}` });
      }
      connection.baseUrl = ssrfCheck.sanitizedUrl;
    }

    if (credentials) {
      connection.setCredentials(credentials);
      await logAction({
        action: 'crm_credentials_updated',
        actor: req.admin,
        target: connection._id.toString(),
        details: { provider: connection.provider }
      });
    }

    await connection.save();

    res.json({
      success: true,
      message: 'Connection updated successfully',
      data: connection
    });
  } catch (error) {
    console.error('Error updating CRM connection:', error);
    res.status(500).json({ success: false, error: 'Failed to update connection' });
  }
};

exports.testConnection = async (req, res) => {
  try {
    const connection = await CRMConnection.findOne({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!connection) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    const providerInstance = crmProviderRegistry.get(connection.provider);
    if (!providerInstance) {
      return res.status(400).json({ success: false, error: `Unsupported provider: ${connection.provider}` });
    }

    const credentials = connection.getCredentials();
    const testResult = await providerInstance.testConnection(connection, credentials, { admin: req.admin });

    connection.lastConnectionTestAt = new Date();
    if (testResult.success) {
      connection.status = 'connected';
      connection.lastErrorCode = null;
      connection.lastErrorMessageSanitized = null;
    } else {
      connection.status = 'error';
      connection.lastErrorCode = testResult.code || 'TEST_FAILED';
      connection.lastErrorMessageSanitized = testResult.error || 'Connection test failed';
    }

    await connection.save();

    await logAction({
      action: 'crm_connection_tested',
      actor: req.admin,
      target: connection._id.toString(),
      details: {
        provider: connection.provider,
        success: testResult.success,
        error: testResult.error || null
      }
    });

    res.json({
      success: testResult.success,
      code: testResult.code || null,
      message: testResult.success ? 'Connection verified successfully' : (testResult.error || 'Connection test failed'),
      data: connection
    });
  } catch (error) {
    console.error('Error testing CRM connection:', error);
    res.status(500).json({ success: false, error: 'Internal error testing CRM connection' });
  }
};

exports.disconnectConnection = async (req, res) => {
  try {
    const connection = await CRMConnection.findOne({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!connection) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    connection.status = 'disconnected';
    await connection.save();

    await logAction({
      action: 'crm_connection_disconnected',
      actor: req.admin,
      target: connection._id.toString(),
      details: { provider: connection.provider }
    });

    res.json({
      success: true,
      message: 'CRM connection disconnected',
      data: connection
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to disconnect connection' });
  }
};

// 3. Field Mappings CRUD
exports.getFieldMappings = async (req, res) => {
  try {
    const { id: connectionId } = req.params;
    const adminId = req.admin._id;

    // Verify connection exists for tenant
    const connection = await CRMConnection.findOne({ _id: connectionId, adminId });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    const query = { adminId, connectionId };
    if (req.query.entityType) query.entityType = req.query.entityType.toLowerCase();

    const mappings = await CRMFieldMapping.find(query).sort({ entityType: 1, sourceField: 1 });

    // Group mappings by entityType so the frontend mapping table and active mapping list work seamlessly
    const grouped = {};
    for (const m of mappings) {
      if (!grouped[m.entityType]) {
        grouped[m.entityType] = {
          _id: m._id,
          entityType: m.entityType,
          direction: 'bidirectional',
          mappings: []
        };
      }
      grouped[m.entityType].mappings.push({
        _id: m._id,
        sourceField: m.sourceField,
        targetField: m.destinationField,
        destinationField: m.destinationField,
        transformation: m.transformation || 'none',
        defaultValue: m.defaultValue || ''
      });
    }

    const groupedArray = Object.values(grouped);

    res.json({
      success: true,
      data: groupedArray.length > 0 ? groupedArray : mappings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch field mappings' });
  }
};

const normalizeTransformation = (trans) => {
  if (!trans || trans === 'direct' || trans === 'none') return 'none';
  const valid = ['none', 'uppercase', 'lowercase', 'trim', 'number', 'boolean', 'date', 'custom_regex'];
  const t = trans.toLowerCase().trim();
  return valid.includes(t) ? t : 'none';
};

exports.createFieldMapping = async (req, res) => {
  try {
    const { id: connectionId } = req.params;
    const adminId = req.admin._id;
    const { entityType } = req.body;

    const connection = await CRMConnection.findOne({ _id: connectionId, adminId });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Connection not found' });
    }

    if (!entityType) {
      return res.status(400).json({ success: false, error: 'Entity type is required' });
    }

    // Support batch mappings from UI
    if (Array.isArray(req.body.mappings) && req.body.mappings.length > 0) {
      const savedMappings = [];
      for (const row of req.body.mappings) {
        const src = (row.sourceField || '').trim();
        const dst = (row.destinationField || row.targetField || '').trim();
        if (!src || !dst) continue;

        const trans = normalizeTransformation(row.transformation);
        const mapping = await CRMFieldMapping.findOneAndUpdate(
          { adminId, connectionId, entityType: entityType.toLowerCase(), sourceField: src },
          {
            destinationField: dst,
            transformation: trans,
            required: Boolean(row.required),
            defaultValue: row.defaultValue || null,
            isActive: true
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        savedMappings.push(mapping);
      }

      return res.status(201).json({
        success: true,
        message: 'Field mappings saved successfully',
        data: savedMappings
      });
    }

    // Single mapping fallback
    const { sourceField, destinationField, targetField, transformation, required, defaultValue } = req.body;
    const src = (sourceField || '').trim();
    const dst = (destinationField || targetField || '').trim();

    if (!src || !dst) {
      return res.status(400).json({ success: false, error: 'Entity type, source field, and destination field are required' });
    }

    const trans = normalizeTransformation(transformation);
    const mapping = await CRMFieldMapping.findOneAndUpdate(
      { adminId, connectionId, entityType: entityType.toLowerCase(), sourceField: src },
      {
        destinationField: dst,
        transformation: trans,
        required: Boolean(required),
        defaultValue: defaultValue || null,
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      message: 'Field mapping created successfully',
      data: mapping
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'Field mapping already exists for this source field' });
    }
    console.error('createFieldMapping error:', error);
    res.status(500).json({ success: false, error: 'Failed to create field mapping' });
  }
};

exports.updateFieldMapping = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const { entityType, mappings } = req.body;

    // If batch update from frontend
    if (Array.isArray(mappings) && mappings.length > 0) {
      const existing = await CRMFieldMapping.findOne({ _id: req.params.id, adminId });
      const connectionId = existing ? existing.connectionId : null;

      if (connectionId && entityType) {
        const savedMappings = [];
        for (const row of mappings) {
          const src = (row.sourceField || '').trim();
          const dst = (row.destinationField || row.targetField || '').trim();
          if (!src || !dst) continue;

          const trans = normalizeTransformation(row.transformation);
          const updated = await CRMFieldMapping.findOneAndUpdate(
            { adminId, connectionId, entityType: entityType.toLowerCase(), sourceField: src },
            {
              destinationField: dst,
              transformation: trans,
              required: Boolean(row.required),
              defaultValue: row.defaultValue || null,
              isActive: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          savedMappings.push(updated);
        }

        return res.json({
          success: true,
          message: 'Field mappings updated successfully',
          data: savedMappings
        });
      }
    }

    const mapping = await CRMFieldMapping.findOne({
      _id: req.params.id,
      adminId
    });

    if (!mapping) {
      return res.status(404).json({ success: false, error: 'Field mapping not found' });
    }

    const { destinationField, targetField, transformation, required, defaultValue, isActive } = req.body;
    const dst = destinationField || targetField;
    if (dst) mapping.destinationField = dst.trim();
    if (transformation) mapping.transformation = normalizeTransformation(transformation);
    if (required !== undefined) mapping.required = Boolean(required);
    if (defaultValue !== undefined) mapping.defaultValue = defaultValue;
    if (isActive !== undefined) mapping.isActive = Boolean(isActive);

    await mapping.save();

    res.json({
      success: true,
      message: 'Field mapping updated successfully',
      data: mapping
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update field mapping' });
  }
};

exports.deleteFieldMapping = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const mapping = await CRMFieldMapping.findOne({ _id: req.params.id, adminId });

    if (!mapping) {
      return res.status(404).json({ success: false, error: 'Field mapping not found' });
    }

    // Delete all mappings for this entityType & connection if grouped
    await CRMFieldMapping.deleteMany({
      adminId,
      connectionId: mapping.connectionId,
      entityType: mapping.entityType
    });

    res.json({
      success: true,
      message: 'Field mapping deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete field mapping' });
  }
};

// 4. Automation Rules CRUD
exports.getAutomations = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const automations = await AutomationRule.find({ adminId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: automations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch automation rules' });
  }
};

exports.createAutomation = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const { name, trigger, conditions, actions, connectionId, approvalRequired } = req.body;

    if (!name || !trigger) {
      return res.status(400).json({ success: false, error: 'Automation rule name and trigger event are required' });
    }

    const automation = new AutomationRule({
      adminId,
      connectionId: connectionId || null,
      name: name.trim(),
      trigger,
      conditions: conditions || [],
      actions: actions || [],
      approvalRequired: Boolean(approvalRequired),
      status: 'active'
    });

    await automation.save();

    await logAction({
      action: 'automation_rule_created',
      actor: req.admin,
      target: automation._id.toString(),
      details: { name: automation.name, trigger: automation.trigger }
    });

    res.status(201).json({
      success: true,
      message: 'Automation rule created successfully',
      data: automation
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create automation rule' });
  }
};

exports.updateAutomation = async (req, res) => {
  try {
    const automation = await AutomationRule.findOne({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation rule not found' });
    }

    const { name, trigger, conditions, actions, status, approvalRequired } = req.body;
    if (name) automation.name = name.trim();
    if (trigger) automation.trigger = trigger;
    if (conditions) automation.conditions = conditions;
    if (actions) automation.actions = actions;
    if (status) automation.status = status;
    if (approvalRequired !== undefined) automation.approvalRequired = Boolean(approvalRequired);

    await automation.save();

    res.json({
      success: true,
      message: 'Automation rule updated successfully',
      data: automation
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update automation rule' });
  }
};

exports.toggleAutomation = async (req, res) => {
  try {
    const automation = await AutomationRule.findOne({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!automation) {
      return res.status(404).json({ success: false, error: 'Automation rule not found' });
    }

    automation.status = automation.status === 'active' ? 'paused' : 'active';
    await automation.save();

    res.json({
      success: true,
      message: `Automation rule ${automation.status === 'active' ? 'activated' : 'paused'}`,
      data: automation
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to toggle automation rule' });
  }
};

exports.deleteAutomation = async (req, res) => {
  try {
    const result = await AutomationRule.findOneAndDelete({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Automation rule not found' });
    }

    res.json({
      success: true,
      message: 'Automation rule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete automation rule' });
  }
};

// 5. Integration Logs & Event Replay
exports.getEvents = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { adminId };
    if (req.query.status) query.status = req.query.status.toLowerCase();
    if (req.query.eventType) query.eventType = req.query.eventType;
    if (req.query.provider) query.provider = req.query.provider.toLowerCase();

    const [events, total] = await Promise.all([
      IntegrationEvent.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      IntegrationEvent.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch integration logs' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await IntegrationEvent.findOne({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch event details' });
  }
};

exports.retryEvent = async (req, res) => {
  try {
    const event = await replayEvent(req.admin, req.params.id);
    res.json({
      success: true,
      message: 'Event successfully queued for retry replay',
      data: event
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || 'Failed to retry event' });
  }
};
