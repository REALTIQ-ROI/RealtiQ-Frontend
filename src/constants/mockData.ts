import type { Inquiry, Property, User } from '../types';

export const mockProperties: Property[] = [
  {
    _id: 'p-1',
    title: 'The Glass Pavilion',
    price: 18450000000,
    location: 'Banana Island, Lagos',
    propertyType: 'Villa',
    bedrooms: 5,
    bathrooms: 6.5,
    description:
      'A modern architectural masterpiece with floor-to-ceiling glass walls and panoramic lagoon views. Set on a premier plot in Banana Island, this villa fuses cutting-edge engineering with refined comfort, offering expansive living spaces, a private cinema, and meticulously landscaped gardens.',
    squareFeet: 8450,
    media: [
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBF3QwvyZxz9yhRiWx581C2m64oj1HLyqxO3M9WTrF4DrbWVScdJjyz5PGxq80gaAukoVtK8L1UH11OHDwZCBpB3hizBChtsoUZgyiBHVws29sXgpt2NUS-gs8lanYurwi-3Ph7d5j6S22gTxP_Xn4Hac5_HXccg2iPo2of9wOZ0gr0mfFaOWPaHt-wyNxqZgwg3ScjhJnToNeRyoIZos3SCB1TKjiMLB99cudajxIf3NrD3RzdgIVh_6NVW-1PH0wCx06iGy_Zug',
        public_id: 'p1-main',
        type: 'image',
      },
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDH-MXb5ulzDFqy-EMh-fAJofZvkSqT8OEAp-WHjGmjObhc2VDwcO81FuuEpGD7Q5AsPO9Puw7WjJy1sa1vHacSmSEYjBnVbMBeZG_QPKWN_mfM8QgHNbSI_WoefHzULaYgKW1A4tQ7ch--re0IjLwNEEvFbnCkD51jObvYsFrHJNuCz_4nM6jYtfFI6iWewLMqY_yenBLnKWJS2r4FJnitYiSE_J3E59x-LMhcAkLyEI8LXho624DX8Al3hP0F2HzQedI662T0Jg',
        public_id: 'p1-alt',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
        public_id: 'p1-living',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200&q=80',
        public_id: 'p1-kitchen',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1584738766473-61c083514bf4?w=1200&q=80',
        public_id: 'p1-bath',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&q=80',
        public_id: 'p1-pool',
        type: 'image',
      },
    ],
    status: 'available',
    featured: true,
    amenities: [
      'Private Cinema',
      'Infinity Pool',
      'Smart Home Automation',
      'Home Gym',
      '5-Car Garage',
      'Wine Cellar',
      'Staff Quarters',
      'Solar Power System',
      'CCTV & Security',
      'Rooftop Terrace',
    ],
  },
  {
    _id: 'p-2',
    title: 'The Obsidian House',
    price: 12450000000,
    location: 'Eko Atlantic, Lagos',
    propertyType: 'Estate',
    bedrooms: 5,
    bathrooms: 6,
    description:
      'A sculptural residence balancing dark concrete forms with warm interior palettes. Located on Eko Atlantic, this estate commands dramatic ocean views and delivers a seamless indoor-outdoor lifestyle, complete with a resort-style pool, private spa, and a dedicated art gallery wing.',
    squareFeet: 8200,
    media: [
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCW1b4FqPGmqmeY55_3DmIkYZppItdf4BONT9K3h9Chogho8LpD3K25Ozc2vrOOy8jnmnDcdz2kQPm9SRjDSsw_kORH_mFg2sS7t8G_XACaWZWRKvVK95WuaJGR285vcJeGpB-s1gkzgV47C4uPbdF3ToImr7C_hIfRNv7C-aTGlrzhMPOAnhQY8s_Th_nC6ndF3bZ1UGPFU_4tr5rOwG-Gvi2DX8mGqjT4kC1on_MugegV_-ks3Mz5Dq5bvr22mXYh03OolLPFqA',
        public_id: 'p2-main',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
        public_id: 'p2-exterior',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
        public_id: 'p2-outdoor',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=1200&q=80',
        public_id: 'p2-dining',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
        public_id: 'p2-bedroom',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1200&q=80',
        public_id: 'p2-pool',
        type: 'image',
      },
    ],
    status: 'available',
    featured: true,
    amenities: [
      'Wine Cellar',
      'Spa & Hammam',
      'Home Theater',
      'Art Gallery Wing',
      'Ocean View Deck',
      'Smart Home System',
      'Generator Backup',
      'Private Gym',
      'Guard House',
      'Landscaped Gardens',
    ],
  },
  {
    _id: 'p-3',
    title: 'Skyline Anthology',
    price: 9250000000,
    location: 'Victoria Island, Lagos',
    propertyType: 'Penthouse',
    bedrooms: 3,
    bathrooms: 3.5,
    description:
      'A high-rise penthouse with expansive Victoria Island city views and premium finishes throughout. Floor-to-ceiling glazing wraps every room, blurring the boundary between interior luxury and the Lagos skyline. Featuring a private rooftop terrace, chef\'s kitchen, and concierge services.',
    squareFeet: 3800,
    media: [
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCe0hGYKCBlpm-meCyxKKw3T5UJiXxXt75EG3aPoc_wx70H5KBi1llkCjV6dHTN_C8enyYSMs-eFJr5G0ZdQaMd29o80-1V7MHMprJ_wziRgWMLK7GHfQHI19Nt0VvcgCH-7DR6vF_eicX_JMKs0HwayH98zCVofL3nExtAx8PSkH8UcYwWoLpTTMnpTYK-NCxlY0I3gOxg0GV2vloJNSuy8DQvzyq8CyCd-lLmLwwT-brso5cfftPLgANMIpZfFUvE1wBxVVqHXA',
        public_id: 'p3-main',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200&q=80',
        public_id: 'p3-terrace',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1200&q=80',
        public_id: 'p3-bedroom',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1529408632839-a54952c491e5?w=1200&q=80',
        public_id: 'p3-view',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200&q=80',
        public_id: 'p3-kitchen',
        type: 'image',
      },
      {
        url: 'https://images.unsplash.com/photo-1584738766473-61c083514bf4?w=1200&q=80',
        public_id: 'p3-bath',
        type: 'image',
      },
    ],
    status: 'available',
    featured: false,
    amenities: [
      'City View Rooftop Terrace',
      'Smart Access & Security',
      '24/7 Concierge',
      "Chef's Kitchen",
      'Residents Lounge',
      'Underground Parking',
      'High-Speed Elevator',
      'Fitness Center Access',
      'On-site Management',
      'Backup Power',
    ],
  },
];

export const mockUser: User = {
  _id: 'u-1',
  name: 'Jane Curator',
  email: 'curator@realtiq.com',
  role: 'buyer',
};

export const mockInquiries: Inquiry[] = [
  {
    id: 'inq-1',
    propertyId: 'p-1',
    fullName: 'Jane Curator',
    email: 'curator@realtiq.com',
    message: 'I would like to schedule a private tour.',
    inquiryType: 'Schedule a Private Viewing',
    status: 'open',
    createdAt: new Date().toISOString(),
  },
];
