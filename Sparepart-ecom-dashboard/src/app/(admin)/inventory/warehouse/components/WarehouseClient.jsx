'use client'
import PageTItle from '@/components/PageTItle'
import StockData from './StockData'
import WarehouseList from './WarehouseList'
import { useMemo, useState } from 'react'

const WarehouseClient = () => {
  const [activeFilter, setActiveFilter] = useState('products')
  const [refreshKey, setRefreshKey] = useState(0)
  const lowStockThreshold = 10

  const filters = useMemo(() => {
    if (activeFilter === 'low') return { threshold: lowStockThreshold }
    if (activeFilter === 'out') return { threshold: 0 }
    return {}
  }, [activeFilter])

  return (
    <>
      <PageTItle title="Inventory" />
      <StockData
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        lowStockThreshold={lowStockThreshold}
        refreshKey={refreshKey}
      />
      <WarehouseList
        filters={filters}
        onInventoryChange={() => setRefreshKey((prev) => prev + 1)}
      />
    </>
  )
}

export default WarehouseClient
