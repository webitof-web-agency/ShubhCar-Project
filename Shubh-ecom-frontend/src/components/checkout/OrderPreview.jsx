//src/components/checkout/OrderPreview.jsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MapPin, Edit2, Package, Tag, ShieldCheck, ArrowLeft, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAddressById } from '@/services/userAddressService';
import { getDisplayPrice, formatPrice } from '@/services/pricingService';
import { resolveProductImages } from '@/utils/media';
import { getTaxSuffix } from '@/services/taxDisplayService';

/**
 * Purely Presentational Order Preview
 * NO business logic - only displays pre-computed values
 * All calculations (subtotal, tax, shipping, total) must be done by parent
 */
export function OrderPreview({
  address,
  cartItems,
  summary,
  summaryLoading = false,
  onBack,
  onNext,
}) {
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const { accessToken, user } = useAuth();
  const subtotal = summary?.taxableAmount ?? summary?.subtotal ?? 0;
  const discount = summary?.discountAmount ?? 0;
  const tax = summary?.taxAmount ?? 0;
  const shipping = summary?.shippingFee ?? 0;
  const total = summary?.grandTotal ?? 0;
  const couponCode = summary?.couponCode || null;
  const taxLabel = getTaxSuffix(summary?.settings?.taxPriceDisplayCart || 'including');

  const addressId = useMemo(() => {
    if (!address) return null;
    if (typeof address === 'string') return address;
    return address._id || address.id || null;
  }, [address]);

  useEffect(() => {
    const loadAddress = async () => {
      if (!addressId || !accessToken) {
        setResolvedAddress(typeof address === 'object' ? address : null);
        return;
      }
      try {
        const data = await getAddressById(addressId, accessToken);
        setResolvedAddress(data || null);
      } catch (error) {
        console.error('[ORDER_PREVIEW] Failed to load address:', error);
        setResolvedAddress(null);
      }
    };
    loadAddress();
  }, [addressId, address, accessToken]);

  const safeAddress = resolvedAddress || {};
  const hasValidAddress = addressId && (safeAddress.name || safeAddress.fullName);

  return (
    <div className="max-w-4xl mx-auto px-4 py-3">
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Left Column - Order Details */}
        <div className="space-y-6">
          {/* Order Items */}
          <Card className="border-zinc-200 overflow-hidden">
            <div className="bg-secondary/30 px-5 py-4 border-b border-border/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Order Items ({cartItems.length})
              </h3>
            </div>
            <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
              {cartItems.map((item) => {
                const unitPrice = getDisplayPrice(item.product, user).price;
                return (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-border/30 last:border-0 last:pb-0">
                    <img
                      src={resolveProductImages(item.product?.images || [])[0]}
                      alt={item.product?.name || 'Product'}
                      className="w-20 h-20 object-cover rounded-lg bg-secondary shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">{item.product?.name || 'Product'}</h4>
                      <p className="text-xs text-muted-foreground">
                        {item.product?.productType === 'OEM'
                          ? (item.product?.oemNumber || 'N/A')
                          : (item.product?.manufacturerBrand || 'N/A')}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">
                          Qty: {item.quantity} x {formatPrice(unitPrice || 0)}
                        </span>
                        <span className="font-semibold text-primary">
                          {formatPrice((unitPrice || 0) * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Shipping Address */}
          <Card className="border-zinc-200 overflow-hidden">
            <div className="bg-secondary/30 px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Delivery Address
              </h3>
              <Button variant="ghost" size="sm" onClick={onBack} className="text-primary hover:text-primary/80">
                <Edit2 className="w-4 h-4 mr-2" />
                Change
              </Button>
            </div>
            <div className="p-5">
              {hasValidAddress ? (
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">{safeAddress.name || safeAddress.fullName}</p>
                  <p className="text-sm text-muted-foreground">{safeAddress.phone}</p>
                  <p className="text-sm text-muted-foreground mt-3">
                    {safeAddress.line1 || safeAddress.address}
                    {safeAddress.line2 ? `, ${safeAddress.line2}` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {safeAddress.city}, {safeAddress.state} - {safeAddress.postalCode || safeAddress.pincode}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No address selected</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Price Summary & Actions */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card className="border-zinc-200 overflow-hidden sticky top-4">
            <div className="bg-secondary/30 px-5 py-4 border-b border-border/50">
              <h3 className="font-semibold">Price Summary</h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{summaryLoading ? '...' : formatPrice(subtotal)}</span>
              </div>

              {/* Coupon Discount - Highlighted */}
              {couponCode && discount > 0 && (
                <div className="border-dashed border-green-400 border-2 bg-green-50 rounded-lg p-3 -mx-2">
                  <div className="flex items-center justify-between mb-2 h-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-semibold text-green-400">Coupon Applied</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-green-400">{couponCode}</span>
                    <span className="text-lg font-bold text-green-400">-{formatPrice(discount)}</span>
                  </div>
                  <p className="text-xs text-green-400 mt-1">
                    You saved {formatPrice(discount)}
                  </p>
                </div>
              )}

              {/* Tax */}
              <div className="flex justify-between text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-xs text-muted-foreground/70">
                    {taxLabel}
                  </span>
                </div>
                <span className="font-medium">{summaryLoading ? '...' : formatPrice(tax)}</span>
              </div>

              {/* Shipping */}
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Shipping</span>
                {summaryLoading ? (
                  <span className="font-medium">...</span>
                ) : shipping === 0 ? (
                  <Badge variant="secondary" className="text-xs font-semibold">FREE</Badge>
                ) : (
                  <span className="font-medium">{formatPrice(shipping)}</span>
                )}
              </div>

              <Separator />

              {/* Savings Indicator */}
              {discount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 -mx-2">
                  <div className="flex items-center justify-between text-green-500">
                    <span className="text-sm font-medium ">You Saved</span>
                    <span className="text-lg font-bold ">{formatPrice(discount)}</span>
                  </div>
                </div>
              )}

              {/* Total Payable */}
              <div className="bg-primary/5 rounded-lg p-4 -mx-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payable</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{taxLabel}</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {summaryLoading ? '...' : formatPrice(total)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button 
                  onClick={() => onNext()} 
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                  disabled={!hasValidAddress}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Proceed to Payment
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onBack} 
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Address
                </Button>
              </div>

              {/* Reassurance */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <p>Your payment information is secure. You&apos;ll review payment details before being charged.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
