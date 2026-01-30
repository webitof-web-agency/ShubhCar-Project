'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Row, Badge, Form, Button, InputGroup, Modal, Alert, ListGroup, FloatingLabel, Placeholder } from 'react-bootstrap';
import StatusFilterTabs from './StatusFilterTabs';
import { orderAPI, getStatusBadge, getPaymentStatusBadge } from '@/helpers/orderApi';
import { productAPI } from '@/helpers/productApi';
import { userAPI } from '@/helpers/userApi';
import { userAddressAPI } from '@/helpers/userAddressApi';
import { couponAPI } from '@/helpers/couponApi';
import clsx from 'clsx';
import { currency } from '@/context/constants';
import { INDIA_COUNTRY, INDIA_STATES, getIndiaStateName, normalizeIndiaStateCode } from '@/helpers/indiaRegions';

const OrdersList = ({ initialShowCreate = false, hideList = false } = {}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(!hideList);
  const [activeStatus, setActiveStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const emptyAddress = {
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: INDIA_COUNTRY.code,
  };
  const emptyItem = {
    productSearch: '',
    productOptions: [],
    productId: '',
    productName: '',
    productPrice: 0,
    quantity: 1,
  };
  const emptyForm = {
    userId: '',
    customer: null,
    paymentMethod: 'cod',
    billingSameAsShipping: true,
    couponCode: '',
    manualDiscount: '',
    taxPercent: '18',
    shippingFee: '',
    shippingAddressId: '',
    billingAddressId: '',
    shippingAddress: { ...emptyAddress },
    billingAddress: { ...emptyAddress },
    items: [{ ...emptyItem }],
  };

  // Filter states
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(initialShowCreate && !hideList);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createError, setCreateError] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [hoveredOrderId, setHoveredOrderId] = useState(null);
  const [statusCounts, setStatusCounts] = useState({ all: 0 });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [couponState, setCouponState] = useState({ loading: false, error: '', discount: 0 });
  const [newCustomerForm, setNewCustomerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const customerSearchTimer = useRef(null);
  const productSearchTimers = useRef({});

  const getItemUnitPrice = (item) => {
    return Number(item.productPrice || 0);
  };

  const calculateSubtotal = (items) =>
    items.reduce((sum, item) => sum + getItemUnitPrice(item) * Number(item.quantity || 0), 0);

  const subtotal = calculateSubtotal(createForm.items);
  const isListLoading = loading && !hideList;

  useEffect(() => {
    if (hideList) return;
    if (session?.accessToken) {
      fetchOrders();
    }
  }, [activeStatus, currentPage, searchQuery, dateFilter, customerTypeFilter, productTypeFilter, session, hideList]);

  useEffect(() => {
    if (hideList) return;
    const statusParam = searchParams?.get('status') || '';
    if (!statusParam) return;
    if (statusParam !== activeStatus) {
      setActiveStatus(statusParam);
      setCurrentPage(1);
    }
  }, [searchParams, hideList]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchTerm.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (hideList) return;
    if (!session?.accessToken) return;
    const fetchCounts = async () => {
      try {
        const response = await orderAPI.getStatusCounts(session.accessToken);
        setStatusCounts(response?.data || { all: 0 });
      } catch (error) {
        console.error('Failed to fetch status counts:', error);
      }
    };
    fetchCounts();
  }, [session, hideList]);

  useEffect(() => {
    if (!createForm.couponCode) {
      setCouponState({ loading: false, error: '', discount: 0 });
      return;
    }
    if (!createForm.userId || subtotal <= 0 || !session?.accessToken) {
      setCouponState({ loading: false, error: '', discount: 0 });
      return;
    }
    const timer = setTimeout(async () => {
      setCouponState({ loading: true, error: '', discount: 0 });
      try {
        const response = await couponAPI.preview(
          {
            userId: createForm.userId,
            code: createForm.couponCode.trim(),
            orderSubtotal: subtotal,
          },
          session.accessToken
        );
        const discountAmount = response.data?.discountAmount || 0;
        setCouponState({ loading: false, error: '', discount: discountAmount });
      } catch (error) {
        setCouponState({
          loading: false,
          error: error.message || 'Invalid coupon',
          discount: 0,
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [createForm.couponCode, createForm.userId, subtotal, session]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeStatus && activeStatus !== 'all') {
        params.status = activeStatus;
      }
      params.page = currentPage;
      params.limit = 10;
      params.summary = true;
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (dateFilter && dateFilter !== 'all') {
        const now = new Date();
        let fromDate = null;
        let toDate = new Date(now);
        if (dateFilter === 'today') {
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          const end = new Date(now);
          end.setHours(23, 59, 59, 999);
          fromDate = start;
          toDate = end;
        } else if (dateFilter === 'yesterday') {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          fromDate = new Date(y.setHours(0, 0, 0, 0));
          toDate = new Date(y.setHours(23, 59, 59, 999));
        } else if (dateFilter === 'last7') {
          fromDate = new Date(now);
          fromDate.setDate(fromDate.getDate() - 7);
        } else if (dateFilter === 'last30') {
          fromDate = new Date(now);
          fromDate.setDate(fromDate.getDate() - 30);
        } else if (dateFilter === 'last6m') {
          fromDate = new Date(now);
          fromDate.setMonth(fromDate.getMonth() - 6);
        } else if (dateFilter === 'last1y') {
          fromDate = new Date(now);
          fromDate.setFullYear(fromDate.getFullYear() - 1);
        }
        if (fromDate) {
          params.from = fromDate.toISOString();
          params.to = toDate.toISOString();
        }
      }
      if (customerTypeFilter && customerTypeFilter !== 'all') {
        params.customerType = customerTypeFilter;
      }
      if (productTypeFilter && productTypeFilter !== 'all') {
        params.productType = productTypeFilter;
      }

      const token = session?.accessToken;
      if (!token) {
        console.error('No authentication token available');
        setOrdersData([]);
        setLoading(false);
        return;
      }

      const response = await orderAPI.list(params, token);
      const payload = response?.data || [];
      if (Array.isArray(payload)) {
        setOrdersData(payload);
        setTotalCount(payload.length);
        setTotalPages(1);
      } else {
        setOrdersData(payload.items || []);
        setTotalCount(payload.total || 0);
        setTotalPages(payload.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrdersData([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    setCurrentPage(1);
  };

  const handleRowClick = (orderId) => {
    router.push(`/orders/order-detail?id=${orderId}`);
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(ordersData.map(o => o._id));
    } else {
      setSelectedOrders([]);
    }
  };

  const toggleSelectOrder = (e, orderId) => {
    e.stopPropagation(); // Prevent row click
    if (e.target.checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const updateAddressField = (section, field, value) => {
    setCreateForm(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
      ...(section === 'shippingAddress' && prev.billingSameAsShipping
        ? {
          billingAddress: {
            ...prev.billingAddress,
            [field]: value,
          },
        }
        : {}),
    }));
  };

  const updateItemField = (index, field, value) => {
    setCreateForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItemRow = () => {
    setCreateForm(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  };

  const removeItemRow = (index) => {
    setCreateForm(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const normalizeAddress = (address) => ({
    fullName: address.fullName.trim(),
    phone: address.phone.trim(),
    line1: address.line1.trim(),
    line2: address.line2 ? address.line2.trim() : '',
    city: address.city.trim(),
    state: normalizeIndiaStateCode(address.state),
    postalCode: address.postalCode.trim(),
    country: INDIA_COUNTRY.code,
  });

  const requiredLabel = (text) => (
    <span>
      {text} <span className="text-danger">*</span>
    </span>
  );

  const applyAddressToForm = (address, type) => {
    if (!address) return;
    setCreateForm(prev => ({
      ...prev,
      [`${type}AddressId`]: address._id || '',
      [`${type}Address`]: {
        fullName: address.fullName || '',
        phone: address.phone || '',
        line1: address.line1 || '',
        line2: address.line2 || '',
        city: address.city || '',
        state: normalizeIndiaStateCode(address.state || ''),
        postalCode: address.postalCode || '',
        country: INDIA_COUNTRY.code,
      },
    }));
  };

  const formatAddressOption = (address) => {
    const parts = [
      address.line1,
      address.city,
      getIndiaStateName(address.state),
      address.postalCode,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleSelectAddress = (type, addressId) => {
    const address = customerAddresses.find((addr) => addr._id === addressId);
    if (address) {
      applyAddressToForm(address, type);
      if (type === 'shipping' && createForm.billingSameAsShipping) {
        applyAddressToForm(address, 'billing');
      }
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setCreateError('');

    const token = session?.accessToken;
    if (!token) {
      setCreateError('No authentication token available');
      return;
    }

    if (!createForm.userId.trim()) {
      setCreateError('Customer is required');
      return;
    }

    if (createForm.items.some(item => !item.productId)) {
      setCreateError('Each item needs a product');
      return;
    }

    if (createForm.items.some(item => Number(item.quantity) < 1)) {
      setCreateError('Item quantities must be at least 1');
      return;
    }

    setCreateSaving(true);
    try {
      const payload = {
        userId: createForm.userId.trim(),
        paymentMethod: createForm.paymentMethod,
        billingSameAsShipping: createForm.billingSameAsShipping,
        couponCode: createForm.couponCode ? createForm.couponCode.trim() : undefined,
        manualDiscount: createForm.manualDiscount ? Number(createForm.manualDiscount) : 0,
        taxPercent: createForm.taxPercent ? Number(createForm.taxPercent) : undefined,
        shippingFee: createForm.shippingFee ? Number(createForm.shippingFee) : undefined,
        shippingAddressId: createForm.shippingAddressId || undefined,
        billingAddressId: createForm.billingAddressId || undefined,
        shippingAddress: normalizeAddress(createForm.shippingAddress),
        items: createForm.items.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      };

      if (!createForm.billingSameAsShipping) {
        payload.billingAddress = normalizeAddress(createForm.billingAddress);
      }

      await orderAPI.createManual(payload, token);
      if (hideList) {
        router.push('/orders/orders-list');
        return;
      }
      setShowCreateModal(false);
      setCreateForm(emptyForm);
      setCustomerSearch('');
      setCustomerResults([]);
      setCustomerAddresses([]);
      setCouponState({ loading: false, error: '', discount: 0 });
      fetchOrders();
    } catch (error) {
      setCreateError(error.message || 'Failed to create order');
    } finally {
      setCreateSaving(false);
    }
  };

  const searchCustomers = (term) => {
    if (!session?.accessToken) return;
    if (customerSearchTimer.current) {
      clearTimeout(customerSearchTimer.current);
    }
    customerSearchTimer.current = setTimeout(async () => {
      if (!term || term.trim().length < 2) {
        setCustomerResults([]);
        return;
      }
      setCustomerLoading(true);
      try {
        const response = await userAPI.adminList(
          { search: term.trim(), role: 'customer', limit: 8, page: 1 },
          session.accessToken
        );
        const data = response.data || [];
        setCustomerResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to search customers:', error);
        setCustomerResults([]);
      } finally {
        setCustomerLoading(false);
      }
    }, 300);
  };

  const handleSelectCustomer = (customer) => {
    setCreateForm(prev => ({
      ...prev,
      userId: customer._id,
      customer,
    }));
    setCustomerSearch(`${customer.firstName || ''} ${customer.lastName || ''}`.trim());
    setCustomerResults([]);
    if (!session?.accessToken) return;
    userAddressAPI
      .adminListByUser(customer._id, session.accessToken)
      .then((response) => {
        const data = response.data || [];
        setCustomerAddresses(Array.isArray(data) ? data : []);
        const defaultShipping = data.find((addr) => addr.isDefaultShipping) || data[0];
        const defaultBilling = data.find((addr) => addr.isDefaultBilling) || defaultShipping;
        if (defaultShipping) {
          applyAddressToForm(defaultShipping, 'shipping');
        }
        if (defaultBilling) {
          applyAddressToForm(defaultBilling, 'billing');
        }
        if (defaultShipping && defaultBilling && defaultShipping._id === defaultBilling._id) {
          setCreateForm(prev => ({ ...prev, billingSameAsShipping: true }));
        }
      })
      .catch((error) => {
        console.error('Failed to load addresses:', error);
        setCustomerAddresses([]);
      });
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.firstName.trim()) {
      setCreateError('Customer first name is required');
      return;
    }
    if (!newCustomerForm.email.trim() && !newCustomerForm.phone.trim()) {
      setCreateError('Customer email or phone is required');
      return;
    }
    if (!newCustomerForm.password.trim()) {
      setCreateError('Customer password is required');
      return;
    }
    try {
      const payload = {
        firstName: newCustomerForm.firstName.trim(),
        lastName: newCustomerForm.lastName.trim(),
        email: newCustomerForm.email.trim() || undefined,
        phone: newCustomerForm.phone.trim() || undefined,
        password: newCustomerForm.password,
        role: 'customer',
      };
      const response = await userAPI.register(payload);
      const created = response.data;
      if (created?._id) {
        handleSelectCustomer(created);
        setShowCustomerModal(false);
        setNewCustomerForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
        });
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      setCreateError(error.message || 'Failed to create customer');
    }
  };

  const searchProducts = (index, term) => {
    if (!session?.accessToken) return;
    updateItemField(index, 'productSearch', term);
    if (productSearchTimers.current[index]) {
      clearTimeout(productSearchTimers.current[index]);
    }
    productSearchTimers.current[index] = setTimeout(async () => {
      if (!term || term.trim().length < 2) {
        updateItemField(index, 'productOptions', []);
        return;
      }
      try {
        const response = await productAPI.list({ search: term.trim(), limit: 8 }, session.accessToken);
        const data = response.data?.items || [];
        updateItemField(index, 'productOptions', Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to search products:', error);
        updateItemField(index, 'productOptions', []);
      }
    }, 300);
  };

  const handleSelectProduct = async (index, product) => {
    const fallbackProductPrice = Number(
      product?.retailPrice?.salePrice ??
      product?.retailPrice?.mrp ??
      product?.price?.salePrice ??
      product?.price?.mrp ??
      product?.discountPrice ??
      product?.price ??
      0
    );
    updateItemField(index, 'productId', product._id);
    updateItemField(index, 'productName', product.name);
    updateItemField(index, 'productOptions', []);
    updateItemField(index, 'productSearch', product.name || '');
    updateItemField(index, 'productPrice', fallbackProductPrice);
  };

  const handleCustomerClick = (e, customerId) => {
    e.stopPropagation();
    if (!customerId) return;
    router.push(`/customer/customer-detail?id=${customerId}`);
  };

  const handleViewInvoice = async (orderId) => {
    try {
      const token = session?.accessToken;
      if (!token) return;
      const blob = await orderAPI.getInvoicePdfByOrder(orderId, token, false);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to load invoice:', error);
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      const token = session?.accessToken;
      if (!token) return;
      const blob = await orderAPI.getInvoicePdfByOrder(orderId, token, true);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  const handlePrintInvoice = async (orderId) => {
    try {
      const token = session?.accessToken;
      if (!token) return;
      const blob = await orderAPI.getInvoicePdfByOrder(orderId, token, false);
      const url = URL.createObjectURL(blob);
      const popup = window.open(url, '_blank');
      if (!popup) return;
      popup.focus();
      popup.print();
    } catch (error) {
      console.error('Failed to print invoice:', error);
    }
  };

  const manualDiscount = Math.max(0, Number(createForm.manualDiscount || 0));
  const couponDiscount = couponState.discount || 0;
  const cappedManualDiscount = Math.min(manualDiscount, Math.max(0, subtotal - couponDiscount));
  const totalDiscount = couponDiscount + cappedManualDiscount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxPercent = Number(createForm.taxPercent || 0);
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const hasShippingOverride = createForm.shippingFee !== '' && createForm.shippingFee !== null;
  const shippingFee = hasShippingOverride ? Number(createForm.shippingFee || 0) : 0;
  const grandTotal = taxableAmount + taxAmount + shippingFee;
  const gstOptions = [0, 5, 12, 18, 28];
  const createFormContent = (
    <>
      {createError && (
        <Alert variant="danger" className="py-2">
          {createError}
        </Alert>
      )}

      <Row className="g-3">
        <Col xl={8}>
          <Row className="g-2">
            <Col md={8}>
              <InputGroup>
                <FloatingLabel controlId="manual-customer" label={requiredLabel('Customer')}>
                  <Form.Control
                    value={customerSearch}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCustomerSearch(next);
                      setCreateForm(prev => ({ ...prev, userId: '', customer: null }));
                      searchCustomers(next);
                    }}
                    placeholder="Search customer"
                    required
                  />
                </FloatingLabel>
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowCustomerModal(true)}
                >
                  New
                </Button>
              </InputGroup>
              {customerResults.length > 0 && (
                <ListGroup className="border mt-2">
                  {customerResults.map((customer) => (
                    <ListGroup.Item
                      key={customer._id}
                      action
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <div className="fw-medium">
                        {(customer.firstName || '') + ' ' + (customer.lastName || '')}
                      </div>
                      <div className="text-muted small">
                        {customer.email || customer.phone || customer._id}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
              {customerLoading && <div className="text-muted small mt-2">Searching customers...</div>}
            </Col>
            <Col md={4}>
              <FloatingLabel controlId="manual-payment" label={requiredLabel('Payment Method')}>
                <Form.Select
                  value={createForm.paymentMethod}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  required
                >
                  <option value="cod">Cash on Delivery</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </Form.Select>
              </FloatingLabel>
            </Col>
          </Row>

          <Row className="g-2 mt-2">
            <Col md={4}>
              <FloatingLabel controlId="manual-coupon" label="Coupon Code">
                <Form.Control
                  value={createForm.couponCode}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, couponCode: e.target.value }))}
                  placeholder="Coupon Code"
                />
              </FloatingLabel>
              {couponState.loading && <div className="text-muted small mt-1">Checking coupon...</div>}
              {couponState.error && <div className="text-danger small mt-1">{couponState.error}</div>}
            </Col>
            <Col md={4}>
              <FloatingLabel controlId="manual-discount" label="Additional Discount">
                <Form.Control
                  type="number"
                  min="0"
                  value={createForm.manualDiscount}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, manualDiscount: e.target.value }))}
                  placeholder="0"
                />
              </FloatingLabel>
            </Col>
            <Col md={4}>
              <FloatingLabel controlId="manual-gst" label={requiredLabel('GST')}>
                <Form.Select
                  value={createForm.taxPercent}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, taxPercent: e.target.value }))}
                  required
                >
                  {gstOptions.map((rate) => (
                    <option key={rate} value={rate}>{`GST ${rate}%`}</option>
                  ))}
                </Form.Select>
              </FloatingLabel>
            </Col>
            <Col md={4}>
              <FloatingLabel controlId="manual-shipping-fee" label="Shipping Fee">
                <Form.Control
                  type="number"
                  min="0"
                  value={createForm.shippingFee}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, shippingFee: e.target.value }))}
                  placeholder="Auto"
                />
              </FloatingLabel>
            </Col>
          </Row>

          <div className="d-flex align-items-center justify-content-between mt-3 mb-2">
            <h6 className="text-uppercase text-muted fs-12 mb-0">Items</h6>
            <Button variant="outline-secondary" size="sm" onClick={addItemRow}>
              Add item
            </Button>
          </div>
          {createForm.items.map((item, index) => (
            <Row className="g-2 align-items-end mb-2" key={`item-${index}`}>
              <Col md={7}>
                <FloatingLabel controlId={`manual-product-${index}`} label={requiredLabel('Product')}>
                  <Form.Control
                    value={item.productSearch}
                    onChange={(e) => searchProducts(index, e.target.value)}
                    placeholder="Search product"
                    required
                  />
                </FloatingLabel>
                {item.productOptions.length > 0 && (
                  <ListGroup className="border mt-2">
                    {item.productOptions.map((product) => (
                      <ListGroup.Item
                        key={product._id}
                        action
                        onClick={() => handleSelectProduct(index, product)}
                      >
                        <div className="fw-medium">{product.name}</div>
                        <div className="text-muted small">{product.sku || product._id}</div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Col>
              <Col md={3}>
                <FloatingLabel controlId={`manual-qty-${index}`} label={requiredLabel('Qty')}>
                  <Form.Control
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItemField(index, 'quantity', e.target.value)}
                    placeholder="1"
                    required
                  />
                </FloatingLabel>
              </Col>
              <Col md={2} className="d-flex justify-content-end">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => removeItemRow(index)}
                  disabled={createForm.items.length === 1}
                >
                  <IconifyIcon icon="bx:trash" />
                </Button>
              </Col>
            </Row>
          ))}

          <Row className="g-2 mt-3">
            <Col md={12}>
              <div className="border rounded-3 p-2">
                <div className="text-uppercase text-muted fs-12 mb-2">Shipping</div>
                <FloatingLabel controlId="shipping-saved" label="Saved Address">
                  <Form.Select
                    value={createForm.shippingAddressId || ''}
                    onChange={(e) => handleSelectAddress('shipping', e.target.value)}
                  >
                    <option value="">Select saved address</option>
                    {customerAddresses.map((address) => (
                      <option key={address._id} value={address._id}>
                        {formatAddressOption(address)}
                      </option>
                    ))}
                  </Form.Select>
                </FloatingLabel>
                <Row className="g-2 mt-2">
                  <Col md={6}>
                    <FloatingLabel controlId="ship-name" label={requiredLabel('Full Name')}>
                      <Form.Control
                        value={createForm.shippingAddress.fullName}
                        onChange={(e) => updateAddressField('shippingAddress', 'fullName', e.target.value)}
                        placeholder="Full Name"
                        required
                      />
                    </FloatingLabel>
                  </Col>
                  <Col md={6}>
                    <FloatingLabel controlId="ship-phone" label={requiredLabel('Phone')}>
                      <Form.Control
                        value={createForm.shippingAddress.phone}
                        onChange={(e) => updateAddressField('shippingAddress', 'phone', e.target.value)}
                        placeholder="Phone"
                        required
                      />
                    </FloatingLabel>
                  </Col>
                  <Col md={8}>
                    <FloatingLabel controlId="ship-line1" label={requiredLabel('Address Line 1')}>
                      <Form.Control
                        value={createForm.shippingAddress.line1}
                        onChange={(e) => updateAddressField('shippingAddress', 'line1', e.target.value)}
                        placeholder="Address Line 1"
                        required
                      />
                    </FloatingLabel>
                  </Col>
                  <Col md={4}>
                    <FloatingLabel controlId="ship-line2" label="Address Line 2">
                      <Form.Control
                        value={createForm.shippingAddress.line2}
                        onChange={(e) => updateAddressField('shippingAddress', 'line2', e.target.value)}
                        placeholder="Address Line 2"
                      />
                    </FloatingLabel>
                  </Col>
                  <Col md={4}>
                    <FloatingLabel controlId="ship-city" label={requiredLabel('City')}>
                      <Form.Control
                        value={createForm.shippingAddress.city}
                        onChange={(e) => updateAddressField('shippingAddress', 'city', e.target.value)}
                        placeholder="City"
                        required
                      />
                    </FloatingLabel>
                  </Col>
                  <Col md={4}>
                    <FloatingLabel controlId="ship-state" label={requiredLabel('State')}>
                      <Form.Select
                        value={normalizeIndiaStateCode(createForm.shippingAddress.state)}
                        onChange={(e) => updateAddressField('shippingAddress', 'state', e.target.value)}
                        required
                      >
                        <option value="">Select state</option>
                        {INDIA_STATES.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.name}
                          </option>
                        ))}
                      </Form.Select>
                    </FloatingLabel>
                  </Col>
                  <Col md={4}>
                    <FloatingLabel controlId="ship-postal" label={requiredLabel('Postal Code')}>
                      <Form.Control
                        value={createForm.shippingAddress.postalCode}
                        onChange={(e) => updateAddressField('shippingAddress', 'postalCode', e.target.value)}
                        placeholder="Postal Code"
                        required
                      />
                    </FloatingLabel>
                  </Col>
                  <Col md={6}>
                    <FloatingLabel controlId="ship-country" label={requiredLabel('Country')}>
                      <Form.Select value={INDIA_COUNTRY.code} disabled>
                        <option value={INDIA_COUNTRY.code}>{INDIA_COUNTRY.name}</option>
                      </Form.Select>
                    </FloatingLabel>
                  </Col>
                </Row>
              </div>
            </Col>

            <Col md={12}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="text-uppercase text-muted fs-12 mb-0">Billing</h6>
                <Form.Check
                  type="checkbox"
                  label="Same as shipping"
                  checked={createForm.billingSameAsShipping}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setCreateForm(prev => ({
                      ...prev,
                      billingSameAsShipping: checked,
                      billingAddress: checked ? { ...prev.shippingAddress } : prev.billingAddress,
                      billingAddressId: checked ? prev.shippingAddressId : prev.billingAddressId,
                    }));
                  }}
                />
              </div>

              {!createForm.billingSameAsShipping && (
                <div className="border rounded-3 p-2">
                  <FloatingLabel controlId="billing-saved" label="Saved Address">
                    <Form.Select
                      value={createForm.billingAddressId || ''}
                      onChange={(e) => handleSelectAddress('billing', e.target.value)}
                    >
                      <option value="">Select saved address</option>
                      {customerAddresses.map((address) => (
                        <option key={address._id} value={address._id}>
                          {formatAddressOption(address)}
                        </option>
                      ))}
                    </Form.Select>
                  </FloatingLabel>
                  <Row className="g-2 mt-2">
                    <Col md={6}>
                      <FloatingLabel controlId="bill-name" label={requiredLabel('Full Name')}>
                        <Form.Control
                          value={createForm.billingAddress.fullName}
                          onChange={(e) => updateAddressField('billingAddress', 'fullName', e.target.value)}
                          placeholder="Full Name"
                          required
                        />
                      </FloatingLabel>
                    </Col>
                    <Col md={6}>
                      <FloatingLabel controlId="bill-phone" label={requiredLabel('Phone')}>
                        <Form.Control
                          value={createForm.billingAddress.phone}
                          onChange={(e) => updateAddressField('billingAddress', 'phone', e.target.value)}
                          placeholder="Phone"
                          required
                        />
                      </FloatingLabel>
                    </Col>
                    <Col md={8}>
                      <FloatingLabel controlId="bill-line1" label={requiredLabel('Address Line 1')}>
                        <Form.Control
                          value={createForm.billingAddress.line1}
                          onChange={(e) => updateAddressField('billingAddress', 'line1', e.target.value)}
                          placeholder="Address Line 1"
                          required
                        />
                      </FloatingLabel>
                    </Col>
                    <Col md={4}>
                      <FloatingLabel controlId="bill-line2" label="Address Line 2">
                        <Form.Control
                          value={createForm.billingAddress.line2}
                          onChange={(e) => updateAddressField('billingAddress', 'line2', e.target.value)}
                          placeholder="Address Line 2"
                        />
                      </FloatingLabel>
                    </Col>
                    <Col md={4}>
                      <FloatingLabel controlId="bill-city" label={requiredLabel('City')}>
                        <Form.Control
                          value={createForm.billingAddress.city}
                          onChange={(e) => updateAddressField('billingAddress', 'city', e.target.value)}
                          placeholder="City"
                          required
                        />
                      </FloatingLabel>
                    </Col>
                    <Col md={4}>
                    <FloatingLabel controlId="bill-state" label={requiredLabel('State')}>
                      <Form.Select
                        value={normalizeIndiaStateCode(createForm.billingAddress.state)}
                        onChange={(e) => updateAddressField('billingAddress', 'state', e.target.value)}
                        required
                      >
                        <option value="">Select state</option>
                        {INDIA_STATES.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.name}
                          </option>
                        ))}
                      </Form.Select>
                    </FloatingLabel>
                    </Col>
                    <Col md={4}>
                      <FloatingLabel controlId="bill-postal" label={requiredLabel('Postal Code')}>
                        <Form.Control
                          value={createForm.billingAddress.postalCode}
                          onChange={(e) => updateAddressField('billingAddress', 'postalCode', e.target.value)}
                          placeholder="Postal Code"
                          required
                        />
                      </FloatingLabel>
                    </Col>
                    <Col md={6}>
                    <FloatingLabel controlId="bill-country" label={requiredLabel('Country')}>
                      <Form.Select value={INDIA_COUNTRY.code} disabled>
                        <option value={INDIA_COUNTRY.code}>{INDIA_COUNTRY.name}</option>
                      </Form.Select>
                    </FloatingLabel>
                  </Col>
                </Row>
              </div>
            )}
            </Col>
          </Row>
        </Col>
        <Col xl={4}>
          <Card className="border-0 shadow-sm">
            <CardBody className="p-3">
              <h6 className="text-uppercase text-muted fs-12 mb-3">Price Breakdown</h6>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Subtotal</span>
                <span className="fw-semibold">{currency}{subtotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Coupon Discount</span>
                <span className="fw-semibold text-success">- {currency}{couponDiscount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Extra Discount</span>
                <span className="fw-semibold text-success">- {currency}{cappedManualDiscount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Tax ({taxPercent}%)</span>
                <span className="fw-semibold">{currency}{taxAmount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Shipping</span>
                <span className="fw-semibold">
                  {hasShippingOverride ? `${currency}${shippingFee.toFixed(2)}` : 'Auto'}
                </span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <span className="fw-semibold">Total</span>
                <span className="fw-bold">{currency}{grandTotal.toFixed(2)}</span>
              </div>
              {!hasShippingOverride && (
                <div className="text-muted small mt-2">
                  Shipping is calculated automatically on save.
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderRowSkeletons = (count = 6) =>
    Array.from({ length: count }).map((_, idx) => (
      <tr key={`row-skeleton-${idx}`} className="placeholder-glow">
        <td className="ps-3 py-3">
          <Placeholder xs={1} />
        </td>
        <td className="py-3">
          <Placeholder xs={6} />
        </td>
        <td className="py-3">
          <Placeholder xs={5} />
        </td>
        <td className="py-3">
          <Placeholder xs={4} />
        </td>
        <td className="py-3">
          <Placeholder xs={4} />
        </td>
        <td className="py-3">
          <Placeholder xs={6} />
        </td>
        <td className="py-3">
          <Placeholder xs={3} />
        </td>
        <td className="py-3 text-end pe-4">
          <Placeholder xs={4} />
        </td>
      </tr>
    ));

  return (
    <Row>
      {!hideList && (
        <Col xl={12}>
          <Card>
            <CardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <CardTitle as={'h4'} className="mb-0">
                  Orders List{' '}
                  <span className="text-muted fs-14">
                    {`(${statusCounts.all || ordersData.length})`}
                  </span>
                </CardTitle>
                <div className="flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                  <StatusFilterTabs
                    activeStatus={activeStatus}
                    onStatusChange={handleStatusChange}
                    compact
                    className="mb-0"
                    statusCounts={statusCounts}
                    loading={isListLoading}
                  />
                </div>
              </div>
            </CardHeader>

            <div className="p-3 border-bottom">
              <div className="row g-3 align-items-center">
                <div className="col-lg-3 col-md-4 col-sm-6">
                  <Form.Select
                    className="form-select form-select-sm"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="all">All dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7">Last 7 days</option>
                    <option value="last30">Last 30 days</option>
                    <option value="last6m">Last 6 months</option>
                    <option value="last1y">Last 1 year</option>
                  </Form.Select>
                </div>

                <div className="col-lg-2 col-md-4 col-sm-6">
                  <Form.Select
                    className="form-select form-select-sm"
                    value={customerTypeFilter}
                    onChange={(e) => {
                      setCustomerTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="all">Customer type</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </Form.Select>
                </div>

                <div className="col-lg-2 col-md-4 col-sm-6">
                  <Form.Select
                    className="form-select form-select-sm"
                    value={productTypeFilter}
                    onChange={(e) => {
                      setProductTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="all">Product type</option>
                    <option value="oem">OEM</option>
                    <option value="aftermarket">Aftermarket</option>
                  </Form.Select>
                </div>

                <div className="col-lg-5 col-md-8 col-sm-12">
                  <InputGroup className="input-group-sm shadow-sm">
                    <InputGroup.Text className="bg-white border-end-0 text-muted ps-3">
                      <IconifyIcon icon="bx:search" className="fs-5" />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Search by name, email, phone, or order ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-start-0 ps-1"
                    />
                  </InputGroup>
                </div>
              </div>
            </div>

            <CardBody className="p-0">
              <div className="table-responsive">
                <table className="table align-middle mb-0 table-hover table-centered" style={{ fontSize: '0.9rem' }}>
                  <thead className="bg-light-subtle text-secondary text-uppercase fs-12">
                    <tr>
                      <th style={{ width: '40px' }} className="ps-3 py-3 rounded-start-3">
                        <Form.Check
                          type="checkbox"
                          onChange={toggleSelectAll}
                          checked={!isListLoading && ordersData.length > 0 && selectedOrders.length === ordersData.length}
                          className="form-check-input-primary"
                        />
                      </th>
                      <th className="py-3">Order ID</th>
                      <th className="py-3">Date</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Payment</th>
                      <th className="py-3">Shipment Tracking</th>
                      <th className="py-3">Invoice</th>
                      <th className="py-3 text-end pe-4 rounded-end-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isListLoading ? (
                      renderRowSkeletons()
                    ) : ordersData.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-5">
                          <div className="d-flex flex-column align-items-center justify-content-center opacity-50">
                            <div className="bg-light p-4 rounded-circle mb-3">
                              <IconifyIcon icon="solar:box-minimalistic-broken" width="48" height="48" className="text-secondary" />
                            </div>
                            <h6 className="text-secondary">No orders found</h6>
                            <p className="text-muted small">Try adjusting your filters or search query.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      ordersData.map((order, idx) => {
                          const statusBadge = getStatusBadge(order.orderStatus);
                          const paymentBadge = getPaymentStatusBadge(order.paymentStatus);
                          const customerName = order.userId
                            ? `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() || 'Guest User'
                            : 'Guest User';
                          const customerEmail = order.userId?.email || '';
                          const customerId = order.userId?._id || null;

                          return (
                            <tr
                              key={order._id || idx}
                              onClick={() => handleRowClick(order._id)}
                              style={{ cursor: 'pointer' }}
                              className="position-relative"
                              onMouseEnter={() => setHoveredOrderId(order._id)}
                              onMouseLeave={() => setHoveredOrderId(null)}
                            >
                              <td className="ps-3 py-3" onClick={(e) => e.stopPropagation()}>
                                <Form.Check
                                  type="checkbox"
                                  checked={selectedOrders.includes(order._id)}
                                  onChange={(e) => toggleSelectOrder(e, order._id)}
                                  className="form-check-input-primary"
                                />
                              </td>
                              <td className="py-3">
                                <span className="fw-bold text-primary fs-13">#{order.orderNumber || order._id?.substring(0, 8).toUpperCase()}</span>
                                {hoveredOrderId === order._id && (
                                  <div className="d-flex align-items-center gap-2 text-muted small mt-2">
                                    <div
                                      className="avatar-sm bg-primary-subtle rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold flex-shrink-0"
                                      style={{ width: '32px', height: '32px' }}
                                      onClick={(e) => handleCustomerClick(e, customerId)}
                                    >
                                      {customerName ? customerName.charAt(0).toUpperCase() : 'G'}
                                    </div>
                                    <div className="d-flex flex-column">
                                      <button
                                        type="button"
                                        className="btn btn-link p-0 text-start fw-medium text-dark"
                                        onClick={(e) => handleCustomerClick(e, customerId)}
                                      >
                                        {customerName}
                                      </button>
                                      {customerEmail && (
                                        <button
                                          type="button"
                                          className="btn btn-link p-0 text-start text-muted"
                                          style={{ fontSize: '0.75rem' }}
                                          onClick={(e) => handleCustomerClick(e, customerId)}
                                        >
                                          {customerEmail}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="text-muted py-3">
                                {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                }) : '-'}
                                <div className="small text-muted opacity-75" style={{ fontSize: '0.7rem' }}>
                                  {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                              </td>
                              <td className="py-3">
                                <Badge
                                  bg={statusBadge.bg}
                                  className="fs-12 fw-medium text-capitalize" // Removed explicit border/bg opacity classes
                                >
                                  {statusBadge.text}
                                </Badge>
                              </td>
                              <td className="py-3">
                                {(() => {
                                  const paymentMethod = (order.paymentMethod || '').toLowerCase();
                                  return (
                                    <div className="d-flex flex-column">
                                      <Badge
                                        bg={paymentBadge.bg}
                                        className="fs-12 fw-medium text-capitalize d-inline-flex align-items-center gap-1"
                                      >
                                        {paymentMethod === 'cod' && (
                                          <IconifyIcon icon="mdi:cash" className="fs-6 text-success" />
                                        )}
                                        {paymentMethod === 'razorpay' && (
                                          <IconifyIcon icon="simple-icons:razorpay" className="fs-6 text-primary" />
                                        )}
                                        {paymentBadge.text}
                                      </Badge>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-3">
                                <div className="d-flex flex-column align-items-start small">
                                  <span className="text-muted">NA</span>
                                </div>
                              </td>
                              <td className="py-3">
                                <div className="d-flex flex-column gap-1">
                                  <span className="text-dark fs-13">INV-{order.orderNumber || order._id?.substring(0, 4)}</span>
                                  <div className="d-flex align-items-center gap-2">
                                    <Button
                                      variant="link"
                                      className="p-0 text-muted"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewInvoice(order._id);
                                      }}
                                    >
                                      <IconifyIcon icon="bx:show" className="fs-5" />
                                    </Button>
                                    <Button
                                      variant="link"
                                      className="p-0 text-muted"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadInvoice(order._id);
                                      }}
                                    >
                                      <IconifyIcon icon="bx:download" className="fs-5" />
                                    </Button>
                                    <Button
                                      variant="link"
                                      className="p-0 text-muted"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrintInvoice(order._id);
                                      }}
                                    >
                                      <IconifyIcon icon="bx:printer" className="fs-5" />
                                    </Button>
                                  </div>
                                </div>
                              </td>
                              <td className="fw-bold text-dark py-3 text-end pe-4">
                                {currency}{order.grandTotal?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
            <CardFooter className="border-top">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="text-muted">
                  Showing {ordersData.length} of {totalCount} orders
                </div>
                <nav aria-label="Page navigation">
                  <ul className="pagination justify-content-end mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        «
                      </button>
                    </li>
                    <li className="page-item disabled">
                      <span className="page-link">
                        {currentPage} of {totalPages}
                      </span>
                    </li>
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        »
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </CardFooter>
          </Card>
        </Col>
      )}

      {hideList ? (
        <Col xl={12}>
          <Form onSubmit={handleCreateOrder}>
            <Card className="border-0 shadow-sm">
              <CardBody className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h4 className="mb-0">Create Manual Order</h4>
                  <Button
                    variant="light"
                    onClick={() => {
                      setCreateError('');
                      router.push('/orders/orders-list');
                    }}
                  >
                    Back to orders
                  </Button>
                </div>
                {createFormContent}
              </CardBody>
              <CardFooter className="border-0 bg-white d-flex justify-content-end gap-2">
                <Button
                  variant="light"
                  onClick={() => {
                    setCreateError('');
                    router.push('/orders/orders-list');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={createSaving}>
                  {createSaving ? 'Creating...' : 'Create Order'}
                </Button>
              </CardFooter>
            </Card>
          </Form>
        </Col>
      ) : (
        <Modal
          show={showCreateModal}
          onHide={() => {
            setShowCreateModal(false);
            setCreateError('');
            setCustomerResults([]);
            setCustomerAddresses([]);
            setCouponState({ loading: false, error: '', discount: 0 });
          }}
          size="xl"
          centered
        >
          <Form onSubmit={handleCreateOrder}>
            <Modal.Header closeButton>
              <Modal.Title>Create Manual Order</Modal.Title>
            </Modal.Header>
            <Modal.Body className="py-3">
              {createFormContent}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="light"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={createSaving}>
                {createSaving ? 'Creating...' : 'Create Order'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}

      <Modal show={showCustomerModal} onHide={() => setShowCustomerModal(false)} centered>
        <Form onSubmit={handleCreateCustomer}>
          <Modal.Header closeButton>
            <Modal.Title>Create Customer</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>First Name</Form.Label>
                <Form.Control
                  value={newCustomerForm.firstName}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  value={newCustomerForm.lastName}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </Col>
              <Col md={12}>
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={newCustomerForm.password}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowCustomerModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Customer
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Row>
  );
};

export default OrdersList;
