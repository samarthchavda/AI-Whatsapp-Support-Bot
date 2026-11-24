// New super admin pages inside the old dashboard. Each page renders inside
// .sa-ui, where the new design (sa.css) applies; the old CSS doesn't reach it.
import React from 'react';
import './sa.css';
import Merchants from './pages/Merchants';
import MerchantDetail from './pages/MerchantDetail';
import Plans from './pages/Plans';
import PlanEditor from './pages/PlanEditor';
import Coupons from './pages/Coupons';

const inNewDesign = (Page) => function SuperAdminNewDesign(props) {
  return (
    <div className="sa-ui">
      <Page {...props} />
    </div>
  );
};

export const SaMerchants = inNewDesign(Merchants);
export const SaMerchantDetail = inNewDesign(MerchantDetail);
export const SaPlans = inNewDesign(Plans);
export const SaPlanEditor = inNewDesign(PlanEditor);
export const SaCoupons = inNewDesign(Coupons);
