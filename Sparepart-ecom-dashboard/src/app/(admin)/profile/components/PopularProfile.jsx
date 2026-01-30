import avatar1 from '@/assets/images/users/dummy-avatar.jpg'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Image from 'next/image'
import { Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Row } from 'react-bootstrap'
import Link from 'next/link'

const popularProfileData = []
const PopularProfileCard = ({ date, description, name, questionTag, title }) => {
  return (
    <Card>
      <CardBody>
        <div className="d-flex align-items-center gap-2">
          <Image width={56} height={56} src={avatar1} alt="avatar" className="avatar-md rounded-circle border border-light border-3" />
          <div>
            <h4 className="mb-1">
              {name} ,{' '}
              <span className="fs-13 text-muted fw-medium ms-1">
                Project Head Manager .{' '}
                {date.toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </h4>
            <p className="mb-0">
              Asked a question{' '}
              <Link href="" className="text-primary ms-1">
                {questionTag}
              </Link>
            </p>
          </div>
        </div>
        <h4 className="mt-3">{title}</h4>
        <p className="mb-0">
          {description}
          <Link href="" className="link-primary">
            {' '}
            See more
          </Link>
        </p>
      </CardBody>
      <CardFooter className="border-top">
        <Row>
          <Col lg={2} xs={4}>
            <Link href="" className="text-primary d-inline-flex gap-1 align-items-center fs-14">
              <IconifyIcon icon="solar:pen-new-square-broken" className="fs-16" /> Answer
            </Link>
          </Col>
          <Col lg={2} xs={4}>
            <Link href="" className="text-dark d-inline-flex gap-1 align-items-center fs-14">
              <IconifyIcon icon="solar:hand-shake-broken" className="fs-16" /> Thanks
            </Link>
          </Col>
          <Col lg={2} xs={4}>
            <Link href="" className="text-dark d-inline-flex gap-1 align-items-center fs-14">
              <IconifyIcon icon="solar:lightbulb-minimalistic-broken" className="fs-16" /> Insightful
            </Link>
          </Col>
        </Row>
      </CardFooter>
    </Card>
  )
}
const PopularProfile = () => {
  return (
    <Row>
      <Col lg={3}>
        <Card>
          <CardHeader>
            <CardTitle as={'h4'}>Popular Filters</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="d-flex flex-wrap gap-2" role="group" aria-label="Basic checkbox toggle button group">
              <input type="checkbox" className="btn-check" id="all-topic" defaultChecked />
              <label className="btn bg-body rounded-pill d-flex justify-content-center align-items-center" htmlFor="all-topic">
                All Topics {''}
              </label>
              <input type="checkbox" className="btn-check" id="saas" />
              <label className="btn bg-body rounded-pill d-flex justify-content-center align-items-center" htmlFor="saas">
                #{''} {''}
              </label>
              <input type="checkbox" className="btn-check" id="latam" />
              <label className="btn bg-body rounded-pill d-flex justify-content-center align-items-center" htmlFor="latam">
                #{''} {''}
              </label>
              <input type="checkbox" className="btn-check" id="inbound" />
              <label className="btn bg-body rounded-pill d-flex justify-content-center align-items-center" htmlFor="inbound">
                #{''} {''}
              </label>
              <input type="checkbox" className="btn-check" id="europe" />
              <label className="btn bg-body rounded-pill d-flex justify-content-center align-items-center" htmlFor="europe">
                #{''} {''}
              </label>
              <input type="checkbox" className="btn-check" id="performance" />
              <label className="btn bg-body rounded-pill d-flex justify-content-center align-items-center" htmlFor="performance">
                #{''} {''}
              </label>
              <input type="checkbox" className="btn-check" id="facebook" />
              <label className="btn bg-body rounded-pill d-flex justify-content-center align-items-center" htmlFor="facebook">
                #{''} {''}
              </label>
            </div>
          </CardBody>
          <CardFooter className="border-top text-center">
            <Link href="" className="link-primary">
              View More
            </Link>
          </CardFooter>
        </Card>
      </Col>
      <Col lg={9}>
        {popularProfileData.map((item, idx) => (
          <PopularProfileCard key={idx} {...item} />
        ))}
      </Col>
    </Row>
  )
}
export default PopularProfile
