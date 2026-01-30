export const dynamic = 'force-dynamic'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row } from 'react-bootstrap'

export const metadata = {
  title: 'SEO Configuration',
}

const SeoPage = () => {
  return (
    <>
      <PageTItle title="SEO Configuration" />
      {/* <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <h4>SEO Settings</h4>
              <p>Configure your site's SEO settings here.</p>
              Added placeholder content for now
              <div className="alert alert-info">
                SEO Configuration module coming soon.
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row> */}
    </>
  )
}
export default SeoPage
