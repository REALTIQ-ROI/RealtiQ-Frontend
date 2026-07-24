import type { CreateInquiryPayload, Inquiry, LoginPayload, Property, PropertyFilters, RegisterPayload, User } from '../types';
import { resolveOwnerId } from '../types';

export interface PaymentRecord {
  id: string;
  propertyId: string;
  buyerId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

interface StoredUser extends User {
  password: string;
}

interface MockState {
  users: StoredUser[];
  properties: Property[];
  inquiries: Inquiry[];
  payments: PaymentRecord[];
}

const STORE_KEY = 'realtiq-mock-db-v1';
export const ADMIN_CREDENTIALS = {
  email: 'admin@realtiq.com',
  password: 'Admin@12345',
} as const;

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const seedState = (): MockState => {
  const buyer: StoredUser = {
    _id: 'u-buyer-1',
    name: 'Jane Curator',
    email: 'buyer@realtiq.com',
    role: 'buyer',
    password: 'Buyer@123',
  };

  const landlord: StoredUser = {
    _id: 'u-landlord-1',
    name: 'Silas Thorne',
    email: 'landlord@realtiq.com',
    role: 'landlord',
    password: 'Landlord@123',
  };

  const admin: StoredUser = {
    _id: 'u-admin-1',
    name: 'Platform Admin',
    email: ADMIN_CREDENTIALS.email,
    role: 'admin',
    password: ADMIN_CREDENTIALS.password,
  };

  const properties: Property[] = [
    {
      _id: 'p-1',
      title: 'The Glass Pavilion',
      price: 18450000,
      paymentTypes: ['outright', 'escrow'],
      location: 'Beverly Hills, CA',
      propertyType: 'Villa',
      bedrooms: 5,
      bathrooms: 6.5,
      description: 'Modern architectural masterpiece with panoramic skyline views.',
      squareFeet: 8450,
      media: [
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBF3QwvyZxz9yhRiWx581C2m64oj1HLyqxO3M9WTrF4DrbWVScdJjyz5PGxq80gaAukoVtK8L1UH11OHDwZCBpB3hizBChtsoUZgyiBHVws29sXgpt2NUS-gs8lanYurwi-3Ph7d5j6S22gTxP_Xn4Hac5_HXccg2iPo2of9wOZ0gr0mfFaOWPaHt-wyNxqZgwg3ScjhJnToNeRyoIZos3SCB1TKjiMLB99cudajxIf3NrD3RzdgIVh_6NVW-1PH0wCx06iGy_Zug',
          public_id: 'p1-main',
          type: 'image',
        },
      ],
      status: 'available',
      featured: true,
      amenities: ['Private Cinema', 'Infinity Pool', 'Smart Home'],
      ownerId: landlord._id,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'p-2',
      title: 'Skyline Anthology',
      price: 9250000,
      paymentTypes: ['outright'],
      location: 'Tribeca, New York',
      propertyType: 'Penthouse',
      bedrooms: 3,
      bathrooms: 3.5,
      description: 'Premium city penthouse with concierge and skyline deck.',
      squareFeet: 3800,
      media: [
        {
          url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCe0hGYKCBlpm-meCyxKKw3T5UJiXxXt75EG3aPoc_wx70H5KBi1llkCjV6dHTN_C8enyYSMs-eFJr5G0ZdQaMd29o80-1V7MHMprJ_wziRgWMLK7GHfQHI19Nt0VvcgCH-7DR6vF_eicX_JMKs0HwayH98zCVofL3nExtAx8PSkH8UcYwWoLpTTMnpTYK-NCxlY0I3gOxg0GV2vloJNSuy8DQvzyq8CyCd-lLmLwwT-brso5cfftPLgANMIpZfFUvE1wBxVVqHXA',
          public_id: 'p2-main',
          type: 'image',
        },
      ],
      status: 'sold',
      featured: false,
      amenities: ['Concierge', 'Smart Access'],
      ownerId: landlord._id,
      buyerId: buyer._id,
      createdAt: new Date().toISOString(),
    },
  ];

  const inquiries: Inquiry[] = [
    {
      id: 'inq-1',
      propertyId: 'p-1',
      fullName: buyer.name,
      email: buyer.email,
      message: 'I would like to schedule a private viewing this weekend.',
      inquiryType: 'Schedule a Private Viewing',
      status: 'open',
      createdAt: new Date().toISOString(),
      userId: buyer._id,
      ownerId: landlord._id,
    },
  ];

  const payments: PaymentRecord[] = [
    {
      id: 'pay-1',
      propertyId: 'p-2',
      buyerId: buyer._id,
      amount: 9250000,
      status: 'paid',
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    users: [buyer, landlord, admin],
    properties,
    inquiries,
    payments,
  };
};

const readState = (): MockState => {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    const seeded = seedState();
    localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(raw) as MockState;
  } catch {
    const seeded = seedState();
    localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
};

const writeState = (state: MockState) => {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
};

const sanitizeUser = (user: StoredUser): User => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const mockStore = {
  login(payload: LoginPayload) {
    const state = readState();
    const user = state.users.find((item) => item.email === payload.email && item.password === payload.password);

    if (!user) {
      throw new Error('Invalid credentials.');
    }

    if (payload.role && user.role !== payload.role) {
      throw new Error('Use the correct login portal for this account.');
    }

    if (!payload.role && user.role === 'admin') {
      throw new Error('Admin must login from the admin login route.');
    }

    if (payload.role === 'admin') {
      if (payload.email !== ADMIN_CREDENTIALS.email || payload.password !== ADMIN_CREDENTIALS.password) {
        throw new Error('Invalid admin credentials.');
      }
    }

    return sanitizeUser(user);
  },

  register(payload: RegisterPayload) {
    const state = readState();
    const exists = state.users.some((item) => item.email.toLowerCase() === payload.email.toLowerCase());
    if (exists) {
      throw new Error('Email already exists.');
    }

    const created: StoredUser = {
      _id: makeId('u'),
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role ?? 'buyer',
    };

    state.users.push(created);
    writeState(state);
    return sanitizeUser(created);
  },

  getUsers() {
    return readState().users.map(sanitizeUser);
  },

  getLandlords() {
    return readState()
      .users.filter((item) => item.role === 'landlord')
      .map(sanitizeUser);
  },

  updateUserName(userId: string, name: string) {
    const state = readState();
    const user = state.users.find((item) => item._id === userId);
    if (!user) {
      throw new Error('User not found.');
    }

    user.name = name;
    writeState(state);
    return sanitizeUser(user);
  },

  getProperties(filters?: PropertyFilters) {
    const state = readState();
    let result = [...state.properties];

    if (filters?.search) {
      const text = filters.search.toLowerCase();
      result = result.filter((item) => `${item.title} ${item.location} ${item.propertyType}`.toLowerCase().includes(text));
    }

    return result;
  },

  getPropertyById(id: string) {
    const state = readState();
    return state.properties.find((item) => item._id === id) ?? null;
  },

  addProperty(ownerId: string, payload: Omit<Property, '_id' | 'status'>) {
    const state = readState();
    const created: Property = {
      ...payload,
      _id: makeId('p'),
      status: 'available',
      ownerId,
      createdAt: new Date().toISOString(),
    };

    state.properties.unshift(created);
    writeState(state);
    return created;
  },

  updateProperty(propertyId: string, payload: Partial<Property>) {
    const state = readState();
    const property = state.properties.find((item) => item._id === propertyId);
    if (!property) {
      throw new Error('Property not found.');
    }

    Object.assign(property, payload);
    writeState(state);
    return property;
  },

  deleteProperty(propertyId: string) {
    const state = readState();
    state.properties = state.properties.filter((item) => item._id !== propertyId);
    writeState(state);
  },

  buyProperty(propertyId: string, buyerId: string) {
    const state = readState();
    const property = state.properties.find((item) => item._id === propertyId);

    if (!property) {
      throw new Error('Property not found.');
    }

    if (property.status === 'sold') {
      throw new Error('Property is already sold.');
    }

    property.status = 'sold';
    property.buyerId = buyerId;

    const payment: PaymentRecord = {
      id: makeId('pay'),
      propertyId,
      buyerId,
      amount: property.price,
      status: 'paid',
      createdAt: new Date().toISOString(),
    };

    state.payments.unshift(payment);
    writeState(state);
    return payment;
  },

  createInquiry(payload: CreateInquiryPayload, currentUser?: User) {
    const state = readState();
    const property = state.properties.find((item) => item._id === payload.propertyId);
    if (!property) {
      throw new Error('Property not found.');
    }

    const inquiry: Inquiry = {
      id: makeId('inq'),
      propertyId: payload.propertyId,
      fullName: payload.fullName,
      email: payload.email,
      message: payload.message,
      inquiryType: payload.inquiryType,
      status: 'open',
      createdAt: new Date().toISOString(),
      userId: currentUser?._id,
      ownerId: resolveOwnerId(property.ownerId),
    };

    state.inquiries.unshift(inquiry);
    writeState(state);
    return inquiry;
  },

  getInquiries() {
    return readState().inquiries;
  },

  updateInquiryStatus(id: string, status: 'open' | 'closed') {
    const state = readState();
    const inquiry = state.inquiries.find((item) => item.id === id);
    if (!inquiry) {
      throw new Error('Inquiry not found.');
    }

    inquiry.status = status;
    writeState(state);
    return inquiry;
  },

  getPayments() {
    return readState().payments;
  },
};
