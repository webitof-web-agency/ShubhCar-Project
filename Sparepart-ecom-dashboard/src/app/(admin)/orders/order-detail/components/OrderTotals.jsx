import { Row, Col, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
import { currency } from '@/context/constants';

const OrderTotals = ({ order }) => {
  if (!order) return null;

  const {
    subtotal = 0,
    shippingFee = 0,
    taxAmount = 0,
    taxBreakdown = {},
    discountAmount = 0,
    grandTotal = 0,
  } = order;

  const finalSubtotal = subtotal || 0;

  const cgst = Number(taxBreakdown.cgst || 0);
  const sgst = Number(taxBreakdown.sgst || 0);
  const igst = Number(taxBreakdown.igst || 0);

  return (
    <Card className="border-0 shadow-sm h-100">
      <CardHeader className="bg-light-subtle border-bottom border-light">
        <CardTitle as="h5" className="mb-0">Order Summary</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="table-responsive">
          <table className="table table-borderless mb-0 text-end">
            <tbody>
              <tr>
                <td className="text-start">Sub Total :</td>
                <td className="fw-medium text-dark">{currency}{finalSubtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="text-start">Discount :</td>
                <td className="fw-medium text-success">-{currency}{discountAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="text-start">Shipping Charge :</td>
                <td className="fw-medium text-dark">{currency}{shippingFee.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="text-start">Estimated Tax :</td>
                <td className="fw-medium text-dark">{currency}{taxAmount.toFixed(2)}</td>
              </tr>
              {cgst > 0 && (
                <tr>
                  <td className="text-start">CGST :</td>
                  <td className="fw-medium text-dark">{currency}{cgst.toFixed(2)}</td>
                </tr>
              )}
              {sgst > 0 && (
                <tr>
                  <td className="text-start">SGST :</td>
                  <td className="fw-medium text-dark">{currency}{sgst.toFixed(2)}</td>
                </tr>
              )}
              {igst > 0 && (
                <tr>
                  <td className="text-start">IGST :</td>
                  <td className="fw-medium text-dark">{currency}{igst.toFixed(2)}</td>
                </tr>
              )}
              <tr className="border-top">
                <td className="text-start pt-3 fw-bold text-dark fs-16">Total (INR) :</td>
                <td className="pt-3 fw-bold text-primary fs-16">{currency}{grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
};

export default OrderTotals;
