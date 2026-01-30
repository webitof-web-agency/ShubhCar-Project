import { helpData } from '@/assets/data/help'
import { dataTableRecords, emailsData, projectsData, timelineData, transactionsData } from '@/assets/data/other'
import {
  productData,
  reviewListData,
  roleListData,
  socialGroupsData,
  userData,
  warehouseData,
} from '@/assets/data/products'
import { todoData } from '@/assets/data/task'
import { sleep } from '@/utils/promise'
import * as yup from 'yup'
export const getNotifications = async () => {
  return []
}
// MODIFIED: Static product demo data has been commented out in products.js
// This function now calls the backend API to fetch real product data
export const getProductData = async (token) => {
  // If no token provided, return empty array (for public access)
  if (!token) return []

  try {
    const productService = require('@/services/productService').default
    const response = await productService.getProducts({}, token)
    return response.data || []
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}
export const getAllTimeline = async () => {
  await sleep()
  return timelineData
}
export const getAttributeData = async () => {
  return []
}
export const getHelpData = async () => {
  return helpData
}
export const getSellersData = async () => {
  return []
}
// MODIFIED: Fetching real users from API
export const getAllUsers = async (token) => {
  if (!token) return []
  try {
    const { userAPI } = require('@/helpers/userApi')
    const response = await userAPI.list({}, token)
    return response.data || []
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}
export const getAllTransactions = async (token) => {
  if (!token) return []
  try {
    const { paymentAPI } = require('@/helpers/paymentApi')
    const response = await paymentAPI.list({}, token)
    return response.data || []
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return []
  }
}
export const getJoinedGroups = async () => {
  const data = socialGroupsData.filter((group) => group.joined)
  await sleep()
  return data
}
export const getAllDataTableRecords = async () => {
  await sleep()
  return dataTableRecords
}
export const getUserById = async (id) => {
  const user = userData.find((user) => user.id === id)
  if (user) {
    await sleep()
    return user
  }
}
export const getPermissionsListData = async () => {
  return []
}
export const getRoleListData = async () => {
  return roleListData
}
export const getAllProjects = async () => {
  await sleep()
  return projectsData
}
// MODIFIED: Returns undefined when productData is empty (static data disabled)
// Replace with real API call to fetch product by ID
export const getProductById = async (id) => {
  const data = productData.find((product) => product.id == id)
  await sleep()
  return data
}
export const getAllWareHouseProducts = async () => {
  const data = warehouseData.map((item) => {
    const user = userData.find((user) => user.id === item.userId)
    return {
      ...item,
      user,
    }
  })
  await sleep()
  return data
}
// MODIFIED: Fetching real orders from API
export const getAllOrders = async (token) => {
  if (!token) return []
  try {
    const { orderAPI } = require('@/helpers/orderApi')
    const response = await orderAPI.list({}, token)
    const payload = response.data || []
    if (Array.isArray(payload)) return payload
    return payload.items || []
  } catch (error) {
    console.error('Error fetching orders:', error)
    return []
  }
}
// MODIFIED: Fetching real reviews from API
export const getAllReviews = async (token) => {
  if (!token) return []
  try {
    const { reviewAPI } = require('@/helpers/reviewApi')
    const response = await reviewAPI.list({}, token)
    return response.data || []
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return []
  }
}
export const getAllTasks = async () => {
  const data = todoData.map((task) => {
    const employee = userData.find((seller) => seller.id === task.employeeId)
    return {
      ...task,
      employee,
    }
  })
  await sleep()
  return data
}
export const serverSideFormValidate = async (data) => {
  const formSchema = yup.object({
    fName: yup
      .string()
      .min(3, 'First name should have at least 3 characters')
      .max(50, 'First name should not be more than 50 characters')
      .required('First name is required'),
    lName: yup
      .string()
      .min(3, 'Last name should have at least 3 characters')
      .max(50, 'Last name should not be more than 50 characters')
      .required('Last name is required'),
    username: yup
      .string()
      .min(3, 'Username should have at least 3 characters')
      .max(20, 'Username should not be more than 20 characters')
      .required('Username is required'),
    city: yup
      .string()
      .min(3, 'City should have at least 3 characters')
      .max(20, 'City should not be more than 20 characters')
      .required('City is required'),
    state: yup
      .string()
      .min(3, 'State should have at least 3 characters')
      .max(20, 'State should not be more than 20 characters')
      .required('State is required'),
    zip: yup.number().required('ZIP is required'),
  })
  try {
    const validatedObj = await formSchema.validate(data, {
      abortEarly: false,
    })
    return validatedObj
  } catch (error) {
    return error
  }
}
export const getEmailsCategoryCount = async () => {
  const mailsCount = {
    inbox: 0,
    starred: 0,
    draft: 0,
    sent: 0,
    deleted: 0,
    important: 0,
  }
  mailsCount.inbox = emailsData.filter((email) => email.toId === '101').length
  mailsCount.starred = emailsData.filter((email) => email.starred).length
  mailsCount.draft = emailsData.filter((email) => email.draft).length
  mailsCount.sent = emailsData.filter((email) => email.fromId === '101').length
  mailsCount.important = emailsData.filter((email) => email.important).length
  await sleep()
  return mailsCount
}
export const getEmailDetails = async (id) => {
  const email = emailsData.find((email) => email.id === id)
  if (email) {
    email.from = userData.find((user) => user.id === email.fromId)
    email.to = userData.find((user) => user.id === email.toId)
    await sleep()
    return email
  }
}
export const getAllEmails = async (filter) => {
  const fillDataToEmails = (emails) => {
    return emails.map((email) => {
      const from = userData.find((user) => user.id === email.fromId)
      const to = userData.find((user) => user.id === email.toId)
      return {
        ...email,
        from,
        to,
      }
    })
  }
  let allEmailsData
  if (filter === 'important') allEmailsData = fillDataToEmails(emailsData.filter((email) => email.important))
  else if (filter === 'deleted') allEmailsData = fillDataToEmails(emailsData.filter((email) => email.deleted))
  else if (filter === 'sent') allEmailsData = fillDataToEmails(emailsData.filter((email) => email.fromId === '101'))
  else if (filter === 'draft') allEmailsData = fillDataToEmails(emailsData.filter((email) => email.draft))
  else if (filter === 'starred') allEmailsData = fillDataToEmails(emailsData.filter((email) => email.starred))
  else allEmailsData = fillDataToEmails(emailsData.filter((email) => email.toId === '101'))
  await sleep()
  return allEmailsData
}
