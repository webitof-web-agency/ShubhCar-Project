'use client'
import PageTItle from '@/components/PageTItle'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import CustomerDataList from '@/app/(admin)/customer/customer-list/components/CustomerDataList'

const WholesalePage = () => {
    return (
        <>
            <PageTItle title="WHOLESALE CUSTOMERS" />
            <Row>
                <Col xs={12}>
                    <CustomerDataList defaultFilter="wholesale" />
                </Col>
            </Row>
        </>
    )
}

export default WholesalePage
