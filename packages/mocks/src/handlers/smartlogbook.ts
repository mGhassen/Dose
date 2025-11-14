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

// Combine all handlers
export const allHandlers = [
  ...usersHandlers,
  // Add more entity handlers here as needed
  // Example: ...createCrudHandlers('entityname', mockData.entityname),
];
