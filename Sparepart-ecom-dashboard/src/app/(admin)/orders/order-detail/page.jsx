'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import ProductDataList from './components/ProductDataList';
import OrderTimeline from './components/OrderTimeline';
import OrderDetails, { PaymentInformation } from './components/OrderDetails';
import BillingAddressCard from './components/BillingAddressCard';
import ShippingAddressCard from './components/ShippingAddressCard';
import OrderTotals from './components/OrderTotals';
import { Card, CardBody, Col, Placeholder, Row } from 'react-bootstrap';
import PageTItle from '@/components/PageTItle';
import { orderAPI } from '@/helpers/orderApi';
import { toast } from 'react-toastify';

const OrderDetailPage = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  useEffect(() => {
    if (orderId && session?.accessToken) {
      fetchOrderDetail();
    }
  }, [orderId, session]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const token = session?.accessToken;
      if (!token) {
        console.error('No authentication token available');
        setLoading(false);
        return;
      }
      const response = await orderAPI.getOrderDetail(orderId, token);
      const payload = response.data;
      setOrderData(payload);
      setEvents(payload.events || []);
      setShipments(payload.shipments || []);
      setNotes((payload.events || []).filter((event) => event.type === 'NOTE_ADDED' || event.noteContent));
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      toast.error(error.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    if (!orderId || !session?.accessToken) return;
    try {
      setUpdatingStatus(true);
      await orderAPI.updateStatus(orderId, status, session.accessToken);
      toast.success('Order status updated');
      await fetchOrderDetail();
    } catch (error) {
      console.error('Failed to update status:', error);
      const message = error?.data?.message || error?.message || 'Failed to update order status';
      toast.error(message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePaymentUpdate = async (payload) => {
    if (!orderId || !session?.accessToken) return false;
    try {
      setUpdatingPayment(true);
      await orderAPI.updatePaymentStatus(orderId, payload, session.accessToken);
      toast.success('Payment status updated');
      await fetchOrderDetail();
      return true;
    } catch (error) {
      console.error('Failed to update payment status:', error);
      const message = error?.data?.message || error?.message || 'Failed to update payment status';
      toast.error(message);
      return false;
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleAddNote = async ({ noteType, noteContent }) => {
    if (!orderId || !session?.accessToken) return false;
    try {
      setAddingNote(true);
      await orderAPI.addNote(orderId, { noteType, noteContent }, session.accessToken);
      toast.success('Note added');
      await fetchOrderDetail();
      return true;
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error(error.message || 'Failed to add note');
      return false;
    } finally {
      setAddingNote(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!orderId || !session?.accessToken) return;
    try {
      const blob = await orderAPI.getInvoicePdfByOrder(orderId, session.accessToken, true);
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
      toast.error(error.message || 'Failed to download invoice');
    }
  };

  const handleUpsertShipment = async (orderItemId, payload, hasExisting) => {
    if (!orderId || !session?.accessToken) return false;
    try {
      setSavingShipment(true);
      if (!hasExisting) {
        if (!payload.shippingProviderId || !payload.trackingNumber) {
          toast.error('Shipping Provider ID and Tracking Number are required');
          return false;
        }
        const createPayload = {
          shippingProviderId: payload.shippingProviderId,
          trackingNumber: payload.trackingNumber,
          trackingUrlFormat: payload.trackingUrlFormat,
          carrierName: payload.carrierName,
          estimatedDeliveryDate: payload.estimatedDeliveryDate,
        };
        await orderAPI.createShipment(orderItemId, createPayload, session.accessToken);

        if (payload.status && payload.status !== 'shipped') {
          await orderAPI.updateShipmentStatus(
            orderItemId,
            { status: payload.status },
            session.accessToken
          );
        }
      } else {
        await orderAPI.updateShipmentStatus(orderItemId, payload, session.accessToken);
      }

      toast.success('Shipment updated');
      await fetchOrderDetail();
      return true;
    } catch (error) {
      console.error('Failed to update shipment:', error);
      toast.error(error.message || 'Failed to update shipment');
      return false;
    } finally {
      setSavingShipment(false);
    }
  };

  const showSkeleton = loading && !orderData;

  if (showSkeleton) {
    return (
      <>
        <Row className="mb-3">
          <Col xs={12}>
            <div className="d-flex align-items-center justify-content-between">
              <PageTItle title="ORDER DETAILS" />
              <div className="d-flex gap-2">
                <Placeholder.Button xs={3} size="sm" />
                <Placeholder.Button xs={3} size="sm" />
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          <Col lg={8}>
            <Card className="mb-3 border-0 shadow-sm">
              <CardBody className="placeholder-glow">
                <Placeholder xs={8} className="mb-2" />
                <Placeholder xs={12} />
                <Placeholder xs={10} />
                <Placeholder xs={6} />
              </CardBody>
            </Card>

            <Row className="mb-3">
              <Col md={6}>
                <Card className="border-0 shadow-sm">
                  <CardBody className="placeholder-glow">
                    <Placeholder xs={8} className="mb-2" />
                    <Placeholder xs={12} />
                    <Placeholder xs={10} />
                  </CardBody>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="border-0 shadow-sm">
                  <CardBody className="placeholder-glow">
                    <Placeholder xs={8} className="mb-2" />
                    <Placeholder xs={12} />
                    <Placeholder xs={10} />
                  </CardBody>
                </Card>
              </Col>
            </Row>

            <Card className="mb-3 border-0 shadow-sm">
              <CardBody className="placeholder-glow">
                <Placeholder xs={6} className="mb-2" />
                <Placeholder xs={12} />
                <Placeholder xs={12} />
                <Placeholder xs={9} />
              </CardBody>
            </Card>

            <Row className="mb-3">
              <Col lg={6}>
                <Card className="border-0 shadow-sm h-100">
                  <CardBody className="placeholder-glow">
                    <Placeholder xs={8} className="mb-2" />
                    <Placeholder xs={12} />
                    <Placeholder xs={10} />
                  </CardBody>
                </Card>
              </Col>
              <Col lg={6}>
                <Card className="border-0 shadow-sm h-100">
                  <CardBody className="placeholder-glow">
                    <Placeholder xs={8} className="mb-2" />
                    <Placeholder xs={12} />
                    <Placeholder xs={10} />
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </Col>

          <Col lg={4}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <Card key={`sidebar-skeleton-${idx}`} className="mb-3 border-0 shadow-sm">
                <CardBody className="placeholder-glow">
                  <Placeholder xs={7} className="mb-2" />
                  <Placeholder xs={12} />
                  <Placeholder xs={9} />
                </CardBody>
              </Card>
            ))}
          </Col>
        </Row>
      </>
    );
  }

  if (!orderData || !orderData.order) {
    return (
      <>
        <PageTItle title="ORDER DETAILS" />
        <div className="text-center p-5">
          <p>Order not found</p>
        </div>
      </>
    );
  }

  const { order, items } = orderData;

  return (
    <>
      <Row className="mb-3">
        <Col xs={12}>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <PageTItle title={`Order #${order.orderNumber || order._id?.substring(0, 6).toUpperCase()}`} />
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        {/* Main Content Column */}
        <Col lg={8}>
          <OrderTimeline events={events} />

          <Row className="mb-3">
            <Col md={6}>
              <BillingAddressCard
                address={order.billingAddressId}
                customerInfo={order.userId}
              />
            </Col>
            <Col md={6}>
              <ShippingAddressCard address={order.shippingAddressId} />
            </Col>
          </Row>

          <ProductDataList items={items} orderStatus={order.orderStatus} />

          <Row className="mb-3">
            <Col lg={6}>
              <PaymentInformation
                order={order}
                onPaymentUpdate={handlePaymentUpdate}
                updatingPayment={updatingPayment}
              />
            </Col>
            <Col lg={6}>
              <OrderTotals order={order} />
            </Col>
          </Row>
        </Col>

        {/* Sidebar Column */}
        <Col lg={4}>
          <OrderDetails
            order={order}
            shipments={shipments}
            items={items}
            notes={notes}
            onStatusUpdate={handleStatusUpdate}
            updatingStatus={updatingStatus}
            onAddNote={handleAddNote}
            addingNote={addingNote}
            onDownloadInvoice={handleDownloadInvoice}
            onUpsertShipment={handleUpsertShipment}
            savingShipment={savingShipment}
          />
        </Col>
      </Row>
    </>
  );
};

export default OrderDetailPage;
