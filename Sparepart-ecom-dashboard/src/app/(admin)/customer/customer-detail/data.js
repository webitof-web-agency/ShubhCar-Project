import { currency } from '@/context/constants'
import { addOrSubtractDaysFromDate } from '@/utils/date'
export const latestInvoice = [
  {
    title: 'Invoice Id #INV2540',
    date: addOrSubtractDaysFromDate(1),
  },
  {
    title: 'Invoice Id #INV0914',
    date: addOrSubtractDaysFromDate(10),
  },
  {
    title: 'Invoice Id #INV3801',
    date: addOrSubtractDaysFromDate(100),
  },
  {
    title: 'Invoice Id #INV4782',
    date: addOrSubtractDaysFromDate(120),
  },
]
export const customerDetailsCardDta = [
  {
    title: 'Total Invoice',
    item: '0',
    icon: 'solar:bill-list-bold-duotone',
  },
  {
    title: 'Total Order',
    item: '0',
    icon: 'solar:box-bold-duotone',
  },
  {
    title: 'Total Spent',
    item: `${currency}0`,
    icon: 'solar:chat-round-money-bold-duotone',
  },
]
