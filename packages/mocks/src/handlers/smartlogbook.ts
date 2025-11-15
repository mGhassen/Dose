import { http, HttpResponse } from 'msw';
import { mockData } from '../data';

// Generic CRUD handlers factory
function createCrudHandlers(endpoint: string, dataArray: any[]) {
  return [
    // GET all
    http.get(`/api/${endpoint}`, () => {
      return HttpResponse.json(dataArray);
    }),

    // GET by ID
    http.get(`/api/${endpoint}/:id`, ({ params }) => {
      const id = parseInt(params.id as string);
      const item = dataArray.find(item => item.id === id);
      
      if (!item) {
        return HttpResponse.json({ error: `${endpoint} not found` }, { status: 404 });
      }
      
      return HttpResponse.json(item);
    }),

    // POST create
    http.post(`/api/${endpoint}`, async ({ request }) => {
      const body = await request.json() as any;
      const newItem = {
        id: dataArray.length + 1,
        ...body,
        is_deletable: body.is_deletable ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dataArray.push(newItem);
      return HttpResponse.json(newItem, { status: 201 });
    }),

    // PUT update
    http.put(`/api/${endpoint}/:id`, async ({ request, params }) => {
      const id = parseInt(params.id as string);
      const body = await request.json() as any;
      const index = dataArray.findIndex(item => item.id === id);
      
      if (index === -1) {
        return HttpResponse.json({ error: `${endpoint} not found` }, { status: 404 });
      }
      
      dataArray[index] = { ...dataArray[index], ...body, updated_at: new Date().toISOString() };
      return HttpResponse.json(dataArray[index]);
    }),

    // DELETE
    http.delete(`/api/${endpoint}/:id`, ({ params }) => {
      const id = parseInt(params.id as string);
      const index = dataArray.findIndex(item => item.id === id);
      
      if (index === -1) {
        return HttpResponse.json({ error: `${endpoint} not found` }, { status: 404 });
      }
      
      dataArray.splice(index, 1);
      return HttpResponse.json({}, { status: 204 });
    })
  ];
}

// Example: Users handlers (keep as reference)
export const usersHandlers = [
  // GET all users
  http.get('/api/users', () => {
    const users = mockData.users?.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: null,
      address: null,
      department: user.department || null,
      comment: null,
      isActive: user.status === 'active',
      roleId: user.role === 'administrator' ? 2 : user.role === 'manager' ? 1 : 0,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      isDeletable: true
    })) || [];
    return HttpResponse.json(users);
  }),

  // GET user by ID
  http.get('/api/users/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const user = mockData.users?.find(u => u.id === id);
    
    if (!user) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const transformedUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: null,
      address: null,
      department: user.department || null,
      comment: null,
      isActive: user.status === 'active',
      roleId: user.role === 'administrator' ? 2 : user.role === 'manager' ? 1 : 0,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      isDeletable: true
    };
    
    return HttpResponse.json(transformedUser);
  }),

  // POST create user - returns just the ID (not full object)
  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as any;
    const { email, roleId } = body;
    
    let role: 'conductor' | 'manager' | 'administrator' = 'conductor';
    if (roleId === 2) role = 'administrator';
    else if (roleId === 1) role = 'manager';
    else role = 'conductor';
    
    const newId = Math.max(...(mockData.users || []).map(u => u.id), 0) + 1;
    const newUser = {
      id: newId,
      firstName: null,
      lastName: null,
      email,
      role,
      department: null,
      status: 'active' as const,
      isAdmin: role === 'administrator',
      isMember: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null
    } as any;
    
    mockData.users.push(newUser);
    
    return HttpResponse.json(newId, { status: 201 });
  }),

  // PUT update user
  http.put('/api/users/:id', async ({ request, params }) => {
    const id = parseInt(params.id as string);
    const body = await request.json() as any;
    const index = mockData.users.findIndex(u => u.id === id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (body.email !== undefined) mockData.users[index].email = body.email;
    if (body.firstName !== undefined) mockData.users[index].firstName = body.firstName;
    if (body.lastName !== undefined) mockData.users[index].lastName = body.lastName;
    if (body.department !== undefined) mockData.users[index].department = body.department;
    if (body.roleId !== undefined) {
      if (body.roleId === 2) mockData.users[index].role = 'administrator';
      else if (body.roleId === 1) mockData.users[index].role = 'manager';
      else mockData.users[index].role = 'conductor';
      mockData.users[index].isAdmin = body.roleId === 2;
    }
    if (body.isActive !== undefined) {
      mockData.users[index].status = body.isActive ? 'active' : 'suspended';
    }
    mockData.users[index].updatedAt = new Date().toISOString();
    
    const updatedUser = mockData.users[index];
    const transformedUser = {
      id: updatedUser.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phoneNumber: null,
      address: null,
      department: updatedUser.department || null,
      comment: null,
      isActive: updatedUser.status === 'active',
      roleId: updatedUser.role === 'administrator' ? 1 : updatedUser.role === 'manager' ? 2 : 3,
      createdAt: updatedUser.createdAt || new Date().toISOString(),
      updatedAt: updatedUser.updatedAt || new Date().toISOString(),
      isDeletable: true
    };
    
    return HttpResponse.json(transformedUser);
  }),

  // DELETE user
  http.delete('/api/users/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const index = mockData.users.findIndex(u => u.id === id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    mockData.users.splice(index, 1);
    return HttpResponse.json({}, { status: 204 });
  })
];

// Vendors handlers with proper transformation
const vendorsHandlers = [
  // GET all vendors
  http.get('/api/vendors', () => {
    const vendors = (mockData.vendors || []).map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      email: vendor.email || null,
      phone: vendor.phone || null,
      address: vendor.address || null,
      contactPerson: vendor.contact_person || null,
      notes: vendor.notes || null,
      isActive: vendor.is_active ?? true,
      createdAt: vendor.created_at,
      updatedAt: vendor.updated_at,
    }));
    
    return HttpResponse.json({
      data: vendors,
      pagination: {
        page: 1,
        limit: vendors.length,
        total: vendors.length,
        totalPages: 1,
        hasMore: false,
      },
    });
  }),

  // GET vendor by ID
  http.get('/api/vendors/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const vendor = mockData.vendors?.find(v => v.id === id);
    
    if (!vendor) {
      return HttpResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    return HttpResponse.json({
      id: vendor.id,
      name: vendor.name,
      email: vendor.email || null,
      phone: vendor.phone || null,
      address: vendor.address || null,
      contactPerson: vendor.contact_person || null,
      notes: vendor.notes || null,
      isActive: vendor.is_active ?? true,
      createdAt: vendor.created_at,
      updatedAt: vendor.updated_at,
    });
  }),

  // POST create vendor
  http.post('/api/vendors', async ({ request }) => {
    const body = await request.json() as any;
    const newId = Math.max(...(mockData.vendors || []).map(v => v.id), 0) + 1;
    const newVendor = {
      id: newId,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      contact_person: body.contactPerson || null,
      notes: body.notes || null,
      is_active: body.isActive ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    mockData.vendors.push(newVendor);
    
    return HttpResponse.json({
      id: newVendor.id,
      name: newVendor.name,
      email: newVendor.email,
      phone: newVendor.phone,
      address: newVendor.address,
      contactPerson: newVendor.contact_person,
      notes: newVendor.notes,
      isActive: newVendor.is_active,
      createdAt: newVendor.created_at,
      updatedAt: newVendor.updated_at,
    }, { status: 201 });
  }),

  // PUT update vendor
  http.put('/api/vendors/:id', async ({ request, params }) => {
    const id = parseInt(params.id as string);
    const body = await request.json() as any;
    const index = mockData.vendors.findIndex(v => v.id === id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    if (body.name !== undefined) mockData.vendors[index].name = body.name;
    if (body.email !== undefined) mockData.vendors[index].email = body.email;
    if (body.phone !== undefined) mockData.vendors[index].phone = body.phone;
    if (body.address !== undefined) mockData.vendors[index].address = body.address;
    if (body.contactPerson !== undefined) mockData.vendors[index].contact_person = body.contactPerson;
    if (body.notes !== undefined) mockData.vendors[index].notes = body.notes;
    if (body.isActive !== undefined) mockData.vendors[index].is_active = body.isActive;
    mockData.vendors[index].updated_at = new Date().toISOString();
    
    const updated = mockData.vendors[index];
    return HttpResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      contactPerson: updated.contact_person,
      notes: updated.notes,
      isActive: updated.is_active,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  }),

  // DELETE vendor
  http.delete('/api/vendors/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const index = mockData.vendors.findIndex(v => v.id === id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    mockData.vendors.splice(index, 1);
    return HttpResponse.json({}, { status: 204 });
  })
];

// Items handlers with proper transformation
const itemsHandlers = [
  // GET all items
  http.get('/api/items', () => {
    const items = (mockData.items || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || null,
      category: item.category || null,
      sku: item.sku || null,
      unit: item.unit || null,
      unitPrice: item.unit_price || null,
      vendorId: item.vendor_id || null,
      notes: item.notes || null,
      isActive: item.is_active ?? true,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
    
    return HttpResponse.json({
      data: items,
      pagination: {
        page: 1,
        limit: items.length,
        total: items.length,
        totalPages: 1,
        hasMore: false,
      },
    });
  }),

  // GET item by ID
  http.get('/api/items/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const item = mockData.items?.find(i => i.id === id);
    
    if (!item) {
      return HttpResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    return HttpResponse.json({
      id: item.id,
      name: item.name,
      description: item.description || null,
      category: item.category || null,
      sku: item.sku || null,
      unit: item.unit || null,
      unitPrice: item.unit_price || null,
      vendorId: item.vendor_id || null,
      notes: item.notes || null,
      isActive: item.is_active ?? true,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }),

  // POST create item
  http.post('/api/items', async ({ request }) => {
    const body = await request.json() as any;
    const newId = Math.max(...(mockData.items || []).map(i => i.id), 0) + 1;
    const newItem = {
      id: newId,
      name: body.name,
      description: body.description || null,
      category: body.category || null,
      sku: body.sku || null,
      unit: body.unit || null,
      unit_price: body.unitPrice || null,
      vendor_id: body.vendorId || null,
      notes: body.notes || null,
      is_active: body.isActive ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    mockData.items.push(newItem);
    
    return HttpResponse.json({
      id: newItem.id,
      name: newItem.name,
      description: newItem.description,
      category: newItem.category,
      sku: newItem.sku,
      unit: newItem.unit,
      unitPrice: newItem.unit_price,
      vendorId: newItem.vendor_id,
      notes: newItem.notes,
      isActive: newItem.is_active,
      createdAt: newItem.created_at,
      updatedAt: newItem.updated_at,
    }, { status: 201 });
  }),

  // PUT update item
  http.put('/api/items/:id', async ({ request, params }) => {
    const id = parseInt(params.id as string);
    const body = await request.json() as any;
    const index = mockData.items.findIndex(i => i.id === id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    if (body.name !== undefined) mockData.items[index].name = body.name;
    if (body.description !== undefined) mockData.items[index].description = body.description;
    if (body.category !== undefined) mockData.items[index].category = body.category;
    if (body.sku !== undefined) mockData.items[index].sku = body.sku;
    if (body.unit !== undefined) mockData.items[index].unit = body.unit;
    if (body.unitPrice !== undefined) mockData.items[index].unit_price = body.unitPrice;
    if (body.vendorId !== undefined) mockData.items[index].vendor_id = body.vendorId;
    if (body.notes !== undefined) mockData.items[index].notes = body.notes;
    if (body.isActive !== undefined) mockData.items[index].is_active = body.isActive;
    mockData.items[index].updated_at = new Date().toISOString();
    
    const updated = mockData.items[index];
    return HttpResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      category: updated.category,
      sku: updated.sku,
      unit: updated.unit,
      unitPrice: updated.unit_price,
      vendorId: updated.vendor_id,
      notes: updated.notes,
      isActive: updated.is_active,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  }),

  // DELETE item
  http.delete('/api/items/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const index = mockData.items.findIndex(i => i.id === id);
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    mockData.items.splice(index, 1);
    return HttpResponse.json({}, { status: 204 });
  })
];

// Combine all handlers
export const allHandlers = [
  ...usersHandlers,
  ...vendorsHandlers,
  ...itemsHandlers,
  // Add more entity handlers here as needed
  // Example: ...createCrudHandlers('entityname', mockData.entityname),
];
