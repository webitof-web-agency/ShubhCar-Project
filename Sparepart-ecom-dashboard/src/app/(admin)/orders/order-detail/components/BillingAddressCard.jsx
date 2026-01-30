import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';

const BillingAddressCard = ({ address, customerInfo }) => {
  if (!address) {
    return (
      <Card>
        <CardHeader className="bg-light">
          <CardTitle as="h6" className="mb-0">Billing Address</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-muted mb-0">No billing address available</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm h-100">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <CardTitle as="h5" className="mb-0">Billing Address</CardTitle>
      </CardHeader>
      <CardBody>
        <address className="mb-0">
          <strong className="d-block mb-2">
            {address.fullName || `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim() || 'N/A'}
          </strong>

          {(address.line1 || address.addressLine1) && (
            <span className="d-block">{address.line1 || address.addressLine1}</span>
          )}

          {(address.line2 || address.addressLine2) && (
            <span className="d-block">{address.line2 || address.addressLine2}</span>
          )}

          {(address.city || address.state || address.postalCode) && (
            <span className="d-block">
              {address.city}{address.city && address.state && ', '}{address.state} {address.postalCode}
            </span>
          )}

          {address.country && (
            <span className="d-block mb-3">{address.country}</span>
          )}

          {(customerInfo?.email || address.email) && (
            <div className="d-flex align-items-center gap-2 mb-1">
              <IconifyIcon icon="solar:letter-bold-duotone" className="text-primary" />
              <span>{customerInfo?.email || address.email}</span>
            </div>
          )}

          {(customerInfo?.phone || address.phone) && (
            <div className="d-flex align-items-center gap-2">
              <IconifyIcon icon="solar:phone-bold-duotone" className="text-primary" />
              <span>{customerInfo?.phone || address.phone}</span>
            </div>
          )}
        </address>
      </CardBody>
    </Card>
  );
};

export default BillingAddressCard;
