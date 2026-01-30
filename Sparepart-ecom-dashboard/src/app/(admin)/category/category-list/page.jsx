import Category from './components/Category'
import CategoryList from './components/CategoryList'
import PageTItle from '@/components/PageTItle'
export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Category List',
}
const CategoryListPage = () => {
  return (
    <>
      <PageTItle title="CATEGORIES LIST" />
      <Category />
      <CategoryList />
    </>
  )
}
export default CategoryListPage
