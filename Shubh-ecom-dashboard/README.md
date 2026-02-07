# Shubh E-com Dashboard V2

## 🚀 Overview
The Admin Dashboard for the SpareParts E-commerce platform. Built with **Next.js 14**, **React Bootstrap**, and a centralized component architecture for rapid development and consistency.

## 🏗️ Architecture & Project Structure

We follow a **"Shared Component"** architecture to minimize code duplication.

```
src/
├── app/(admin)/            # Admin pages (Next.js App Router)
├── components/
│   ├── shared/             # ⭐️ CORES: Reusable UI logic
│   │   ├── DataTable.jsx   # Standardized list view with pagination/actions
│   │   ├── CRUDModal.jsx   # Generic Create/Edit modal with form engine
│   │   ├── DeleteConfirmModal.jsx # Standard delete dialog
│   │   └── StatusBadge.jsx # (Optional) Standardized status badges
│   ├── form/               # Form inputs (Dropzone, Select, etc.)
│   └── ...
├── hooks/
│   ├── useAPI.js           # ⭐️ CORE: Standardized API wrapper (loading/toast/errors)
│   ├── useFormValidation.js # Form validation logic
│   └── ...
└── helpers/                # API service layers
```

---

## 🛠️ Core Components

### 1. `DataTable`
The standard way to display lists of data. Handles loading states, empty states, and pagination automatically.

**Usage:**
```jsx
<DataTable
  columns={[
    { key: 'name', label: 'Name', render: (item) => <b>{item.name}</b> },
    { key: 'status', label: 'Status' }
  ]}
  data={items}
  loading={loading}
  actions={/* Optional override */}
/>
```

### 2. `CRUDModal`
A powerful, configuration-driven modal for Create and Edit operations. It handles form state, validation, and submission automatically based on a `fields` configuration.

**Usage:**
```jsx
<CRUDModal
  show={showModal}
  title="Add Product"
  fields={[
    { name: 'name', label: 'Product Name', type: 'text', required: true },
    { name: 'role', label: 'Role', type: 'select', options: [...] }
  ]}
  onSubmit={handleSubmit}
/>
```

### 3. `useAPI` Hook
Wraps all API calls to provide automatic:
- Loading state (`loading`)
- Error handling (Toast notifications)
- Success messages

**Usage:**
```jsx
const { execute: saveItem, loading } = useAPI(
  async (data) => await api.create(data),
  { showSuccessToast: true, successMessage: 'Item saved!' }
)
```

---

## 📧 Email System (Backend Integration)

The dashboard triggers emails via the backend `EmailNotificationService`.
- **Infrastructure**: Gmail SMTP (via `nodemailer`)
- **Templates**: Stored in MongoDB (`EmailTemplate` collection)
- **Key Triggers**:
    - `auth_email_verification`: On User Registration
    - `forgot_password_otp`: On Password Reset
    - `order_invoice`: On Order Payment Success
    - `credit_note`: On Order Cancellation/Refund

---

## 💻 Development

### Key Commands
```bash
npm run dev     # Start development server (Port 3001)
npm run lint    # Run ESLint
npm run build   # Build for production
```

### Adding a New Page?
1. Copy the structure of `src/app/(admin)/users/page.jsx` or `vehicle-years/page.jsx`.
2. Define your `columns` for the `DataTable`.
3. Define your `fields` for the `CRUDModal`.
4. Connect API calls using `useAPI`.
5. **Done!** You have a full CRUD page with validation and error handling in ~150 lines.
