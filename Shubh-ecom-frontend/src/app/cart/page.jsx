//src/app/cart/page.jsx

"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import QuotationButton from '@/components/cart/QuotationButton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Minus, Plus, Trash2, ShoppingCart, Tag, Truck, Shield, ChevronRight, Package, Sparkles, Info, Check, X, Copy, Ticket, Star, Box, ShieldCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Badge } from '@/components/ui/badge';
import { getProductTypeLabel, isOemProduct } from '@/utils/productType';
import { getProducts } from '@/services/productService';
import { ProductCard } from '@/components/product/ProductCard';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getDisplayPrice, formatPrice } from '@/services/pricingService';
import { resolveProductImages } from '@/utils/media';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import * as cartService from '@/services/cartService';
import { getPublicCoupons } from '@/services/couponService';
import { getTaxSuffix, formatTaxBreakdown } from '@/services/taxDisplayService';

const Cart = () => {
  const [couponCode, setCouponCode] = useState('');
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(null);
  /* ... */
  const { items, removeFromCart, updateQuantity, addToCart, cartSource, loading, initializationLoading, subtotal: contextSubtotal } = useCart();
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const { user, isAuthenticated, accessToken } = useAuth();
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  /* ... fetchSummary ... */
  const fetchSummary = useCallback(async () => {
    if (!items.length) {
      setSummary(null);
      return;
    }

    setSummaryLoading(true);
    try {
      if (cartSource === 'backend' && isAuthenticated && accessToken) {
        const data = await cartService.getCartSummary(accessToken);
        setSummary(data);
      } else {
        // Safe mapping for guest items
        const guestItems = items
          .map((item) => ({
            productId: item.product?._id || item.product?.id || item.productId || null,
            quantity: item.quantity,
          }))
          .filter(item => item.productId); // Filter out items with no valid ID

        if (guestItems.length > 0) {
          const data = await cartService.getGuestCartSummary({ items: guestItems });
          setSummary(data);
        } else {
          setSummary(null);
        }
      }
    } catch (error) {
      console.error('[CART] Failed to fetch summary', error);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [items, cartSource, isAuthenticated, accessToken]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const loadCoupons = async () => {
      try {
        const list = await getPublicCoupons();
        setAvailableCoupons(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error('[CART] Failed to load coupons', error);
        setAvailableCoupons([]);
      }
    };
    loadCoupons();
  }, []);

  /* ... constants ... */
  const summarySubtotal = summary?.subtotal ?? contextSubtotal;
  const summaryDiscount = summary?.discountAmount ?? 0;
  const summaryTax = summary?.taxAmount ?? 0;
  const summaryTotal = summary?.grandTotal ?? contextSubtotal;
  const cartTaxDisplay = summary?.settings?.taxPriceDisplayCart || 'including';
  const cartTaxLabel = getTaxSuffix(cartTaxDisplay);

  const formatCouponValue = (coupon) =>
    coupon?.discountType === 'percent'
      ? `${coupon.discountValue}% OFF`
      : `${formatPrice(coupon.discountValue || 0)} OFF`;

  /* ... handlers ... */
  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();

    if (!code) {
      toast.error('Please enter a coupon code');
      return;
    }

    if (!isAuthenticated || !accessToken || cartSource !== 'backend') {
      toast.error('Please login to apply coupons');
      return;
    }

    try {
      await cartService.applyCoupon(accessToken, code);
      setCouponCode('');
      await fetchSummary();
      toast.success(`Coupon "${code}" applied!`);
    } catch (error) {
      toast.error(error.message || 'Failed to apply coupon');
    }
  };

  const handleRemoveCoupon = async () => {
    if (!summary?.couponCode) return;
    if (!isAuthenticated || !accessToken || cartSource !== 'backend') return;

    try {
      await cartService.removeCoupon(accessToken);
      setCouponCode('');
      await fetchSummary();
      toast.success(`Coupon "${summary.couponCode}" removed`);
    } catch (error) {
      toast.error(error.message || 'Failed to remove coupon');
    }
  };

  const handleApplyCouponFromDialog = async (coupon) => {
    if (!isAuthenticated || !accessToken || cartSource !== 'backend') {
      toast.error('Please login to apply coupons');
      setCouponDialogOpen(false);
      return;
    }

    try {
      await cartService.applyCoupon(accessToken, coupon.code);
      setCouponDialogOpen(false);
      await fetchSummary();
      toast.success(`Coupon "${coupon.code}" applied!`);
    } catch (error) {
      toast.error(error.message || 'Failed to apply coupon');
    }
  };

  const handleCopyCouponCode = async (code) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
        setCopiedCoupon(code);
        setTimeout(() => setCopiedCoupon(null), 2000);
        toast.success('Coupon code copied!', {
          description: `${code} copied to clipboard`
        });
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setCopiedCoupon(code);
          setTimeout(() => setCopiedCoupon(null), 2000);
          toast.success('Coupon code copied!', {
            description: `${code} copied to clipboard`
          });
        } catch (err) {
          document.body.removeChild(textArea);
          throw err;
        }
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy coupon code', {
        description: 'Please try selecting and copying manually'
      });
    }
  };

  useEffect(() => {
    const loadSuggestions = async () => {
      const cartProductIds = items.map(item => item.product._id || item.product.id);
      const allProducts = await getProducts({ limit: 20 });
      const suggestions = allProducts
        .filter(p => !cartProductIds.includes(p._id || p.id))
        .slice(0, 4);
      setSuggestedProducts(suggestions);
    };
    loadSuggestions();
  }, [items]);

  const CartSkeleton = () => (
    <Layout>
      <div className="bg-slate-50 border-b border-slate-200 mt-4">
        <div className="container mx-auto px-4 py-6">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[280px_1fr_380px] gap-8">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-xl border border-slate-100 p-4 h-[300px] animate-pulse">
              <div className="h-5 w-32 bg-slate-200 rounded mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-2">
                    <div className="w-16 h-16 bg-slate-100 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-full bg-slate-100 rounded"></div>
                      <div className="h-3 w-1/2 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Items Skeleton */}
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-28 h-28 bg-slate-100 rounded-lg"></div>
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between">
                      <div className="h-5 w-2/3 bg-slate-200 rounded"></div>
                      <div className="w-8 h-8 rounded bg-slate-100"></div>
                    </div>
                    <div className="h-4 w-1/3 bg-slate-100 rounded"></div>
                    <div className="flex justify-between items-end mt-4">
                      <div className="h-6 w-24 bg-slate-200 rounded"></div>
                      <div className="h-10 w-28 bg-slate-100 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse space-y-4">
              <div className="h-5 w-32 bg-slate-200 rounded mb-4"></div>
              <div className="h-8 w-full bg-slate-100 rounded"></div>
              <div className="space-y-3 pt-2">
                <div className="flex justify-between"><div className="h-4 w-20 bg-slate-100 rounded"></div><div className="h-4 w-16 bg-slate-100 rounded"></div></div>
                <div className="flex justify-between"><div className="h-4 w-20 bg-slate-100 rounded"></div><div className="h-4 w-16 bg-slate-100 rounded"></div></div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between"><div className="h-6 w-16 bg-slate-200 rounded"></div><div className="h-6 w-24 bg-slate-200 rounded"></div></div>
                </div>
              </div>
              <div className="h-12 w-full bg-slate-200 rounded-lg mt-4"></div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );

  if (loading || initializationLoading) {
    return <CartSkeleton />;
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 bg-secondary rounded-2xl flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">
              Looks like you haven&apos;t added any parts yet. Start browsing our catalog to find the perfect parts for your vehicle.
            </p>
            <Link href="/">
              <Button size="lg" className="rounded-lg">
                Start Shopping
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-secondary/30 border-b border-border/50 mt-4">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Shopping Cart
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid lg:grid-cols-[280px_1fr_380px] gap-6 lg:gap-8">
          {/* Left Sidebar - Suggested Products */}
          <div className="hidden lg:block">
            <div className="sticky top-4">
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">You May Like</h3>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                  {suggestedProducts.slice(0, 6).map((product, index) => {
                    const displayPrice = getDisplayPrice(product, user);
                    return (
                      <div key={product._id || product.id || index} className="group p-2 hover:bg-secondary/50 rounded-lg transition-colors">
                        <Link href={`/product/${product.slug}`} className="flex gap-2">
                          <img
                            src={resolveProductImages(product.images || [])[0]}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded bg-secondary shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors mb-1">
                              {product.name}
                            </p>
                            <p className="text-sm font-semibold text-primary">
                              {formatPrice(displayPrice.price)}
                            </p>
                          </div>
                        </Link>
                        <Button
                          size="sm"
                          className="w-40 mt-2 h-8 text-xs "
                          onClick={(e) => {
                            e.preventDefault();
                            addToCart(product);
                          }}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Cart Items - Middle Column */}
          <div className="space-y-4">
            {items.map((item, index) => {
              const pricing = getDisplayPrice(item.product, user);
              const { price: unitPrice, originalPrice, savingsPercent, type } = pricing;
              const product = item.product;

              return (
                <div key={item.id} className="bg-card rounded-xl border border-border/50 p-3 md:p-4 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex gap-4">
                    {/* Image Container with Badges */}
                    <Link href={`/product/${product.slug}`} className="w-24 h-24 md:w-32 md:h-32 bg-secondary rounded-lg overflow-hidden shrink-0 group relative block">
                      <img
                        src={resolveProductImages(product.images || [])[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Badges Overlay */}
                      <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1">
                        <Badge
                          variant={isOemProduct(product.productType) ? 'default' : 'secondary'}
                          className="text-[10px] font-medium px-1.5 py-0.5 shadow-sm h-auto"
                        >
                          {isOemProduct(product.productType) ? (
                            <><ShieldCheck className="w-3 h-3 mr-1" />{getProductTypeLabel(product.productType)}</>
                          ) : (
                            getProductTypeLabel(product.productType)
                          )}
                        </Badge>

                        {savingsPercent && (
                          <span className="bg-destructive text-destructive-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm w-fit">
                            -{savingsPercent}%
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Info Column */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/product/${product.slug}`} className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 text-sm md:text-base mb-1">
                              {product.name}
                            </Link>

                            {/* Vehicle Brand / Brand - Value Only */}
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              {product.productType === 'OEM'
                                ? (product.vehicleBrand || 'N/A')
                                : (product.manufacturerBrand || 'N/A')}
                            </p>

                            {/* Tags Row: Rating, Stock, Type */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {/* Rating */}
                              <div className="flex items-center gap-1 bg-secondary rounded px-1.5 py-0.5">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span className="text-xs font-bold text-foreground">
                                  {Number(product.ratingAvg || 0).toFixed(1)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  ({product.ratingCount || 0} reviews)
                                </span>
                              </div>

                              {/* Stock Status */}
                              {(product.stockQty || 0) > 0 ? (
                                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                                  {(product.stockQty || 0) < 5 ? `Only ${product.stockQty} left` : 'In Stock'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/50">
                                  Out of Stock
                                </span>
                              )}

                              {/* Wholesale Badge */}
                              {type === 'wholesale' && (
                                <Badge variant="default" className="text-[10px] bg-blue-600 px-1.5 py-0.5 h-auto rounded-sm hover:bg-blue-700">
                                  Wholesale
                                </Badge>
                              )}
                            </div>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0" aria-label="Remove item">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Price and Quantity Control Row */}
                      <div className="flex items-end justify-between mt">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base md:text-lg font-bold text-primary">
                              {formatPrice((unitPrice || 0) * item.quantity)}
                            </span>
                            {originalPrice && (
                              <span className="text-xs text-muted-foreground line-through decoration-slate-400/50">
                                {formatPrice((originalPrice || 0) * item.quantity)}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatPrice(unitPrice || 0)} each
                            {summary && (
                              <span className="ml-1 text-success">({cartTaxLabel})</span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center bg-secondary/50 rounded-lg border border-border/50">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2.5 hover:bg-secondary rounded-l-lg transition-colors disabled:opacity-50" disabled={item.quantity <= 1}>
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2.5 hover:bg-secondary rounded-r-lg transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="pt-2">
              <Link href="/categories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" />Continue Shopping
              </Link>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden sticky top-20">
              <div className="bg-secondary/30 px-5 py-4 border-b border-border/50"><h3 className="font-semibold text-foreground">Order Summary</h3></div>
              <div className="p-5 space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    {summary?.couponCode ? 'Coupon Applied' : 'Have a Coupon?'}
                  </label>

                  {summary?.couponCode ? (
                    // Applied coupon state
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-green-50  border border-green-400 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-400" />
                          <div>
                            <p className="font-semibold text-sm text-green-400 ">{summary.couponCode}</p>
                            <p className="text-xs text-green-400">
                              You save {formatPrice(summaryDiscount)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                          onClick={handleRemoveCoupon}
                        >
                          <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </Button>
                      </div>

                      {/* View Available link even when applied */}
                      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="link" className="h-auto p-0 text-xs text-primary hover:underline">
                            View other available coupons
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] border-border">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Ticket className="w-5 h-5 text-primary" />
                              Available Coupons
                            </DialogTitle>
                            <DialogDescription>
                              Choose a coupon to apply to your order
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {availableCoupons.map((coupon) => (
                              <div
                                key={coupon.code}
                                className={`p-4 rounded-lg border-2 transition-all ${summary?.couponCode === coupon.code
                                  ? 'border-dashed border-green-400 bg-green-50'
                                  : 'border-border hover:border-primary/50'
                                  }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Tag className="w-4 h-4 text-primary" />
                                      <h4 className="font-bold text-foreground">{coupon.code}</h4>
                                      {summary?.couponCode === coupon.code && (
                                        <Check className="w-4 h-4 text-green-600" />
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {coupon.minOrderAmount
                                        ? `Min order ${formatPrice(coupon.minOrderAmount)}`
                                        : 'No minimum order'}
                                    </p>
                                    <p className="text-xs text-primary font-semibold">
                                      {formatCouponValue(coupon)}
                                    </p>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    {summary?.couponCode === coupon.code ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        disabled
                                      >
                                        Applied
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => handleApplyCouponFromDialog(coupon)}
                                      >
                                        Apply
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs"
                                      onClick={() => handleCopyCouponCode(coupon.code)}
                                    >
                                      {copiedCoupon === coupon.code ? (
                                        <>
                                          <Check className="w-3 h-3 mr-1 text-green-600" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 mr-1" />
                                          Copy
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : (
                    // Input state
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          className="flex-1 h-8 bg-secondary/50 border-0 rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20"
                        />
                        <Button
                          onClick={handleApplyCoupon}
                          className="h-8 px-6"
                          disabled={!couponCode.trim()}
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          Apply
                        </Button>
                      </div>

                      {/* View Available link */}
                      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="link" className="h-auto p-0 text-xs text-primary hover:underline">
                            View available coupons
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] border-border">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Ticket className="w-5 h-5 text-primary" />
                              Available Coupons
                            </DialogTitle>
                            <DialogDescription>
                              Choose a coupon to apply to your order
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {availableCoupons.map((coupon) => (
                              <div
                                key={coupon.code}
                                className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-all"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Tag className="w-4 h-4 text-primary" />
                                      <h4 className="font-bold text-foreground">{coupon.code}</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {coupon.minOrderAmount
                                        ? `Min order ${formatPrice(coupon.minOrderAmount)}`
                                        : 'No minimum order'}
                                    </p>
                                    <p className="text-xs text-primary font-semibold">
                                      {formatCouponValue(coupon)}
                                    </p>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <Button
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => handleApplyCouponFromDialog(coupon)}
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs"
                                      onClick={() => handleCopyCouponCode(coupon.code)}
                                    >
                                      {copiedCoupon === coupon.code ? (
                                        <>
                                          <Check className="w-3 h-3 mr-1 text-green-600" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 mr-1" />
                                          Copy
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (excl. tax)</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(summary?.taxableAmount || summarySubtotal)}
                    </span>
                  </div>
                  {summaryDiscount > 0 && (
                    <div className="flex justify-between text-sm animate-fade-in">
                      <span className="text-success flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Coupon Discount</span>
                      <span className="font-medium text-success">-{formatPrice(summaryDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Tax
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1">
                            {formatTaxBreakdown(summary?.taxBreakdown).map((component) => (
                              <p key={component.key} className="uppercase">{component.label}: {component.formatted}</p>
                            ))}
                            {formatTaxBreakdown(summary?.taxBreakdown).length === 0 && <p>Calculated per tax settings</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <span className="font-medium text-foreground">
                      {formatPrice(summaryTax)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-foreground">
                      {summary?.shippingFee === 0 ? 'Free' : formatPrice(summary?.shippingFee || 0)}
                    </span>
                  </div>
                  <div className="border-t border-border/50 pt-3">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-foreground">Total</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-foreground">
                          {formatPrice(summaryTotal)}
                        </span>
                        {summaryDiscount > 0 && (
                          <p className="text-xs text-success">You save {formatPrice(summaryDiscount)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <Link href="/checkout">
                  <Button className="w-full h-12 rounded-lg text-base font-semibold mb-3" size="lg">Proceed to Checkout</Button>
                </Link>
                <div className="w-full flex justify-center mb-4">
                    <QuotationButton 
                        cartItems={items} 
                        summary={summary} 
                        profile={user} 
                    />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Truck className="w-4 h-4 text-primary shrink-0" /><span>Free Delivery</span></div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Shield className="w-4 h-4 text-primary shrink-0" /><span>Secure Payment</span></div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground col-span-2"><Package className="w-4 h-4 text-primary shrink-0" /><span>Delivery in 3-5 business days</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 md:mt-14">
          <div className="flex items-center gap-2 mb-6"><Sparkles className="w-5 h-5 text-primary" /><h2 className="text-xl md:text-2xl font-bold text-foreground">Related Products</h2></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {suggestedProducts.map((product, index) => (
              <div key={product._id || product.id} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
