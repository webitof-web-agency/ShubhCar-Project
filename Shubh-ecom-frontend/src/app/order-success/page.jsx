"use client";

import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import APP_CONFIG from '@/config/app.config';
import { useAuth } from '@/context/AuthContext';
import { confirmPayment } from '@/services/paymentService';

export default function ThankYouPage() {
  const { accessToken } = useAuth();
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [orderData] = useState(() => {
    if (typeof window === 'undefined') return null;
    const storedOrderData = sessionStorage.getItem('lastOrder');
    if (!storedOrderData) return null;
    try {
      return JSON.parse(storedOrderData);
    } catch (error) {
      console.error('[THANK_YOU] Failed to parse order data:', error);
      return null;
    }
  });

  useEffect(() => {
    // Clear the stored order data after displaying
    return () => {
      sessionStorage.removeItem('lastOrder');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !accessToken) return;
    const storedPayment = sessionStorage.getItem('lastPayment');
    if (!storedPayment) return;

    let paymentData = null;
    try {
      paymentData = JSON.parse(storedPayment);
    } catch (err) {
      console.error('[ORDER_SUCCESS] Failed to parse lastPayment:', err);
      return;
    }

    if (!paymentData?.paymentId) return;

    setVerifyingPayment(true);
    let cancelled = false;

    const retryConfirm = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (cancelled) return;
        try {
          const confirmation = await confirmPayment(accessToken, paymentData.paymentId);
          const status = confirmation?.status || '';
          if (status === 'success') {
            sessionStorage.removeItem('lastPayment');
            setVerifyingPayment(false);
            return;
          }
        } catch (err) {
          console.error('[ORDER_SUCCESS] Retry confirm failed:', err);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      setVerifyingPayment(false);
    };

    retryConfirm();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {verifyingPayment && (
            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
              Verifying payment with gateway… this can take a few seconds.
            </div>
          )}
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4 animate-in zoom-in duration-300">
              <CheckCircle2 className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-muted-foreground">
              Thank you for your order. We&apos;ll send you a confirmation email shortly.
            </p>
          </div>

          {/* Order Details Card */}
          <Card className="p-6 mb-6">
            <div className="space-y-4">
              {/* Order Number */}
              {orderData?.orderNumber && (
                <div className="pb-4 border-b">
                  <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                  <p className="text-xl font-semibold">{orderData.orderNumber}</p>
                </div>
              )}

              {/* Payment Method */}
              {orderData?.paymentMethod && (
                <div className="pb-4 border-b">
                  <p className="text-sm text-muted-foreground mb-1">Payment Method</p>
                  <p className="font-medium capitalize">
                    {orderData.paymentMethod === 'cod' 
                      ? 'Cash on Delivery (COD)' 
                      : APP_CONFIG.payments.methods[orderData.paymentMethod]?.displayName || orderData.paymentMethod}
                  </p>
                  {orderData.paymentMethod !== 'cod' && (
                    <p className="text-sm text-success mt-1">Payment Successful</p>
                  )}
                </div>
              )}

              {/* Total Amount */}
              {orderData?.total && (
                <div className="pb-4 border-b">
                  <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-2xl font-bold">Rs. {orderData.total.toLocaleString()}</p>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-primary/5 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  What&apos;s Next?
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>You&apos;ll receive an order confirmation email with tracking details</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>Track your order status in your account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>
                      {orderData?.paymentMethod === 'cod' 
                        ? 'Prepare exact change for cash on delivery'
                        : 'Your payment has been processed successfully'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/orders" className="flex-1">
              <Button className="w-full" size="lg">
                View Orders
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full" size="lg">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
