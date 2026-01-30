import { Card, CardBody, CardHeader, CardTitle, Badge } from 'react-bootstrap';
import { getStatusBadge, getPaymentStatusBadge } from '@/helpers/orderApi';
import Link from 'next/link';

const GeneralInfoCard = ({ order }) => {
  if (!order) return null;

  const statusBadge = getStatusBadge(order.orderStatus);
  const paymentBadge = getPaymentStatusBadge(order.paymentStatus);

  return (
    <Card className="border-0 shadow-sm mb-3">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <CardTitle as="h5" className="mb-0">General Information</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="mb-3">
          <span className="text-muted d-block mb-1">Order Date</span>
          <strong>
            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }) : 'N/A'}
          </strong>
        </div>

        <div className="mb-3">
          <span className="text-muted d-block mb-1">Order Status</span>
          <Badge bg={statusBadge.bg} className="px-2 py-1">
            {statusBadge.text}
          </Badge>
        </div>

        <div className="mb-3">
          <span className="text-muted d-block mb-1">Customer</span>
          <Link href={`/customers/${order.userId?._id}`} className="fw-medium text-primary">
            {order.userId?.name || 'Guest User'}
          </Link>
          <div className="text-muted small">{order.userId?.email || ''}</div>
        </div>

        <div className="mb-3">
          <span className="text-muted d-block mb-1">Payment Method</span>
          <strong className="text-uppercase">{order.paymentMethod || 'N/A'}</strong>
        </div>

        <div className="mb-0">
          <span className="text-muted d-block mb-1">Payment Status</span>
          <Badge
            bg={paymentBadge.bg}
            className={`${paymentBadge.textColor ? `text-${paymentBadge.textColor}` : ''} px-2 py-1`}>
            {paymentBadge.text}
          </Badge>
        </div>
      </CardBody>
    </Card>
  );
};

export default GeneralInfoCard;
