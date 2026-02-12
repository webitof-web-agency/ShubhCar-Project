"use client";

/**
 * Payment Processing Page
 * 
 * Live payment gateway processing flow (Razorpay).
 * 
 * Flow:
 * 1. Receives orderId and paymentMethod from checkout
 * 2. Initiates payment via backend to create Razorpay order
 * 3. Opens Razorpay Checkout
 * 4. Redirects to /payment/callback with result
 */

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import APP_CONFIG from '@/config/app.config';
import { processRazorpayPayment } from '@/services/razorpayService';
import { confirmPayment } from '@/services/paymentService';

function PaymentProcessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken } = useAuth();
  const { clearCart } = useCart();
  
  const [status, setStatus] = useState('initializing'); // initializing, processing, success, failed
  const [error, setError] = useState(null);
  
  // Prevent double-initiation
  const initiatedRef = useRef(false);

  const orderId = searchParams.get('orderId');
  const paymentMethod = searchParams.get('method');

  useEffect(() => {
   // 1. Validation
    if (!orderId || !paymentMethod) {
      setError('Invalid payment request. Missing order details.');
      setStatus('failed');
      return;
    }
    
    if (paymentMethod !== 'razorpay') {
      setError('Unsupported payment method.');
      setStatus('failed');
      return;
    }


        // 2. Retrieve Pending Order Data (from session, as per checkout flow)
    const storedOrder = sessionStorage.getItem('pendingOrder');
    if (!storedOrder) {
      setError('Session expired. Please try checking out again.');
      setStatus('failed');
      return;
    }

         const orderData = JSON.parse(storedOrder);
    if (orderData.orderId !== orderId) {
      setError('Order mismatch. Please try again.');
      setStatus('failed');
      return;
    }

    // 3. Initiate Payment
    const startPayment = async () => {
      if (initiatedRef.current) return;
      initiatedRef.current = true;

         setStatus('processing');

      try {
        const userDetails = {
          name: user?.firstName ? `${user.firstName} ${user.lastName}` : '',
          email: user?.email,
          phone: user?.phoneNumber
        };
        const result = await processRazorpayPayment(accessToken, orderData, userDetails);

        if (result.success) {
          handleSuccess(result.details, orderData);
        }
      } catch (err) {
        console.error('[PAYMENT] Failed:', err);
        handleFailure(err.message);
      }
    };

    startPayment();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, paymentMethod, accessToken, user]); // Run once on mount (guarded by ref)

  const handleSuccess = async (details, orderData) => {
    setStatus('success');
    toast.success('Payment Successful!');

    console.log('[PAYMENT_PROCESS] Success details:', details);

    if (details?.internalPaymentId && accessToken) {
      try {
        sessionStorage.setItem('lastPayment', JSON.stringify({
          paymentId: details.internalPaymentId,
          orderId: orderData?.orderId,
          gateway: 'razorpay',
          createdAt: new Date().toISOString(),
        }));
        // Extract Razorpay payment ID and send it to backend
        const razorpayPaymentId = details.razorpay_payment_id;
        console.log('[PAYMENT_PROCESS] Confirming payment:', details.internalPaymentId, 'with transactionId:', razorpayPaymentId);
        await confirmPayment(accessToken, details.internalPaymentId, razorpayPaymentId);
      } catch (confirmError) {
        console.error('[PAYMENT] Confirm failed:', confirmError);
      }
    }

    // Store order data for Thank You page (crucial for display)
    if (orderData) {
      sessionStorage.setItem('lastOrder', JSON.stringify(orderData));
    }

    // Clear cart and temporary session data
    clearCart();
    sessionStorage.removeItem('pendingOrder');

    // Redirect to success page
    setTimeout(() => {
        // Use configured success redirect
        const redirectPath = APP_CONFIG.payments.gateways.razorpay.redirect.success;
        router.push(redirectPath); 
    }, 1500);
  };

  const handleFailure = (message) => {
    setStatus('failed');
    setError(message || 'Payment failed. Please try again.');
    initiatedRef.current = false; // Allow retry
  };

  const handleRetry = () => {
    setError(null);
    setStatus('initializing');
    initiatedRef.current = false; 
    // Effect will re-run or we can manually trigger logic if needed
    // But since access dependencies might not change, better to reload or re-trigger logic
    window.location.reload(); 
  };

  const handleCancel = () => {
    router.push('/checkout');
  };

  return (
     <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
    <Card className="max-w-md w-full p-8 shadow-xl">
        
        {/* PROCESSING STATE */}
        {(status === 'initializing' || status === 'processing') && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Processing Payment</h2>
            <p className="text-muted-foreground">
              Please wait while we connect to Razorpay secure gateway...
            </p>
            <div className="mt-6 p-4 bg-zinc-100 rounded-lg text-xs text-zinc-500">
              <p>Do not close this window or press back button.</p>
            </div>
          </div>
        
         

          )}

        {/* SUCCESS STATE */}
        {status === 'success' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-green-700">Payment Successful</h2>
            <p className="text-muted-foreground">
              Redirecting you to order confirmation...
            </p>

            
          </div>
        )}

          {/* FAILED STATE */}
        {status === 'failed' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-red-700">Payment Failed</h2>
            <p className="text-zinc-600 mb-6 px-4">
              {error}
            </p>
            
            <div className="flex flex-col gap-3">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Payment
              </Button>
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Return to Checkout
              </Button>
            </div>
          </div>
        )}

    </Card>
    </div>
  );
}

export default function PaymentProcessPage() {
  return (
    <Layout>
      <Suspense
        fallback={
          <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 shadow-xl">
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Loading Payment</h2>
                <p className="text-muted-foreground">
                  Preparing secure payment session...
                </p>
              </div>
            </Card>
          </div>
        }
      >
        <PaymentProcessInner />
      </Suspense>
    </Layout>
  );
}
