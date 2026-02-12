//src/components/checkout/AddressStep.jsx

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { MapPin, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import * as addressService from '@/services/userAddressService';
import { toast } from 'sonner';

/**
 * AddressStep - Backend Integration
 * 
 * - Fetches user addresses from backend
 * - Allows selecting existing address
 * - Allows creating new address
 * - Returns addressId to parent (not full object)
 */
export function AddressStep({ onNext, initialAddressId }) {
  const { accessToken } = useAuth();
  
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(initialAddressId || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',
  });
  const [errors, setErrors] = useState({});

  // Fetch addresses from backend
  useEffect(() => {
    const fetchAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const data = await addressService.getAddresses(accessToken);
        setAddresses(data);
        
        // Auto-select default shipping address
        const defaultAddr = data.find(addr => addr.isDefaultShipping);
        if (defaultAddr && !initialAddressId) {
          setSelectedAddressId(defaultAddr._id);
        } else if (data.length === 1) {
          setSelectedAddressId(data[0]._id);
        }
        
        console.log('[ADDRESS_STEP] Loaded', data.length, 'addresses');
      } catch (error) {
        console.error('[ADDRESS_STEP] Failed to fetch addresses:', error);
        toast.error('Failed to load addresses');
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [accessToken, initialAddressId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.line1.trim()) newErrors.line1 = 'Address line 1 is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.postalCode.trim()) newErrors.postalCode = 'Postal code is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAddress = async () => {
    if (!validateForm()) return;

    setSavingAddress(true);
    try {
      const newAddress = await addressService.createAddress(formData, accessToken);
      
      toast.success('Address saved successfully');
      console.log('[ADDRESS_STEP] Created new address:', newAddress._id);
      
      // Add to addresses list and select it
      setAddresses(prev => [...prev, newAddress]);
      setSelectedAddressId(newAddress._id);
      setIsCreatingNew(false);
      
      // Reset form
      setFormData({
        fullName: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'IN',
      });
    } catch (error) {
      console.error('[ADDRESS_STEP] Failed to create address:', error);
      toast.error(error.message || 'Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleNext = () => {
    if (!selectedAddressId) {
      toast.error('Please select or create an address');
      return;
    }
    
    // Pass addressId to parent (checkout page)
    console.log('[ADDRESS_STEP] Proceeding with addressId:', selectedAddressId);
    onNext(selectedAddressId);
  };

  const selectedAddress = addresses.find(addr => addr._id === selectedAddressId);

  if (loadingAddresses) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <Card className="p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <Card className="p-4 md:p-6 border-zinc-200">
        <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Shipping Address
        </h2>

        {!isCreatingNew && addresses.length > 0 && (
          <div className="space-y-4">
            <Label>Select Address</Label>
            <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId}>
              {addresses.map(addr => (
                <div key={addr._id || addr.id} className="border-zinc-200 flex items-start space-x-2 p-3 border rounded-lg hover:bg-secondary/30 transition-colors">
                  <RadioGroupItem value={addr._id || addr.id} id={addr._id || addr.id} className="mt-1" />
                  <label htmlFor={addr._id || addr.id} className="flex-1 cursor-pointer">
                    <p className="font-medium">{addr.fullName}</p>
                    <p className="text-sm text-muted-foreground">{addr.phone}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {addr.city}, {addr.state} - {addr.postalCode}
                    </p>
                    {addr.isDefaultShipping && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-1 inline-block">
                        Default
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </RadioGroup>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreatingNew(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Address
            </Button>
          </div>
        )}

        {(isCreatingNew || addresses.length === 0) && (
          <div className="space-y-4">
            {addresses.length === 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                You don&apos;t have any saved addresses. Please add one.
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                />
                {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 98765 43210"
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="line1">Address Line 1 *</Label>
              <Input
                id="line1"
                name="line1"
                value={formData.line1}
                onChange={handleInputChange}
                placeholder="Street address"
              />
              {errors.line1 && <p className="text-xs text-destructive mt-1">{errors.line1}</p>}
            </div>

            <div>
              <Label htmlFor="line2">Address Line 2</Label>
              <Input
                id="line2"
                name="line2"
                value={formData.line2}
                onChange={handleInputChange}
                placeholder="Apartment, suite, etc. (optional)"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Mumbai"
                />
                {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="Maharashtra"
                />
                {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder="400001"
                />
                {errors.postalCode && <p className="text-xs text-destructive mt-1">{errors.postalCode}</p>}
              </div>
            </div>

            <div className="flex gap-2">
              {isCreatingNew && addresses.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setErrors({});
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                onClick={handleCreateAddress}
                disabled={savingAddress}
                className="flex-1"
              >
                {savingAddress ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Address'
                )}
              </Button>
            </div>
          </div>
        )}

        {!isCreatingNew && (
          <div className="flex flex-col-reverse md:flex-row justify-between mt-6 gap-3">
            <Link href="/cart" className="w-full md:w-auto">
              <Button variant="outline" className="w-full" type="button">
                Back to Cart
              </Button>
            </Link>
            <Button
              onClick={handleNext}
              size="lg"
              className="w-full md:w-auto"
              disabled={!selectedAddressId}
            >
              Continue to Review
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
