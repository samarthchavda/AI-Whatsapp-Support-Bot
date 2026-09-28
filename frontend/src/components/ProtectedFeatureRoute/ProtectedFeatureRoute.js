import React from 'react';
import { useEffectiveAccess } from '../../context/EffectiveAccessContext';
import AccessRestricted from '../../pages/AccessRestricted/AccessRestricted';

function ProtectedFeatureRoute({ 
  pageKey, 
  permissionKey, 
  featureKey, 
  title, 
  description, 
  requiredFeature,
  children 
}) {
  const { loading, canViewPage, hasPermission, hasFeature } = useEffectiveAccess();

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div className="spinner" style={{ width: '36px', height: '36px', borderWidth: '3px' }}></div>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary, #667085)' }}>Checking feature permissions...</span>
      </div>
    );
  }

  const pageAllowed = pageKey ? canViewPage(pageKey) : true;
  const permAllowed = permissionKey ? hasPermission(permissionKey) : true;
  const featAllowed = featureKey ? hasFeature(featureKey) : true;

  if (pageAllowed && permAllowed && featAllowed) {
    return children;
  }

  return (
    <AccessRestricted 
      title={title || "Feature Upgrade Required"}
      description={description || "Your current subscription plan does not include access to this module. Please upgrade your plan to access this feature."}
      requiredFeature={requiredFeature || pageKey || "Plan Upgrade"}
    />
  );
}

export default ProtectedFeatureRoute;
