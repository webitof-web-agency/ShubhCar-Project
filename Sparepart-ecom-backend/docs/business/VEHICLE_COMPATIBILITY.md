# Vehicle Compatibility System

## Overview

The Vehicle Compatibility System is a core feature for the auto parts e-commerce platform, enabling customers to find the right parts for their specific vehicle. It supports hierarchical vehicle selection (Brand → Model → Year → Variant) with dynamic attribute filtering.

---

## System Architecture

```
┌─────────────┐
│Vehicle Brand│ (e.g., Maruti, Hyundai, Honda)
└──────┬──────┘
       │
       ├──────→ ┌──────────────┐
       │        │Vehicle Model │ (e.g., Swift, i20, City)
       │        └──────┬───────┘
       │               │
       │               ├──────→ ┌─────────────┐
       │               │        │Vehicle Year │ (e.g., 2020, 2021, 2022)
       │               │        └──────┬──────┘
       │               │               │
       │               │               ├──────→ ┌────────────────┐
       │               │               │        │Vehicle Variant │ (e.g., VXi, ZXi+, Diesel)
       │               │               │        └────────────────┘
       │               │               │
       │               │               └──────→ ┌──────────────────┐
       │               │                        │Vehicle Attributes│ (Fuel, Transmission, Engine)
       │               │                        └──────────────────┘
       │               │
       │               └──────→ ┌────────────────────┐
       │                        │Product Compatibility│ (Links products to vehicles)
       │                        └────────────────────┘
```

---

## Data Models

### Vehicle Brand
```javascript
{
  _id: ObjectId,
  name: String,              // "Maruti Suzuki"
  slug: String (unique),     // "maruti-suzuki"
  logo: String,              // CDN URL
  type: String,              // "vehicle" (vs "product" brands)
  status: String,            // "active", "inactive"
  createdAt: Date,
  updatedAt: Date
}
```

### Vehicle Model
```javascript
{
  _id: ObjectId,
  brandId: ObjectId (ref: Brand),
  name: String,              // "Swift"
  slug: String,              // "swift"
  image: String,             // Model image URL
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Vehicle Year
```javascript
{
  _id: ObjectId,
  year: Number,              // 2022
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Vehicle (Variant)
```javascript
{
  _id: ObjectId,
  vehicleCode: String (unique), // "VEH-000001" (auto-generated)
  brandId: ObjectId (ref: Brand),
  modelId: ObjectId (ref: VehicleModel),
  yearId: ObjectId (ref: VehicleYear),
  variantName: String,          // "VXi 1.2L Petrol MT"
  variantNameNormalized: String, // lowercase for duplicate detection
  
  // Attributes (fuel type, transmission, engine capacity, etc.)
  attributeValueIds: [ObjectId] (ref: VehicleAttributeValue),
  attributeSignature: String,    // Sorted IDs joined for duplicate detection
  
  status: String,                // "active", "inactive"
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Vehicle Attribute
```javascript
{
  _id: ObjectId,
  name: String,              // "Fuel Type", "Transmission", "Engine Capacity"
  type: String,              // "select", "text", "number"
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Vehicle Attribute Value
```javascript
{
  _id: ObjectId,
  attributeId: ObjectId (ref: VehicleAttribute),
  value: String,             // "Petrol", "Manual", "1.2L"
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Product Compatibility
```javascript
{
  _id: ObjectId,
  productId: ObjectId (ref: Product),
  compatibleVehicles: [
    {
      brandId: ObjectId,
      modelId: ObjectId,
      yearId: ObjectId,
      variantIds: [ObjectId]  // Specific variants or empty for all
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### Vehicle Finder Flow

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/vehicle-management/brands` | List all vehicle brands |
| GET | `/v1/vehicle-management/models?brandId={id}` | List models for a brand |
| GET | `/v1/vehicle-management/vehicles/available-years?modelId={id}` | List years available for a model |
| GET | `/v1/vehicle-management/vehicles/available-attributes?modelId={id}&yearId={id}` | List attributes for filtering variants |
| GET | `/v1/vehicle-management/vehicles?brandId={id}&modelId={id}&yearId={id}&attributeValueIds={ids}` | Find matching vehicles |
| GET | `/v1/vehicle-management/vehicles/:id` | Get vehicle details |
| GET | `/v1/vehicle-management/vehicles/:id/detail` | Get vehicle with siblings (other variants) |

### Admin Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/vehicle-management/brands` | Create brand |
| POST | `/v1/vehicle-management/models` | Create model |
| POST | `/v1/vehicle-management/years` | Create year |
| POST | `/v1/vehicle-management/attributes` | Create attribute |
| POST | `/v1/vehicle-management/attribute-values` | Create attribute value |
| POST | `/v1/vehicle-management/vehicles` | Create vehicle variant |
| PUT | `/v1/vehicle-management/vehicles/:id` | Update vehicle variant |
| DELETE | `/v1/vehicle-management/vehicles/:id` | Soft delete vehicle |
| GET | `/v1/vehicle-management/vehicles/export?format=csv` | Export vehicles (CSV/XLSX) |

### Product Compatibility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/products?vehicleId={id}` | Find products compatible with vehicle |
| GET | `/v1/product-compatibility/:productId` | Get product compatibility info |
| POST | `/v1/product-compatibility` | Add compatibility mapping (Admin) |

---

## User Flow: Vehicle Finder

### Step 1: Select Brand
```
GET /v1/vehicle-management/brands
Response: [
  { _id: "...", name: "Maruti Suzuki", logo: "..." },
  { _id: "...", name: "Hyundai", logo: "..." }
]
```

### Step 2: Select Model
```
GET /v1/vehicle-management/models?brandId=123
Response: [
  { _id: "...", name: "Swift", image: "..." },
  { _id: "...", name: "Baleno", image: "..." }
]
```

### Step 3: Select Year
```
GET /v1/vehicle-management/vehicles/available-years?modelId=456
Response: [
  { _id: "...", year: 2023 },
  { _id: "...", year: 2022 },
  { _id: "...", year: 2021 }
]
```

### Step 4: Select Attributes (Optional Filtering)
```
GET /v1/vehicle-management/vehicles/available-attributes?modelId=456&yearId=789
Response: [
  {
    attributeId: "...",
    name: "Fuel Type",
    values: [
      { _id: "...", value: "Petrol" },
      { _id: "...", value: "Diesel" }
    ]
  },
  {
    attributeId: "...",
    name: "Transmission",
    values: [
      { _id: "...", value: "Manual" },
      { _id: "...", value: "Automatic" }
    ]
  }
]
```

### Step 5: Find Matching Vehicles
```
GET /v1/vehicle-management/vehicles?brandId=123&modelId=456&yearId=789&attributeValueIds=attr1,attr2
Response: {
  items: [
    {
      _id: "...",
      vehicleCode: "VEH-000123",
      variantName: "VXi 1.2L Petrol MT",
      brand: { name: "Maruti Suzuki" },
      model: { name: "Swift" },
      year: { year: 2022 },
      display: {
        fuelType: "Petrol",
        transmission: "Manual",
        engineCapacity: "1.2L"
      }
    }
  ],
  total: 1
}
```

### Step 6: Find Compatible Products
```
GET /v1/products?vehicleId=VEH-000123
Response: {
  items: [
    { name: "Brake Pad Set - Front", price: 1299, ... },
    { name: "Air Filter", price: 450, ... }
  ]
}
```

---

## Business Logic

### Duplicate Detection

Vehicles are considered duplicates if they have:
1. Same `brandId`
2. Same `modelId`
3. Same `yearId`
4. Same `variantNameNormalized` (case-insensitive)
5. Same `attributeSignature` (sorted attribute value IDs)

**Example:**
```
Vehicle 1: Swift 2022 VXi [Petrol, Manual, 1.2L]
Vehicle 2: Swift 2022 vxi [Petrol, Manual, 1.2L]
→ DUPLICATE (variant name normalized + same attributes)
```

### Vehicle Code Generation

- Format: `VEH-XXXXXX` (e.g., `VEH-000001`)
- Auto-generated if not provided
- Must be unique across all vehicles
- Used for product compatibility mapping

### Attribute Signature

Prevents duplicate vehicles with same attributes:
```javascript
attributeValueIds: ["id1", "id3", "id2"]
attributeSignature: "id1|id2|id3" // Sorted and joined
```

### Variant Name Attribute

- "Variant Name" is a special attribute that cannot be used as a vehicle attribute
- It's stored directly in the `variantName` field
- Prevents confusion and ensures data consistency

---

## Export/Import

### Export Vehicles (CSV/XLSX)

```
GET /v1/vehicle-management/vehicles/export?format=xlsx

Response: Excel file with columns:
- vehicleCode
- brandName
- modelName
- year
- variantName
- status
- attributes (pipe-separated: "Fuel Type:Petrol | Transmission:Manual")
```

### Use Cases

- **Bulk data backup**
- **Offline analysis**
- **Data migration**
- **Inventory planning**

---

## Integration Points

### Product Catalog
- Products linked to vehicles via `productCompatibility` collection
- Filtering products by vehicle ID
- Displaying "Fits your vehicle" badges

### Search & Filters
- Vehicle-based product search
- "Shop by Vehicle" flow
- Cross-selling compatible products

### Cart & Checkout
- Validate product compatibility with user's saved vehicle
- Warning if product doesn't fit selected vehicle

---

## Performance Optimization

### Database Indexes
```javascript
// Vehicle
{ vehicleCode: 1 }                    // Unique lookup
{ brandId: 1, modelId: 1, yearId: 1 } // Hierarchical filtering
{ attributeSignature: 1 }             // Duplicate detection
{ variantNameNormalized: 1 }          // Search

// VehicleModel
{ brandId: 1 }                        // Brand's models
{ slug: 1 }                           // Unique

// Vehicle (distinct queries)
{ modelId: 1, isDeleted: 1 }          // Available years
{ modelId: 1, yearId: 1, isDeleted: 1 } // Available attributes
```

### Caching Strategy
```
vehicle:brand:list         // 1 day TTL
vehicle:model:{brandId}    // 1 day TTL
vehicle:years:{modelId}    // 1 hour TTL
vehicle:attributes:{modelId}:{yearId} // 1 hour TTL
vehicle:{id}               // 1 hour TTL
```

---

## Security Considerations

- **Public Access**: Vehicle finder endpoints are public (no auth required)
- **Admin Only**: Create/Update/Delete operations require admin role
- **Validation**: Strict validation on vehicle creation to prevent invalid data
- **Soft Delete**: Vehicles are soft-deleted to preserve compatibility history

---

## Common Use Cases

### Scenario 1: Customer Finds Parts for Their Car
```
1. Select: Maruti Suzuki → Swift → 2022 → VXi Petrol MT
2. System finds: VEH-000123
3. Customer browses: Products compatible with VEH-000123
4. Adds to cart: Brake pads, air filter
```

### Scenario 2: Admin Adds New Vehicle Variant
```
1. Create brand: "Tata Motors" (if not exists)
2. Create model: "Nexon" under Tata
3. Create year: 2024 (if not exists)
4. Create attributes: Fuel Type=Electric, Transmission=Automatic
5. Create vehicle: Nexon 2024 EV Max LR
6. System generates: VEH-000456
```

### Scenario 3: Product Manager Maps Compatibility
```
1. Select product: "Brake Pad Set - Front"
2. Add compatibility:
   - Maruti Swift (2020-2023, All Variants)
   - Hyundai i20 (2021-2023, Petrol variants only)
3. Save compatibility mapping
4. Product now appears in vehicle-based search
```

---

## Testing

### Unit Tests
- Vehicle creation with duplicate detection
- Attribute signature generation
- Vehicle code auto-generation
- Export functionality

### Integration Tests
- Complete vehicle finder flow (brand → model → year → variant)
- Product compatibility filtering
- Admin CRUD operations

---

## Related Documentation

- [Product Catalog](./PRODUCT_CATALOG.md)
- [Database Schema](../infrastructure/DATABASE_SCHEMA.md)
- [API Reference](../API_REFERENCE.md)
