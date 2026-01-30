import logoDark from '@/assets/images/logo-dark.png'
import logoLight from '@/assets/images/logo-light.png'
import logoSm from '@/assets/images/logo-sm.png'
import Image from 'next/image'
import Link from 'next/link'
const LogoBox = () => {
  return (
    <div className="logo-box">
      <Link href="/" className="logo-dark">
        <Image src={logoSm} width={28} height={38} className="logo-sm" alt="logo sm" />
        <Image src={logoDark} height={40} width={180} className="logo-lg" alt="logo dark" />
      </Link>
      <Link href="/" className="logo-light">
        <Image src={logoSm} width={28} height={38} className="logo-sm" alt="logo sm" />
        <Image src={logoLight} height={40} width={180} className="logo-lg" alt="logo light" />
      </Link>
    </div>
  )
}
export default LogoBox
