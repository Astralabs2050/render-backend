# Hire Maker API - Postman Collection

This Postman collection provides comprehensive testing for the **Hire Maker** endpoint, which allows creators to hire makers for their NFT designs.

## 📁 Files

- **`Hire_Maker_API.postman_collection.json`** - Main Postman collection
- **`HIRE_MAKER_README.md`** - This documentation file

## 🚀 Quick Start

### 1. Import the Collection

1. Open Postman
2. Click **Import** button
3. Drag and drop `Hire_Maker_API.postman_collection.json` or click to browse and select the file
4. The collection will appear in your Postman workspace

### 2. Set Up Environment Variables

The collection uses these environment variables:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `base_url` | Your API base URL | `http://localhost:3000` |
| `auth_token` | JWT authentication token | Empty (set automatically) |
| `design_id` | Design ID from inventory | Empty (set automatically) |
| `job_id` | Job ID after creation | Empty (set automatically) |

### 3. Test Flow

The collection is organized in a logical testing flow:

1. **Authentication** → Get JWT token
2. **Creator Inventory** → Get design IDs
3. **Hire Maker** → Test the main endpoint
4. **Validation Tests** → Test error scenarios

## 🔐 Authentication

### Login Request

**Endpoint:** `POST /auth/login`

**Body:**
```json
{
  "email": "kases14120@discrip.com",
  "password": "Password123!"
}
```

**What Happens:**
- ✅ Tests if login is successful (200 status)
- ✅ Verifies response contains access token
- ✅ **Automatically sets** `auth_token` environment variable

## 📋 Creator Inventory

### Get Inventory Request

**Endpoint:** `GET /creator/inventory`

**Headers:** `Authorization: Bearer {{auth_token}}`

**What Happens:**
- ✅ Tests if inventory request succeeds (200 status)
- ✅ Verifies response structure
- ✅ **Automatically sets** `design_id` from first design in inventory

## 🎯 Hire Maker Endpoint

### Basic Request

**Endpoint:** `POST /creator/hire-maker`

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer {{auth_token}}`

**Body:**
```json
{
  "designId": "{{design_id}}",
  "requirements": "Create high-quality versions of this design with premium materials",
  "quantity": 25,
  "deadlineDate": "2025-12-31",
  "productTimeline": "3-4 weeks",
  "budgetRange": {
    "min": 800,
    "max": 2500
  },
  "shippingRegion": "United States",
  "fabricSource": "Premium cotton blend with silk accents",
  "skillKeywords": ["sewing", "pattern-making", "quality-control", "embroidery"],
  "experienceLevel": "advanced"
}
```

**What Happens:**
- ✅ Tests if request succeeds (200/201 status)
- ✅ Verifies response structure
- ✅ Checks job data contains required fields
- ✅ **Automatically sets** `job_id` environment variable

### High Budget Request

**Same endpoint, different body:**
- Higher budget range ($5,000 - $15,000)
- Luxury materials (silk and cashmere)
- Expert experience level
- Worldwide shipping

### Quick Turnaround Request

**Same endpoint, different body:**
- Lower budget range ($200 - $800)
- Standard materials (cotton)
- Intermediate experience level
- Local shipping
- Fast timeline (1-2 weeks)

## 🧪 Validation Tests

### Missing Required Fields

**Tests:** Validation error (400 status) when required fields are missing

### Invalid Design ID

**Tests:** Error handling for invalid UUID format

### Unauthorized Access

**Tests:** 401 status when no authentication token is provided

## 📊 Automated Testing

Each request includes **Postman Tests** that automatically:

1. **Validate Status Codes** - Ensure correct HTTP responses
2. **Check Response Structure** - Verify JSON format and required fields
3. **Set Environment Variables** - Automatically populate tokens and IDs
4. **Log Results** - Console output for debugging

## 🔄 Testing Workflow

### Step-by-Step Testing

1. **Run "Login to Get JWT Token"**
   - This automatically sets your `auth_token`

2. **Run "Get Creator Inventory"**
   - This automatically sets your `design_id`

3. **Run any "Hire Maker" request**
   - This automatically sets your `job_id`

4. **Run validation tests**
   - Test error scenarios and edge cases

### Environment Variables Flow

```
Login → auth_token set
  ↓
Inventory → design_id set
  ↓
Hire Maker → job_id set
```

## 🎨 Customization

### Modify Request Bodies

You can customize any request by editing the JSON body:

- **Change quantities** and **budget ranges**
- **Modify skill requirements** and **experience levels**
- **Adjust deadlines** and **timelines**
- **Update shipping regions** and **fabric sources**

### Add New Test Cases

To add new test scenarios:

1. **Duplicate** an existing request
2. **Modify** the body with your test data
3. **Add** custom Postman tests if needed
4. **Save** to your collection

## 🚨 Common Issues

### "Auth Token Not Set"

**Solution:** Run the login request first

### "Design ID Not Set"

**Solution:** Run the inventory request first

### "Validation Errors"

**Check:**
- All required fields are present
- Date format is ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- UUID format is valid
- Budget range min < max

### "Server Connection Error"

**Check:**
- Server is running on port 3000
- Base URL is correct in environment
- No firewall blocking localhost

## 📱 Response Examples

### Successful Response (200/201)

```json
{
  "status": true,
  "message": "Maker hiring request created successfully",
  "data": {
    "jobId": "uuid-here",
    "title": "Hire Maker for [Design Name]",
    "status": "open",
    "budget": 2500,
    "deadline": "2025-12-31T23:59:59.000Z",
    "requirements": "Quantity: 25\nDeadline: 2025-12-31T23:59:59.000Z...",
    "message": "Your hiring request has been posted to the marketplace..."
  }
}
```

### Validation Error (400)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Unauthorized (401)

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## 🔧 Advanced Features

### Pre-request Scripts

The collection includes a **pre-request script** that:
- Sets default base URL if not configured
- Logs current environment state
- Provides debugging information

### Environment Management

- **Automatic token management** - No manual copying needed
- **Dynamic ID population** - IDs are set automatically
- **State persistence** - Variables persist between requests

### Test Automation

- **Automated validation** - Each request tests its own response
- **Error handling** - Comprehensive error scenario testing
- **Data verification** - Ensures response structure is correct

## 📚 Additional Resources

- **API Documentation** - Check your backend docs for endpoint details
- **Validation Rules** - Review DTO validation decorators
- **Error Codes** - Understand all possible response statuses
- **Business Logic** - Know how the hire-maker process works

## 🎯 Testing Checklist

Before running the collection, ensure:

- [ ] Server is running on port 3000
- [ ] Database has test data (run setup scripts if needed)
- [ ] User `kases14120@discrip.com` exists with creator role
- [ ] User has NFT designs in inventory
- [ ] All required environment variables are accessible

## 🚀 Ready to Test!

You're all set! Import the collection and start testing the hire-maker endpoint. The automated tests will guide you through the process and validate your API responses.

---

**Happy Testing! 🎉**
