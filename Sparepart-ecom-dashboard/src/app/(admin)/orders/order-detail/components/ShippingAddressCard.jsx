import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';

const ShippingAddressCard = ({ address }) => {
  if (!address) {
    return (
      <Card>
        <CardHeader className="bg-light">
          <CardTitle as="h6" className="mb-0">Shipping Address</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-muted mb-0">No shipping address available</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm h-100">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <CardTitle as="h5" className="mb-0">Shipping Address</CardTitle>
      </CardHeader>
      <CardBody>
        <address className="mb-0">
          <strong className="d-block mb-2">{address.fullName || 'N/A'}</strong>

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

          {address.shippingMethod && (
            <div className="mt-3 pt-3 border-top">
              <span className="text-muted d-block mb-1">Shipping Method</span>
              <strong>{address.shippingMethod}</strong>
            </div>
          )}
        </address>
      </CardBody>
    </Card>
  );
};

export default ShippingAddressCard;
