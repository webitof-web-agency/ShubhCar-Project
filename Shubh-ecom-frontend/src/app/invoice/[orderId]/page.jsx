//src/app/invoice/[orderId]/page.jsx

"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import InvoiceTemplate from '@/components/invoice/InvoiceTemplate';
import { InvoiceShell } from '@/components/invoice/InvoiceShell';
import { Download, ArrowLeft, Printer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getOrder } from '@/services/orderService';
import { getAddressById } from '@/services/userAddressService';
import { API_BASE_URL } from '@/config/app.config';
import './print.css';

const InvoicePage = () => {
  const { orderId } = useParams();
  const router = useRouter();
  const { accessToken, isAuthenticated } = useAuth();
  const [orderDetail, setOrderDetail] = useState(null);
  const [address, setAddress] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || !accessToken || !orderId) return;
      
      // Fetch order data
      const data = await getOrder(accessToken, orderId);
      setOrderDetail(data || null);
      
      // Fetch shipping address
      if (data?.order?.shippingAddressId) {
        const addr = await getAddressById(data.order.shippingAddressId, accessToken);
        setAddress(addr || null);
      }
      
      // Fetch public invoice settings
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/public/settings`);
        if (response.ok) {
          const settingsData = await response.json();
          setSettings(settingsData.data || settingsData || {});
        }
      } catch (err) {
        console.error('Failed to fetch invoice settings:', err);
        // Continue with empty settings (template has defaults)
      }
    };
    load();
  }, [orderId, accessToken, isAuthenticated]);

  const handleDownloadPDF = () => {
    window.print();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!orderDetail?.order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invoice Not Found</h1>
          <Button onClick={() => router.push('/orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b print:hidden sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/orders')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 print:p-0 invoice-wrapper">
        <div className="max-w-4xl mx-auto">
          <InvoiceShell>
            <InvoiceTemplate 
              order={orderDetail.order} 
              items={orderDetail.items} 
              address={address}
              settings={settings}
            />
          </InvoiceShell>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
