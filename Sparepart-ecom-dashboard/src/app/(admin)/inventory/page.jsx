import WarehouseClient from './warehouse/components/WarehouseClient'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Inventory',
}

const InventoryPage = () => {
  return <WarehouseClient />
}

export default InventoryPage
