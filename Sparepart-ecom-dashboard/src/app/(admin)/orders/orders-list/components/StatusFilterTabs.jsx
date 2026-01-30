'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { orderAPI } from '@/helpers/orderApi';
import { ORDER_STATUS_LIST, getOrderStatusLabel } from '@/constants/orderStatus';
import clsx from 'clsx';

const StatusFilterTabs = ({ activeStatus, onStatusChange, className = '', compact = false, statusCounts: statusCountsProp, loading = false }) => {
  const { data: session } = useSession();
  const [statusCounts, setStatusCounts] = useState(() => {
    const base = { all: 0 };
    ORDER_STATUS_LIST.forEach((status) => {
      base[status] = 0;
    });
    return base;
  });

  useEffect(() => {
    if (statusCountsProp) {
      setStatusCounts((prev) => ({ ...prev, ...statusCountsProp }));
      return;
    }
    // Fetch status counts from API
    const fetchCounts = async () => {
      try {
        const token = session?.accessToken;
        if (!token) {
          return;
        }
        const response = await orderAPI.getStatusCounts(token);
        if (response?.data) {
          setStatusCounts(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch status counts:', error);
      }
    };

    if (session?.accessToken && !statusCountsProp) {
      fetchCounts();
    }
  }, [session, statusCountsProp]);

  const statusTabs = [
    { key: 'all', label: 'All' },
    ...ORDER_STATUS_LIST.map((status) => ({
      key: status,
      label: getOrderStatusLabel(status),
    })),
  ];

  return (
    <div
      className={clsx(
        compact
          ? "status-tabs-scroll"
          : "w-100 mb-4 status-tabs-scroll",
        className
      )}
    >
      <div className="d-flex flex-wrap align-items-center gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onStatusChange(tab.key)}
            type="button"
            disabled={loading}
            className={clsx(
              'btn text-nowrap px-3 py-1',
              activeStatus === tab.key
                ? 'border-0'
                : 'bg-light border text-muted'
            )}
            style={{
              textTransform: 'capitalize',
              fontSize: '0.8rem',
              ...(activeStatus === tab.key
                ? {
                  backgroundColor: 'var(--bs-primary-bg-subtle)',
                  color: 'var(--bs-primary)',
                }
                : {}),
            }}
          >
            {tab.label} <span className="ms-1 small">({statusCounts[tab.key] || 0})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StatusFilterTabs;
