import { useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { findNavItem, LEGACY_DASHBOARD_URL } from '../lib/navigation';

// Placeholder for pages not rebuilt yet. Links to the same page in the
// current dashboard, which keeps working unchanged.
export default function NotRebuilt() {
  const { pathname, hash } = useLocation();
  const item = findNavItem(pathname);
  const title = item?.label || 'This page';

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">Not rebuilt in the new dashboard yet</p>
        </div>
      </div>
      <Card pad={false}>
        <EmptyState
          title="Use the current dashboard for now"
          action={(
            <a className="btn btn-secondary" href={`${LEGACY_DASHBOARD_URL}${pathname}${hash}`}>
              Open {title.toLowerCase()} <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </a>
          )}
        >
          Everything on this page still works in the current dashboard. It moves here once it is redesigned.
        </EmptyState>
      </Card>
    </>
  );
}
