// Mock data for SmartLogBook entities
// Organized with proper relationships and realistic data structure

// ============================================================================
// BASE ENTITIES (Independent entities)
// ============================================================================

export const mockUsers = [
  {
    id: 1,
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean.dupont@kit.com",
    role: "conductor" as const,
    department: "Conduite",
    status: "active" as "active" | "pending" | "suspended",
    isAdmin: false,
    isMember: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastLogin: "2024-01-15T10:30:00Z"
  },
  {
    id: 2,
    firstName: "Marie",
    lastName: "Martin",
    email: "marie.martin@kit.com",
    role: "manager" as const,
    department: "Maintenance",
    status: "active" as "active" | "pending" | "suspended",
    isAdmin: false,
    isMember: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastLogin: "2024-01-14T15:45:00Z"
  },
  {
    id: 3,
    firstName: "Pierre",
    lastName: "Durand",
    email: "pierre.durand@kit.com",
    role: "administrator" as const,
    department: "IT",
    status: "active" as "active" | "pending" | "suspended",
    isAdmin: true,
    isMember: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastLogin: "2024-01-16T09:20:00Z"
  },
  {
    id: 4,
    firstName: "Admin",
    lastName: "User",
    email: "admin@kit.com",
    role: "administrator" as const,
    department: "Administration",
    status: "active" as "active" | "pending" | "suspended",
    isAdmin: true,
    isMember: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastLogin: "2024-01-16T11:00:00Z"
  },
  {
    id: 5,
    firstName: "Sophie",
    lastName: "Bernard",
    email: "sophie.bernard@kit.com",
    role: "conductor" as const,
    department: "Conduite",
    status: "active" as "active" | "pending" | "suspended",
    isAdmin: false,
    isMember: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    lastLogin: "2024-01-15T08:15:00Z"
  }
];

export const mockLocomotiveModels = [
  {
    id: 1,
    name: "G1000",
    description: "Modèle de locomotive G1000 - Série principale",
    manufacturer: "Alstom",
    type: "Diesel",
    power: "3000kW",
    status: "active",
    attributes: {
      weight: "120t",
      max_speed: "160km/h",
      fuel_type: "Diesel",
      year_introduced: 2015,
      max_load: "2000t",
      fuel_capacity: "5000L",
      engine_type: "V12 Diesel",
      transmission: "Automatic",
      braking_system: "Pneumatic",
      safety_features: ["ABS", "Emergency Brake", "Fire Suppression"]
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "G2000",
    description: "Modèle de locomotive G2000 - Série nouvelle génération",
    manufacturer: "Siemens",
    type: "Diesel",
    power: "4000kW",
    status: "active",
    attributes: {
      weight: "140t",
      max_speed: "180km/h",
      fuel_type: "Diesel",
      year_introduced: 2020,
      max_load: "2500t",
      fuel_capacity: "6000L",
      engine_type: "V16 Diesel",
      transmission: "Automatic",
      braking_system: "Electro-pneumatic",
      safety_features: ["ABS", "Emergency Brake", "Fire Suppression", "GPS Tracking"]
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    name: "E3000",
    description: "Modèle de locomotive électrique E3000",
    manufacturer: "Bombardier",
    type: "Electric",
    power: "5000kW",
    status: "active",
    attributes: {
      weight: "130t",
      max_speed: "200km/h",
      fuel_type: "Electric",
      year_introduced: 2022,
      max_load: "3000t",
      voltage: "25kV AC",
      pantograph: "Single-arm",
      transmission: "Electric",
      braking_system: "Regenerative",
      safety_features: ["ABS", "Emergency Brake", "Fire Suppression", "GPS Tracking", "Remote Monitoring"]
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    name: "H4000",
    description: "Modèle de locomotive hybride H4000",
    manufacturer: "GE Transportation",
    type: "Hybrid",
    power: "3500kW",
    status: "maintenance",
    attributes: {
      weight: "135t",
      max_speed: "170km/h",
      fuel_type: "Hybrid Diesel/Electric",
      year_introduced: 2021,
      max_load: "2200t",
      fuel_capacity: "4000L",
      battery_capacity: "500kWh",
      engine_type: "V12 Diesel + Electric Motor",
      transmission: "Hybrid Automatic",
      braking_system: "Regenerative + Pneumatic",
      safety_features: ["ABS", "Emergency Brake", "Fire Suppression", "GPS Tracking", "Battery Management"]
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    name: "S5000",
    description: "Modèle de locomotive à vapeur moderne S5000",
    manufacturer: "Heritage Rail",
    type: "Steam",
    power: "2000kW",
    status: "retired",
    attributes: {
      weight: "200t",
      max_speed: "120km/h",
      fuel_type: "Coal",
      year_introduced: 2018,
      max_load: "1500t",
      coal_capacity: "8000kg",
      water_capacity: "15000L",
      boiler_pressure: "15 bar",
      wheel_arrangement: "2-8-2",
      braking_system: "Steam Brake",
      safety_features: ["Steam Whistle", "Safety Valves", "Fire Suppression"]
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

export const mockLocations = [
  {
    id: 1,
    name: "Cabine conducteur",
    code: "01-I-25",
    level_1: "01",
    level_2: "I",
    level_3: "25",
    level_4: "",
    description: "Zone cabine du conducteur avec panneau de contrôle",
    parent_id: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Moteur principal",
    code: "02-II-30",
    level_1: "02",
    level_2: "II",
    level_3: "30",
    level_4: "",
    description: "Compartiment moteur principal",
    parent_id: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    name: "Système de freinage",
    code: "03-III-35",
    level_1: "03",
    level_2: "III",
    level_3: "35",
    level_4: "",
    description: "Système de freinage pneumatique",
    parent_id: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    name: "Système électrique",
    code: "04-IV-40",
    level_1: "04",
    level_2: "IV",
    level_3: "40",
    level_4: "",
    description: "Compartiment système électrique",
    parent_id: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    name: "Système de refroidissement",
    code: "05-V-45",
    level_1: "05",
    level_2: "V",
    level_3: "45",
    level_4: "",
    description: "Système de refroidissement moteur",
    parent_id: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

export const mockEvents = [
  {
    id: 1,
    type: "PC",
    event_name: "Préparation courante",
    description: "Inspection de préparation courante avant départ",
    category: "inspection",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    type: "RS",
    event_name: "Remise en service",
    description: "Inspection de remise en service après maintenance",
    category: "inspection",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    type: "VAR",
    event_name: "Visite à l'arrivée",
    description: "Inspection à l'arrivée en gare",
    category: "inspection",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    type: "MES",
    event_name: "Maintenance en service",
    description: "Maintenance pendant le service",
    category: "maintenance",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    type: "REV",
    event_name: "Révision périodique",
    description: "Révision périodique programmée",
    category: "maintenance",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

export const mockOperationTypes = [
  {
    id: 1,
    name: "Vérification mécanique",
    description: "Opérations de vérification mécanique des systèmes",
    category: "maintenance",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Contrôle électrique",
    description: "Opérations de contrôle électrique et électronique",
    category: "inspection",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    name: "Test pneumatique",
    description: "Opérations de test des systèmes pneumatiques",
    category: "testing",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    name: "Inspection visuelle",
    description: "Opérations d'inspection visuelle générale",
    category: "inspection",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    name: "Mise à niveau système",
    description: "Opérations de mise à niveau des systèmes",
    category: "upgrade",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 6,
    name: "Réparation d'urgence",
    description: "Opérations de réparation d'urgence",
    category: "repair",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

export const mockActionTypes = [
  {
    id: 1,
    name: "Start",
    description: "Action de démarrage de système ou équipement",
    category: "maintenance",
    is_deletable: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Stop",
    description: "Action d'arrêt de système ou équipement",
    category: "maintenance",
    is_deletable: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    name: "Check",
    description: "Action de vérification et contrôle",
    category: "inspection",
    is_deletable: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    name: "Capture",
    description: "Action de capture d'image ou documentation",
    category: "inspection",
    is_deletable: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    name: "Test",
    description: "Action de test et validation",
    category: "testing",
    is_deletable: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 6,
    name: "Repair",
    description: "Action de réparation et maintenance corrective",
    category: "repair",
    is_deletable: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

// ============================================================================
// DEPENDENT ENTITIES (Entities with foreign keys)
// ============================================================================

export const mockLocomotives = [
  {
    id: 1,
    model_id: 1,
    number: "G1000-1023",
    status: "active" as const,
    current_location_id: 1, // Currently at Cabine conducteur
    commissioning_date: "2020-03-15T00:00:00Z",
    last_maintenance: "2024-01-10T00:00:00Z",
    next_maintenance: "2024-04-10T00:00:00Z",
    mileage: 125000,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    model_id: 1,
    number: "G1000-1024",
    status: "active" as const,
    current_location_id: 2, // Currently at Moteur principal
    commissioning_date: "2020-06-20T00:00:00Z",
    last_maintenance: "2024-01-05T00:00:00Z",
    next_maintenance: "2024-04-05T00:00:00Z",
    mileage: 118000,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    model_id: 2,
    number: "G2000-2001",
    status: "maintenance" as const,
    current_location_id: 3, // Currently at Système de freinage
    commissioning_date: "2022-01-10T00:00:00Z",
    last_maintenance: "2024-01-15T00:00:00Z",
    next_maintenance: "2024-07-15T00:00:00Z",
    mileage: 85000,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    model_id: 2,
    number: "G2000-2002",
    status: "active" as const,
    current_location_id: 4, // Currently at Système électrique
    commissioning_date: "2022-03-25T00:00:00Z",
    last_maintenance: "2024-01-12T00:00:00Z",
    next_maintenance: "2024-07-12T00:00:00Z",
    mileage: 92000,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    model_id: 3,
    number: "E3000-3001",
    status: "active" as const,
    current_location_id: 5, // Currently at Système de refroidissement
    commissioning_date: "2023-09-15T00:00:00Z",
    last_maintenance: "2024-01-08T00:00:00Z",
    next_maintenance: "2024-07-08T00:00:00Z",
    mileage: 45000,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 6,
    model_id: 3,
    number: "E3000-3002",
    status: "active" as const,
    current_location_id: 1,
    commissioning_date: "2023-11-20T00:00:00Z",
    last_maintenance: "2024-01-20T00:00:00Z",
    next_maintenance: "2024-07-20T00:00:00Z",
    mileage: 32000,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 7,
    model_id: 4,
    number: "H4000-4001",
    status: "maintenance" as const,
    current_location_id: 2,
    commissioning_date: "2022-05-10T00:00:00Z",
    last_maintenance: "2024-01-18T00:00:00Z",
    next_maintenance: "2024-08-18T00:00:00Z",
    mileage: 75000,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 8,
    model_id: 4,
    number: "H4000-4002",
    status: "active" as const,
    current_location_id: 3,
    commissioning_date: "2022-08-15T00:00:00Z",
    last_maintenance: "2024-01-14T00:00:00Z",
    next_maintenance: "2024-08-14T00:00:00Z",
    mileage: 68000,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 9,
    model_id: 5,
    number: "S5000-5001",
    status: "retired" as const,
    current_location_id: 4,
    commissioning_date: "2019-03-01T00:00:00Z",
    last_maintenance: "2023-12-01T00:00:00Z",
    next_maintenance: null,
    mileage: 180000,
    isActive: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 10,
    model_id: 1,
    number: "G1000-1025",
    status: "active" as const,
    current_location_id: 5,
    commissioning_date: "2021-02-28T00:00:00Z",
    last_maintenance: "2024-01-22T00:00:00Z",
    next_maintenance: "2024-04-22T00:00:00Z",
    mileage: 95000,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

export const mockObjects = [
  {
    id: 1,
    code: "OBJ-001",
    name: "Voyants de défaut",
    description: "Indicateurs lumineux pour signaler les défauts",
    localizations: [
      { id: 1, name: "Cabine", code: "01-I-25", description: null, levels: ["01", "I", "25"] }
    ],
    media: null,
    attributes: [
      { key: "type", value: "indicator" },
      { key: "voltage", value: "24V" },
      { key: "color", value: "red" }
    ],
    isDeletable: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    code: "OBJ-002",
    name: "Organe boîte d'essieux",
    description: "Composant mécanique de la boîte d'essieux",
    localizations: [
      { id: 2, name: "Moteur", code: "02-A-15", description: null, levels: ["02", "A", "15"] }
    ],
    media: null,
    attributes: [
      { key: "type", value: "mechanical" },
      { key: "material", value: "steel" },
      { key: "weight", value: "150kg" }
    ],
    isDeletable: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    code: "OBJ-003",
    name: "Pare-brise",
    description: "Vitre de protection du conducteur",
    localizations: [
      { id: 1, name: "Cabine", code: "01-I-25", description: null, levels: ["01", "I", "25"] }
    ],
    media: {
      id: 1,
      fileName: "pare-brise.jpg",
      contentType: "image/jpeg",
      url: "/media/pare-brise.jpg",
      createdAt: "2024-01-01T00:00:00Z"
    },
    attributes: [
      { key: "type", value: "glass" },
      { key: "thickness", value: "8mm" },
      { key: "material", value: "tempered" }
    ],
    isDeletable: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z"
  },
  {
    id: 4,
    code: "OBJ-004",
    name: "Jalon d'arrêt à main",
    description: "Système de freinage à main",
    localizations: [
      { id: 3, name: "Freinage", code: "03-B-10", description: null, levels: ["03", "B", "10"] }
    ],
    media: null,
    attributes: [
      { key: "type", value: "brake" },
      { key: "position", value: "manual" },
      { key: "pressure", value: "5bar" }
    ],
    isDeletable: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    code: "OBJ-005",
    name: "Interrupteur principal",
    description: "Interrupteur principal de la cabine",
    localizations: [
      { id: 1, name: "Cabine", code: "01-I-25", description: null, levels: ["01", "I", "25"] }
    ],
    media: null,
    attributes: [
      { key: "type", value: "switch" },
      { key: "voltage", value: "24V" },
      { key: "current", value: "100A" }
    ],
    isDeletable: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: 6,
    code: "OBJ-006",
    name: "Générateur électrique",
    description: "Générateur électrique principal",
    localizations: [
      { id: 4, name: "Électrique", code: "04-C-20", description: null, levels: ["04", "C", "20"] }
    ],
    media: null,
    attributes: [
      { key: "type", value: "generator" },
      { key: "power", value: "500kW" },
      { key: "voltage", value: "400V" }
    ],
    isDeletable: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: 7,
    code: "OBJ-007",
    name: "Radiateur moteur",
    description: "Système de refroidissement moteur",
    localizations: [
      { id: 5, name: "Refroidissement", code: "05-D-30", description: null, levels: ["05", "D", "30"] }
    ],
    media: null,
    attributes: [
      { key: "type", value: "radiator" },
      { key: "capacity", value: "50L" },
      { key: "material", value: "aluminum" }
    ],
    isDeletable: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  }
];

export const mockActionRefTypes = [
  {
    id: 1,
    name: "Démarrage moteur principal",
    description: "Action de démarrage du moteur principal selon procédure standard",
    actionTypeId: 1,
    isDeletable: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Arrêt d'urgence",
    description: "Action d'arrêt d'urgence du système complet",
    actionTypeId: 2,
    isDeletable: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    name: "Vérification pression freins",
    description: "Vérification de la pression des freins pneumatiques",
    actionTypeId: 3,
    isDeletable: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    name: "Capture défaut visuel",
    description: "Capture d'image en cas de défaut détecté",
    actionTypeId: 4,
    isDeletable: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    name: "Test générateur",
    description: "Test de fonctionnement du générateur électrique",
    actionTypeId: 5,
    isDeletable: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 6,
    name: "Réparation voyant",
    description: "Réparation ou remplacement de voyant de défaut",
    actionTypeId: 6,
    isDeletable: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

export const mockChecklists = [
  {
    id: 1,
    title: "Préparation courante (PC) US",
    name: "PC",
    description: "Checklist de préparation courante pour unité simple",
    type: "Checklist",
    checklist_type: 1,
    eventId: 1,
    locomotiveModelId: 1,
    locomotiveNumber: 1023,
    version: "1.0",
    status: "active",
    validFrom: "2024-01-01T00:00:00Z",
    validTo: "2024-12-31T23:59:59Z",
    created_by: 1,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    title: "Visite à l'arrivée (VAR) UM",
    name: "VAR",
    description: "Checklist de visite à l'arrivée pour unité multiple",
    type: "Checklist",
    checklist_type: 1,
    eventId: 3,
    locomotiveModelId: 1,
    locomotiveNumber: 1024,
    version: "1.0",
    status: "active",
    validFrom: "2024-01-01T00:00:00Z",
    validTo: "2024-12-31T23:59:59Z",
    created_by: 2,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    title: "Remise en service (RS) UM",
    name: "RS",
    description: "Checklist de remise en service pour unité multiple",
    type: "Checklist",
    checklist_type: 1,
    eventId: 2,
    locomotiveModelId: 2,
    locomotiveNumber: 2001,
    version: "1.0",
    status: "draft",
    validFrom: "2024-01-01T00:00:00Z",
    validTo: "2024-12-31T23:59:59Z",
    created_by: 2,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    title: "Maintenance en service (MES) US",
    name: "MES",
    description: "Checklist de maintenance en service pour unité simple",
    type: "Checklist",
    checklist_type: 1,
    eventId: 4,
    locomotiveModelId: 1,
    locomotiveNumber: 1025,
    version: "1.0",
    status: "inactive",
    validFrom: "2024-01-01T00:00:00Z",
    validTo: "2024-12-31T23:59:59Z",
    created_by: 1,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

export const mockActions = [
  {
    id: 1,
    actionReferenceId: 1,
    localisationId: 1,
    operationId: 1,
    sequence: 1,
    comment: "Démarrage du moteur principal",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: null,
    isDeletable: true
  },
  {
    id: 2,
    actionReferenceId: 2,
    localisationId: 2,
    operationId: 1,
    sequence: 2,
    comment: "Arrêt d'urgence du système",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
    isDeletable: true
  },
  {
    id: 3,
    actionReferenceId: 1,
    localisationId: 3,
    operationId: 2,
    sequence: 1,
    comment: "Vérification de la température des boîtes d'essieux",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: null,
    isDeletable: true
  },
  {
    id: 4,
    actionReferenceId: 3,
    localisationId: 1,
    operationId: 2,
    sequence: 2,
    comment: "Capture d'image en cas de défaut détecté",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: null,
    isDeletable: false
  },
  {
    id: 5,
    actionReferenceId: 2,
    localisationId: 2,
    operationId: 3,
    sequence: 1,
    comment: "Test de fonctionnement du générateur",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-03T00:00:00Z",
    isDeletable: true
  }
];

export const mockActs = [
  {
    id: 1,
    name: "Acte de démarrage",
    description: "Acte de démarrage du moteur principal",
    status: "completed",
    created_by: 1,
    locomotive_id: 1,
    location_id: 1,
    checklist_id: 1,
    started_at: "2024-01-15T08:00:00Z",
    completed_at: "2024-01-15T08:15:00Z",
    duration: 15,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Acte de vérification",
    description: "Acte de vérification des freins",
    status: "in_progress",
    created_by: 2,
    locomotive_id: 2,
    location_id: 3,
    checklist_id: 2,
    started_at: "2024-01-15T09:00:00Z",
    completed_at: null,
    duration: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    name: "Acte d'arrêt",
    description: "Acte d'arrêt d'urgence",
    status: "pending",
    created_by: 1,
    locomotive_id: 3,
    location_id: 2,
    checklist_id: 3,
    started_at: null,
    completed_at: null,
    duration: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    name: "Acte de maintenance",
    description: "Acte de maintenance préventive",
    status: "completed",
    created_by: 2,
    locomotive_id: 4,
    location_id: 4,
    checklist_id: 4,
    started_at: "2024-01-14T14:00:00Z",
    completed_at: "2024-01-14T15:30:00Z",
    duration: 90,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    name: "Acte de contrôle",
    description: "Acte de contrôle électrique",
    status: "completed",
    created_by: 1,
    locomotive_id: 5,
    location_id: 4,
    checklist_id: 1,
    started_at: "2024-01-16T10:00:00Z",
    completed_at: "2024-01-16T10:20:00Z",
    duration: 20,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

export const mockAnomalies = [
  {
    id: 1,
    title: "Voyant de défaut clignotant",
    description: "Le voyant de défaut clignote de manière intermittente, indiquant un problème électrique",
    severity: "medium",
    status: "open",
    checklist_id: 1,
    created_by: 1,
    reported_by: 1,
    assigned_to: 2,
    locomotive_id: 1,
    location_id: 1,
    object_id: 1,
    defect_code: "DEF001",
    detail: "Voyant de défaut clignotant",
    detected_at: "2024-01-15T08:30:00Z",
    reported_at: "2024-01-15T08:30:00Z",
    resolved_at: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    title: "Température élevée de la boîte d'essieux",
    description: "La température de la boîte d'essieux dépasse les limites normales de fonctionnement",
    severity: "high",
    status: "resolved",
    checklist_id: 2,
    created_by: 1,
    reported_by: 1,
    assigned_to: 3,
    locomotive_id: 2,
    location_id: 2,
    object_id: 2,
    defect_code: "OBS05",
    detail: "Température élevée de la boîte d'essieux",
    detected_at: "2024-01-15T09:15:00Z",
    reported_at: "2024-01-15T09:15:00Z",
    resolved_at: "2024-01-15T11:30:00Z",
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    title: "Fissure dans le pare-brise",
    description: "Une fissure de 5cm a été détectée dans le pare-brise côté conducteur",
    severity: "high",
    status: "in_progress",
    checklist_id: 2,
    created_by: 2,
    reported_by: 2,
    assigned_to: 1,
    locomotive_id: 3,
    location_id: 1,
    object_id: 3,
    defect_code: "OBS07",
    detail: "Fissure dans le pare-brise",
    detected_at: "2024-01-16T10:45:00Z",
    reported_at: "2024-01-16T10:45:00Z",
    resolved_at: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    title: "Problème de freinage à main",
    description: "Le système de freinage à main ne répond pas correctement aux commandes",
    severity: "critical",
    status: "open",
    checklist_id: 1,
    created_by: 1,
    reported_by: 1,
    assigned_to: 2,
    locomotive_id: 1,
    location_id: 3,
    object_id: 4,
    defect_code: "DEF003",
    detail: "Problème de freinage à main",
    detected_at: "2024-01-16T14:20:00Z",
    reported_at: "2024-01-16T14:20:00Z",
    resolved_at: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    title: "Générateur électrique défaillant",
    description: "Le générateur électrique principal ne produit pas la tension nominale",
    severity: "critical",
    status: "open",
    checklist_id: 4,
    created_by: 2,
    reported_by: 2,
    assigned_to: 3,
    locomotive_id: 4,
    location_id: 4,
    object_id: 6,
    defect_code: "ELEC001",
    detail: "Générateur électrique défaillant",
    detected_at: "2024-01-17T08:15:00Z",
    reported_at: "2024-01-17T08:15:00Z",
    resolved_at: null,
    isActive: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

export const mockOperations = [
  {
    id: 1,
    name: "Engine Startup Operation",
    description: "Complete engine startup sequence for locomotive operation",
    operationTypeId: 1,
    operationType: {
      id: 1,
      name: "Maintenance",
      description: "Maintenance operations",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: null,
      isDeletable: true
    },
    procedureId: 1,
    operationStatusId: 2,
    sequence: 1,
    comments: "Startup completed successfully",
    from: "2024-01-15T08:00:00Z",
    to: "2024-01-15T08:15:00Z",
    actions: [],
    questions: [],
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-01-15T08:15:00Z",
    isDeletable: true
  },
  {
    id: 2,
    name: "Brake System Inspection",
    description: "Routine inspection of pneumatic brake system",
    operationTypeId: 2,
    operationType: {
      id: 2,
      name: "Inspection",
      description: "Inspection operations",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: null,
      isDeletable: true
    },
    procedureId: 1,
    operationStatusId: 1,
    sequence: 2,
    comments: null,
    from: "2024-01-16T09:00:00Z",
    to: null,
    actions: [],
    questions: [],
    createdAt: "2024-01-16T09:00:00Z",
    updatedAt: "2024-01-16T09:00:00Z",
    isDeletable: true
  },
  {
    id: 3,
    name: "Control Panel Testing",
    description: "Comprehensive testing of control panel functions",
    operationTypeId: 3,
    operationType: {
      id: 3,
      name: "Testing",
      description: "Testing operations",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: null,
      isDeletable: true
    },
    procedureId: 2,
    operationStatusId: 1,
    sequence: 1,
    comments: "Pending initial setup",
    from: null,
    to: null,
    actions: [],
    questions: [],
    createdAt: "2024-01-17T10:00:00Z",
    updatedAt: "2024-01-17T10:00:00Z",
    isDeletable: true
  },
  {
    id: 4,
    name: "Generator Maintenance",
    description: "Routine maintenance of electrical generator",
    operationTypeId: 1,
    operationType: {
      id: 1,
      name: "Maintenance",
      description: "Maintenance operations",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: null,
      isDeletable: true
    },
    procedureId: 2,
    operationStatusId: 2,
    sequence: 3,
    comments: "Maintenance completed",
    from: "2024-01-14T14:00:00Z",
    to: "2024-01-14T14:45:00Z",
    actions: [],
    questions: [],
    createdAt: "2024-01-14T14:00:00Z",
    updatedAt: "2024-01-14T14:45:00Z",
    isDeletable: true
  },
  {
    id: 5,
    name: "Safety System Check",
    description: "Comprehensive safety system verification",
    operationTypeId: 2,
    operationType: {
      id: 2,
      name: "Inspection",
      description: "Inspection operations",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: null,
      isDeletable: true
    },
    procedureId: 1,
    operationStatusId: 2,
    sequence: 3,
    comments: "All systems verified",
    from: "2024-01-15T11:00:00Z",
    to: "2024-01-15T11:25:00Z",
    actions: [],
    questions: [],
    createdAt: "2024-01-15T11:00:00Z",
    updatedAt: "2024-01-15T11:25:00Z",
    isDeletable: true
  }
];

// ============================================================================
// ADDITIONAL ENTITIES
// ============================================================================

export const mockAssetItems = [
  {
    id: 1,
    assetModelId: 1,
    assetModel: {
      id: 1,
      label: 'G1000 Engine Block'
    },
    statusId: 1 as const,
    identifier: 'ENG-G1000-001',
    attributes: [
      { key: 'Power', value: '2000 kW' },
      { key: 'Weight', value: '5000 kg' }
    ],
    comment: 'Primary engine block for locomotive operations',
    isDeletable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    assetModelId: 2,
    assetModel: {
      id: 2,
      label: 'Pneumatic Brake System'
    },
    statusId: 1 as const,
    identifier: 'BRK-SYS-002',
    attributes: [
      { key: 'Pressure', value: '5 bar' },
      { key: 'Weight', value: '800 kg' }
    ],
    comment: 'High-pressure pneumatic brake system',
    isDeletable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    assetModelId: 3,
    assetModel: {
      id: 3,
      label: 'Control Panel'
    },
    statusId: 2 as const,
    identifier: 'CTRL-PNL-003',
    attributes: [
      { key: 'Type', value: 'Touch Screen' },
      { key: 'Dimensions', value: '1.2m x 0.8m' }
    ],
    comment: 'Touch screen control interface',
    isDeletable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export const mockAssetModels = [
  {
    id: 1,
    name: 'G1000 Engine Block',
    description: 'Main engine block for G1000 locomotive series',
    attributes: [
      { key: 'Power', value: '2000 kW' },
      { key: 'Weight', value: '5000 kg' },
      { key: 'Dimensions', value: '2.5m x 1.8m x 1.2m' },
      { key: 'Fuel Type', value: 'Diesel' },
      { key: 'Cylinders', value: '12' }
    ],
    comment: 'High-performance engine block for heavy-duty locomotives',
    isDeletable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Pneumatic Brake System',
    description: 'Complete pneumatic brake system unit',
    attributes: [
      { key: 'Pressure', value: '5 bar' },
      { key: 'Weight', value: '800 kg' },
      { key: 'Dimensions', value: '1.2m x 0.8m x 0.6m' },
      { key: 'Type', value: 'Pneumatic' },
      { key: 'Response Time', value: '0.5s' }
    ],
    comment: 'Reliable brake system with fast response time',
    isDeletable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'Control Panel Unit',
    description: 'Main control panel for locomotive operations',
    attributes: [
      { key: 'Voltage', value: '24V DC' },
      { key: 'Weight', value: '150 kg' },
      { key: 'Dimensions', value: '1.0m x 0.6m x 0.3m' },
      { key: 'Display', value: 'Touch Screen' },
      { key: 'Interfaces', value: 'CAN, Ethernet' }
    ],
    comment: 'Modern touch-screen control interface',
    isDeletable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export const mockActionReferences = [
  {
    id: 1,
    actionRefType: {
      id: 1,
      name: 'Check',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: null,
      isDeletable: false
    },
    actionRefTypeId: 1,
    act: {
      id: 1,
      name: 'Inspection',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: null,
      isDeletable: false
    },
    actId: 1,
    response: {
      id: 1,
      description: 'Temperature reading in Celsius',
      responseTypeId: 1,
      options: ['Normal', 'High', 'Low'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: null,
      isDeletable: false
    },
    responseId: 1,
    description: 'Verify engine temperature is within normal operating range',
    media: null,
    mediaId: null,
    issues: [
      { id: 1, code: 'OBS05', label: 'Temperature anomaly', issueTypeId: 1, createdAt: '2024-01-01T00:00:00Z', updatedAt: null, isDeletable: false }
    ],
    objects: [
      { id: 1, code: 'OBJ-001', name: 'Voyants de défaut', description: null, localizations: null, media: null, attributes: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: null, isDeletable: true }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: null,
    isDeletable: true
  },
  {
    id: 2,
    actionRefType: {
      id: 2,
      name: 'Stop',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: null,
      isDeletable: false
    },
    actionRefTypeId: 2,
    act: {
      id: 2,
      name: 'Maintenance',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: null,
      isDeletable: false
    },
    actId: 2,
    response: {
      id: 2,
      description: 'Pressure reading in bar',
      responseTypeId: 1,
      options: ['OK', 'Low', 'High'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: null,
      isDeletable: false
    },
    responseId: 2,
    description: 'Check pneumatic brake system pressure levels',
    media: null,
    mediaId: null,
    issues: [
      { id: 2, code: 'OBS07', label: 'Pressure non-conformity', issueTypeId: 1, createdAt: '2024-01-01T00:00:00Z', updatedAt: null, isDeletable: false }
    ],
    objects: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: null,
    isDeletable: true
  },
  {
    id: 3,
    actionRefType: {
      id: 3,
      name: 'Check',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: null,
      isDeletable: false
    },
    actionRefTypeId: 3,
    act: {
      id: 3,
      name: 'Testing',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: null,
      isDeletable: false
    },
    actId: 3,
    response: {
      id: 3,
      description: 'Functional status',
      responseTypeId: 2,
      options: ['Operational', 'Non-operational'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: null,
      isDeletable: false
    },
    responseId: 3,
    description: 'Verify all control panel functions are operational',
    media: {
      id: 1,
      fileName: 'control-panel.jpg',
      contentType: 'image/jpeg',
      url: '/media/control-panel.jpg',
      createdAt: '2024-01-01T00:00:00Z'
    },
    mediaId: 1,
    issues: null,
    objects: [
      { id: 2, code: 'OBJ-002', name: 'Indicateurs de statut', description: null, localizations: null, media: null, attributes: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: null, isDeletable: true }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: null,
    isDeletable: true
  }
];

export const mockProcedures = [
  {
    id: 1,
    name: 'Engine Startup Procedure',
    description: 'Complete procedure for starting the locomotive engine safely',
    version: '1.0',
    procedureTypeId: 1 as const,
    statusId: 1 as const,
    assetItem: {
      id: 1,
      label: 'ENG-G1000-001'
    },
    assetModel: {
      id: 1,
      label: 'G1000 Engine Block'
    },
    event: {
      id: 1,
      label: 'Maintenance Event'
    },
    from: '2024-01-01T00:00:00Z',
    to: '2024-12-31T23:59:59Z',
    isDeletable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    requirements: [
      'Safety glasses',
      'Hearing protection',
      'Work gloves',
      'Flashlight'
    ],
    safetyNotes: [
      'Ensure area is well ventilated',
      'Do not start engine if fuel leak detected',
      'Keep fire extinguisher nearby',
      'Wear appropriate PPE'
    ],
    estimatedDuration: 15,
    difficultyLevel: 'Intermediate',
    isActive: true,
    operations: [
      {
        id: 1,
        procedureId: 1,
        sequence: 1,
        name: 'Pre-Start Inspection',
        description: 'Initial safety and system checks before engine startup',
        type: 'Inspection',
        estimatedDuration: 5,
        isRequired: true,
        actions: [
          {
            id: 1,
            operationId: 1,
            sequence: 1,
            actionId: 1, // Reference to existing mock action
            name: 'Check Fuel Level',
            description: 'Verify fuel tank has adequate fuel for startup',
            responseType: 'Numeric',
            isRequired: true,
            defectCodes: ['F001', 'F002'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            operationId: 1,
            sequence: 2,
            actionId: 3, // Reference to existing mock action
            name: 'Check Oil Level',
            description: 'Verify engine oil level is within acceptable range',
            responseType: 'Text',
            isRequired: true,
            defectCodes: ['O001', 'O002'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        questions: [
          {
            id: 1,
            operationId: 1,
            sequence: 1,
            text: 'Is the fuel level above minimum threshold?',
            type: 'True/False',
            isRequired: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            operationId: 1,
            sequence: 2,
            text: 'What is the current oil level reading?',
            type: 'Text',
            isRequired: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        procedureId: 1,
        sequence: 2,
        name: 'Engine Startup Sequence',
        description: 'Execute the engine startup procedure',
        type: 'Maintenance',
        estimatedDuration: 8,
        isRequired: true,
        actions: [
          {
            id: 3,
            operationId: 2,
            sequence: 1,
            actionId: 1, // Reference to existing mock action (Start)
            name: 'Start Engine',
            description: 'Initiate engine startup sequence',
            responseType: 'Boolean',
            isRequired: true,
            defectCodes: ['E001', 'E002'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 4,
            operationId: 2,
            sequence: 2,
            actionId: 3, // Reference to existing mock action (Check)
            name: 'Monitor Temperature',
            description: 'Monitor engine temperature during startup',
            responseType: 'Numeric',
            isRequired: true,
            defectCodes: ['T001', 'T002'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        questions: [
          {
            id: 3,
            operationId: 2,
            sequence: 1,
            text: 'Did the engine start successfully?',
            type: 'True/False',
            isRequired: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 4,
            operationId: 2,
            sequence: 2,
            text: 'What is the engine temperature after startup?',
            type: 'Numeric',
            isRequired: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 3,
        procedureId: 1,
        sequence: 3,
        name: 'Post-Startup Verification',
        description: 'Verify engine is running properly after startup',
        type: 'Testing',
        estimatedDuration: 3,
        isRequired: false,
        actions: [],
        questions: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]
  },
  {
    id: 2,
    name: 'Brake System Inspection',
    description: 'Complete inspection procedure for pneumatic brake system',
    version: '1.0',
    procedureTypeId: 1 as const,
    statusId: 1 as const,
    assetItem: {
      id: 2,
      label: 'BRK-SYS-002'
    },
    assetModel: {
      id: 2,
      label: 'Pneumatic Brake System'
    },
    event: {
      id: 2,
      label: 'Inspection Event'
    },
    from: '2024-01-01T00:00:00Z',
    to: '2024-12-31T23:59:59Z',
    isDeletable: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    requirements: [
      'Pressure gauge',
      'Flashlight',
      'Inspection mirror',
      'Documentation forms'
    ],
    safetyNotes: [
      'Ensure locomotive is secured',
      'Do not operate brakes during inspection',
      'Wear safety glasses',
      'Follow lockout procedures'
    ],
    estimatedDuration: 30,
    difficultyLevel: 'Advanced',
    isActive: true,
    operations: [
      {
        id: 3,
        procedureId: 2,
        sequence: 1,
        name: 'Brake Pressure Check',
        description: 'Verify brake system pressure levels',
        type: 'Testing',
        estimatedDuration: 10,
        isRequired: true,
        actions: [
          {
            id: 5,
            operationId: 3,
            sequence: 1,
            actionId: 3, // Reference to existing mock action (Check)
            name: 'Check Brake Pressure',
            description: 'Measure brake system pressure using gauge',
            responseType: 'Numeric',
            isRequired: true,
            defectCodes: ['B001', 'B002'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        questions: [
          {
            id: 5,
            operationId: 3,
            sequence: 1,
            text: 'Is brake pressure within acceptable range (4-6 bar)?',
            type: 'True/False',
            isRequired: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 4,
        procedureId: 2,
        sequence: 2,
        name: 'Brake Response Test',
        description: 'Test brake system response and functionality',
        type: 'Testing',
        estimatedDuration: 15,
        isRequired: true,
        actions: [
          {
            id: 6,
            operationId: 4,
            sequence: 1,
            actionId: 5, // Reference to existing mock action (Test)
            name: 'Test Brake Response',
            description: 'Test brake pedal response and stopping distance',
            responseType: 'Text',
            isRequired: true,
            defectCodes: ['B003', 'B004'],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        questions: [
          {
            id: 6,
            operationId: 4,
            sequence: 1,
            text: 'How was the brake response during testing?',
            type: 'Multiple Choice',
            options: ['Excellent', 'Good', 'Fair', 'Poor'],
            isRequired: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]
  },
  {
    id: 3,
    name: 'Control Panel Testing',
    description: 'Comprehensive testing procedure for control panel functions',
    category: 'Operation',
    version: '1.2',
    status: 'draft',
    eventId: 3,
    assetModelId: 3,
    assetItemId: 3,
    validFrom: '2024-02-01T00:00:00Z',
    validTo: '2024-12-31T23:59:59Z',
    requirements: [
      'Multimeter',
      'Test cables',
      'Documentation forms',
      'Safety glasses'
    ],
    safetyNotes: [
      'Ensure power is properly isolated',
      'Follow electrical safety procedures',
      'Wear appropriate PPE',
      'Test in controlled environment'
    ],
    estimatedDuration: 45,
    difficultyLevel: 'Expert',
    isActive: true,
    operations: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Separate mock data for procedure operations
export const mockProcedureOperations = [
  {
    id: 1,
    procedureId: 1,
    sequence: 1,
    name: 'Pre-Start Inspection',
    description: 'Initial safety and system checks before engine startup',
    type: 'Inspection',
    estimatedDuration: 5,
    isRequired: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    procedureId: 1,
    sequence: 2,
    name: 'Engine Startup Sequence',
    description: 'Execute the engine startup procedure',
    type: 'Maintenance',
    estimatedDuration: 8,
    isRequired: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    procedureId: 2,
    sequence: 1,
    name: 'Brake Pressure Check',
    description: 'Verify brake system pressure levels',
    type: 'Testing',
    estimatedDuration: 10,
    isRequired: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 4,
    procedureId: 2,
    sequence: 2,
    name: 'Brake Response Test',
    description: 'Test brake system response and functionality',
    type: 'Testing',
    estimatedDuration: 15,
    isRequired: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Separate mock data for procedure actions
export const mockProcedureActions = [
  {
    id: 1,
    operationId: 1,
    sequence: 1,
    actionId: 1, // Reference to existing mock action
    name: 'Check Fuel Level',
    description: 'Verify fuel tank has adequate fuel for startup',
    responseType: 'Numeric',
    isRequired: true,
    defectCodes: ['F001', 'F002'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    operationId: 1,
    sequence: 2,
    actionId: 3, // Reference to existing mock action
    name: 'Check Oil Level',
    description: 'Verify engine oil level is within acceptable range',
    responseType: 'Text',
    isRequired: true,
    defectCodes: ['O001', 'O002'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    operationId: 2,
    sequence: 1,
    actionId: 1, // Reference to existing mock action (Start)
    name: 'Start Engine',
    description: 'Initiate engine startup sequence',
    responseType: 'Boolean',
    isRequired: true,
    defectCodes: ['E001', 'E002'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 4,
    operationId: 2,
    sequence: 2,
    actionId: 3, // Reference to existing mock action (Check)
    name: 'Monitor Temperature',
    description: 'Monitor engine temperature during startup',
    responseType: 'Numeric',
    isRequired: true,
    defectCodes: ['T001', 'T002'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 5,
    operationId: 3,
    sequence: 1,
    actionId: 3, // Reference to existing mock action (Check)
    name: 'Check Brake Pressure',
    description: 'Measure brake system pressure using gauge',
    responseType: 'Numeric',
    isRequired: true,
    defectCodes: ['B001', 'B002'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 6,
    operationId: 4,
    sequence: 1,
    actionId: 5, // Reference to existing mock action (Test)
    name: 'Test Brake Response',
    description: 'Test brake pedal response and stopping distance',
    responseType: 'Text',
    isRequired: true,
    defectCodes: ['B003', 'B004'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Separate mock data for procedure questions
export const mockProcedureQuestions = [
  {
    id: 1,
    operationId: 1,
    sequence: 1,
    text: 'Is the fuel level above minimum threshold?',
    type: 'True/False',
    isRequired: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    operationId: 1,
    sequence: 2,
    text: 'What is the current oil level reading?',
    type: 'Text',
    isRequired: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    operationId: 2,
    sequence: 1,
    text: 'Did the engine start successfully?',
    type: 'True/False',
    isRequired: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 4,
    operationId: 2,
    sequence: 2,
    text: 'What is the engine temperature after startup?',
    type: 'Numeric',
    isRequired: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 5,
    operationId: 3,
    sequence: 1,
    text: 'Is brake pressure within acceptable range (4-6 bar)?',
    type: 'True/False',
    isRequired: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 6,
    operationId: 4,
    sequence: 1,
    text: 'How was the brake response during testing?',
    type: 'Multiple Choice',
    options: ['Excellent', 'Good', 'Fair', 'Poor'],
    isRequired: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export const mockQuestions = [
  {
    id: 1,
    currentAction: {
      id: 1,
      label: 'Check'
    },
    nextAction: {
      id: 2,
      label: 'Proceed'
    },
    operationId: 1,
    value: 'What is the current engine temperature?',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: null,
    isDeletable: true
  },
  {
    id: 2,
    currentAction: {
      id: 2,
      label: 'Verify'
    },
    nextAction: {
      id: 3,
      label: 'Continue'
    },
    operationId: 2,
    value: 'What is the correct brake pressure for normal operation?',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: null,
    isDeletable: true
  },
  {
    id: 3,
    currentAction: {
      id: 3,
      label: 'Confirm'
    },
    nextAction: {
      id: 4,
      label: 'Next Step'
    },
    operationId: 3,
    value: 'Which safety equipment is required for engine maintenance?',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: null,
    isDeletable: true
  }
];

export const mockResponses = [
  {
    id: 1,
    description: 'Pressure selection dropdown',
    responseTypeId: 12,
    options: ['5 bar', '4 bar', '6 bar', '7 bar'],
    createdAt: '2024-01-15T10:32:00Z',
    updatedAt: '2024-01-15T10:32:00Z',
    isDeletable: true
  },
  {
    id: 2,
    description: 'Safety equipment radio buttons',
    responseTypeId: 11,
    options: ['Both safety glasses and hearing protection', 'Safety glasses only', 'Hearing protection only', 'None'],
    createdAt: '2024-01-15T11:15:00Z',
    updatedAt: '2024-01-15T11:15:00Z',
    isDeletable: true
  },
  {
    id: 3,
    description: 'System operational status',
    responseTypeId: 10,
    options: ['True', 'False'],
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: null,
    isDeletable: false
  },
  {
    id: 4,
    description: 'Multiple choice selection',
    responseTypeId: 13,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:30:00Z',
    isDeletable: true
  },
  {
    id: 5,
    description: 'Quality rating',
    responseTypeId: 17,
    options: ['5'],
    createdAt: '2024-01-16T11:00:00Z',
    updatedAt: null,
    isDeletable: true
  },
  {
    id: 6,
    description: 'Inspection date and time',
    responseTypeId: 16,
    options: [],
    createdAt: '2024-01-16T12:00:00Z',
    updatedAt: null,
    isDeletable: true
  },
  {
    id: 7,
    description: 'Document upload response',
    responseTypeId: 14,
    options: ['pdf', 'doc', 'docx'],
    createdAt: '2024-01-16T13:00:00Z',
    updatedAt: null,
    isDeletable: true
  }
];

export const mockIssues = [
  {
    id: 1,
    title: 'Engine Temperature Warning',
    description: 'Engine temperature exceeds normal operating range during operation',
    category: 'Bug',
    priority: 'High',
    status: 'Open',
    assignedTo: 2,
    reportedBy: 1,
    reportedDate: '2024-01-15T09:00:00Z',
    dueDate: '2024-01-20T17:00:00Z',
    resolution: '',
    tags: ['engine', 'temperature', 'warning'],
    locomotive_id: 1,
    location_id: 2,
    isActive: true,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z'
  },
  {
    id: 2,
    title: 'Brake System Pressure Drop',
    description: 'Pneumatic brake system shows pressure drop below acceptable levels',
    category: 'Bug',
    priority: 'Critical',
    status: 'In Progress',
    assignedTo: 3,
    reportedBy: 2,
    reportedDate: '2024-01-16T08:30:00Z',
    dueDate: '2024-01-18T17:00:00Z',
    resolution: 'Investigating pressure regulator valve',
    tags: ['brake', 'pressure', 'safety'],
    locomotive_id: 2,
    location_id: 3,
    isActive: true,
    createdAt: '2024-01-16T08:30:00Z',
    updatedAt: '2024-01-16T08:30:00Z'
  },
  {
    id: 3,
    title: 'Control Panel Display Issue',
    description: 'Control panel display shows intermittent flickering and data corruption',
    category: 'Bug',
    priority: 'Medium',
    status: 'Resolved',
    assignedTo: 1,
    reportedBy: 3,
    reportedDate: '2024-01-14T14:20:00Z',
    dueDate: '2024-01-19T17:00:00Z',
    resolution: 'Replaced faulty display module and updated firmware',
    tags: ['display', 'control', 'hardware'],
    locomotive_id: 3,
    location_id: 1,
    isActive: true,
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-17T10:15:00Z'
  }
];

export const mockLocationLevels = [
  {
    id: 1,
    name: 'Locomotive',
    level: 1,
    parentId: null,
    description: 'Top level locomotive identification',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Compartment',
    level: 2,
    parentId: 1,
    description: 'Major compartments within locomotive',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'Engine Compartment',
    level: 3,
    parentId: 2,
    description: 'Engine compartment area',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 4,
    name: 'Driver Cabin',
    level: 3,
    parentId: 2,
    description: 'Driver cabin area',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 5,
    name: 'Brake Compartment',
    level: 3,
    parentId: 2,
    description: 'Brake system compartment',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export const mockUserSettings = [
  {
    id: 1,
    userId: 1,
    theme: 'light',
    language: 'fr',
    timezone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    notifications: {
      email: true,
      push: true,
      sms: false,
      maintenance: true,
      alerts: true,
      updates: false
    },
    dashboard: {
      defaultView: 'overview',
      widgets: ['recent_activities', 'maintenance_schedule', 'alerts'],
      refreshInterval: 30
    },
    preferences: {
      autoSave: true,
      confirmActions: true,
      showTooltips: true,
      compactMode: false
    },
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    userId: 2,
    theme: 'dark',
    language: 'en',
    timezone: 'Europe/London',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    notifications: {
      email: true,
      push: false,
      sms: true,
      maintenance: true,
      alerts: true,
      updates: true
    },
    dashboard: {
      defaultView: 'detailed',
      widgets: ['recent_activities', 'maintenance_schedule', 'alerts', 'performance_metrics'],
      refreshInterval: 60
    },
    preferences: {
      autoSave: false,
      confirmActions: true,
      showTooltips: false,
      compactMode: true
    },
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export const mockSettings = [
  {
    id: 1,
    key: 'system_name',
    value: 'SmartLogBook Console',
    description: 'Name of the system displayed in the application',
    category: 'general',
    type: 'string',
    isEditable: true,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    key: 'system_version',
    value: '2.1.0',
    description: 'Current version of the system',
    category: 'general',
    type: 'string',
    isEditable: false,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    key: 'maintenance_mode',
    value: 'false',
    description: 'Enable or disable maintenance mode',
    category: 'system',
    type: 'boolean',
    isEditable: true,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export const mockProfiles = [
  {
    id: 1,
    userId: 1,
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@kit.com',
    phone: '+33 1 23 45 67 89',
    avatar: '/avatars/user.jpg',
    bio: 'Conducteur expérimenté avec plus de 10 ans d\'expérience dans l\'exploitation ferroviaire.',
    department: 'Conduite',
    position: 'Conducteur Principal',
    employeeId: 'EMP001',
    hireDate: '2014-03-15T00:00:00Z',
    address: {
      street: '123 Rue de la Gare',
      city: 'Paris',
      postalCode: '75001',
      country: 'France'
    },
    emergencyContact: {
      name: 'Marie Dupont',
      relationship: 'Épouse',
      phone: '+33 1 23 45 67 90',
      email: 'marie.dupont@email.com'
    },
    certifications: [
      {
        name: 'Certificat de Conduite Ferroviaire',
        issuer: 'SNCF',
        issueDate: '2014-03-15T00:00:00Z',
        expiryDate: '2025-03-15T00:00:00Z',
        status: 'active'
      }
    ],
    skills: ['Conduite', 'Maintenance Préventive', 'Sécurité'],
    languages: ['Français', 'Anglais'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    userId: 2,
    firstName: 'Marie',
    lastName: 'Martin',
    email: 'marie.martin@kit.com',
    phone: '+33 1 23 45 67 91',
    avatar: '/avatars/user.jpg',
    bio: 'Manager de maintenance avec expertise en systèmes ferroviaires et gestion d\'équipe.',
    department: 'Maintenance',
    position: 'Manager Maintenance',
    employeeId: 'EMP002',
    hireDate: '2016-09-01T00:00:00Z',
    address: {
      street: '456 Avenue des Rails',
      city: 'Lyon',
      postalCode: '69001',
      country: 'France'
    },
    emergencyContact: {
      name: 'Pierre Martin',
      relationship: 'Mari',
      phone: '+33 1 23 45 67 92',
      email: 'pierre.martin@email.com'
    },
    certifications: [
      {
        name: 'Certificat de Management',
        issuer: 'INSEAD',
        issueDate: '2018-05-20T00:00:00Z',
        expiryDate: '2025-05-20T00:00:00Z',
        status: 'active'
      }
    ],
    skills: ['Management', 'Maintenance', 'Planification', 'Qualité'],
    languages: ['Français', 'Anglais', 'Allemand'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    userId: 3,
    firstName: 'Pierre',
    lastName: 'Durand',
    email: 'pierre.durand@kit.com',
    phone: '+33 1 23 45 67 93',
    avatar: '/avatars/user.jpg',
    bio: 'Administrateur système avec expertise en technologies de l\'information et gestion de projets.',
    department: 'IT',
    position: 'Administrateur Système',
    employeeId: 'EMP003',
    hireDate: '2012-01-15T00:00:00Z',
    address: {
      street: '789 Boulevard Technologique',
      city: 'Marseille',
      postalCode: '13001',
      country: 'France'
    },
    emergencyContact: {
      name: 'Sophie Durand',
      relationship: 'Épouse',
      phone: '+33 1 23 45 67 94',
      email: 'sophie.durand@email.com'
    },
    certifications: [
      {
        name: 'Certificat Administrateur Système',
        issuer: 'Microsoft',
        issueDate: '2015-06-10T00:00:00Z',
        expiryDate: '2025-06-10T00:00:00Z',
        status: 'active'
      },
      {
        name: 'Certificat Gestion de Projet',
        issuer: 'PMI',
        issueDate: '2017-09-20T00:00:00Z',
        expiryDate: '2025-09-20T00:00:00Z',
        status: 'active'
      }
    ],
    skills: ['Administration Système', 'Gestion de Projet', 'Cybersécurité', 'Cloud Computing'],
    languages: ['Français', 'Anglais', 'Espagnol'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 4,
    userId: 4,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@kit.com',
    phone: '+33 1 23 45 67 95',
    avatar: '/avatars/user.jpg',
    bio: 'Administrateur principal du système SmartLogBook avec accès complet aux fonctionnalités.',
    department: 'Administration',
    position: 'Administrateur Principal',
    employeeId: 'EMP004',
    hireDate: '2010-05-01T00:00:00Z',
    address: {
      street: '101 Avenue Administrative',
      city: 'Paris',
      postalCode: '75008',
      country: 'France'
    },
    emergencyContact: {
      name: 'Admin Contact',
      relationship: 'Contact d\'urgence',
      phone: '+33 1 23 45 67 96',
      email: 'admin.contact@email.com'
    },
    certifications: [
      {
        name: 'Certificat Administrateur Principal',
        issuer: 'SmartLogBook',
        issueDate: '2010-05-01T00:00:00Z',
        expiryDate: '2025-05-01T00:00:00Z',
        status: 'active'
      }
    ],
    skills: ['Administration', 'Gestion Utilisateurs', 'Sécurité', 'Audit'],
    languages: ['Français', 'Anglais'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 5,
    userId: 5,
    firstName: 'Sophie',
    lastName: 'Bernard',
    email: 'sophie.bernard@kit.com',
    phone: '+33 1 23 45 67 97',
    avatar: '/avatars/user.jpg',
    bio: 'Conductrice spécialisée dans les opérations de maintenance et la formation des nouveaux conducteurs.',
    department: 'Conduite',
    position: 'Conductrice Senior',
    employeeId: 'EMP005',
    hireDate: '2018-02-20T00:00:00Z',
    address: {
      street: '202 Rue de la Formation',
      city: 'Toulouse',
      postalCode: '31000',
      country: 'France'
    },
    emergencyContact: {
      name: 'Marc Bernard',
      relationship: 'Mari',
      phone: '+33 1 23 45 67 98',
      email: 'marc.bernard@email.com'
    },
    certifications: [
      {
        name: 'Certificat de Conduite Ferroviaire',
        issuer: 'SNCF',
        issueDate: '2018-02-20T00:00:00Z',
        expiryDate: '2026-02-20T00:00:00Z',
        status: 'active'
      },
      {
        name: 'Certificat de Formation',
        issuer: 'SNCF Formation',
        issueDate: '2020-08-15T00:00:00Z',
        expiryDate: '2025-08-15T00:00:00Z',
        status: 'active'
      }
    ],
    skills: ['Conduite', 'Formation', 'Maintenance', 'Qualité'],
    languages: ['Français', 'Anglais', 'Italien'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Metadata enums list (for GET /api/enums)
export const mockMetadataEnums = [
  { id: 0, name: 'ActionType', label: 'Action Type' },
  { id: 1, name: 'AssetStatus', label: 'Asset Status' },
  { id: 2, name: 'IssueType', label: 'Issue Type' },
  { id: 3, name: 'OperationStatus', label: 'Operation Status' },
  { id: 4, name: 'ProcedureResponseStatus', label: 'Procedure Response Status' },
  { id: 5, name: 'ProcedureStatus', label: 'Procedure Status' },
  { id: 6, name: 'ProcedureType', label: 'Procedure Type' },
  { id: 7, name: 'ResponseType', label: 'Response Type' },
  { id: 8, name: 'Role', label: 'Role' },
  { id: 9, name: 'EventType', label: 'Event Type' }
];

// Metadata enum values by name (for GET /api/enums/:name)
export const mockMetadataEnumValues: Record<string, Array<{ id: number; name: string; label: string; description?: string; isActive?: boolean }>> = {
  'ActionType': [
    { id: 0, name: 'Start', label: 'Start', description: 'Action de démarrage de système ou équipement', isActive: true },
    { id: 1, name: 'Stop', label: 'Stop', description: 'Action d\'arrêt de système ou équipement', isActive: true },
    { id: 2, name: 'Check', label: 'Check', description: 'Action de vérification et contrôle', isActive: true },
    { id: 3, name: 'Capture', label: 'Capture', description: 'Action de capture d\'image ou documentation', isActive: true },
    { id: 4, name: 'Test', label: 'Test', description: 'Action de test et validation', isActive: true },
    { id: 5, name: 'Repair', label: 'Repair', description: 'Action de réparation et maintenance corrective', isActive: true }
  ],
  'AssetStatus': [
    { id: 0, name: 'active', label: 'Active', description: 'Asset is active and operational', isActive: true },
    { id: 1, name: 'inactive', label: 'Inactive', description: 'Asset is inactive', isActive: true },
    { id: 2, name: 'maintenance', label: 'Maintenance', description: 'Asset is under maintenance', isActive: true },
    { id: 3, name: 'repair', label: 'Repair', description: 'Asset is being repaired', isActive: true },
    { id: 4, name: 'retired', label: 'Retired', description: 'Asset is retired', isActive: false }
  ],
  'EventType': [
    { id: 0, name: 'PC', label: 'PC', description: 'Préparation courante (PC)', isActive: true },
    { id: 1, name: 'RS', label: 'RS', description: 'Remise en service (RS)', isActive: true },
    { id: 2, name: 'VAR', label: 'VAR', description: 'Visite à l\'arrivée (VAR)', isActive: true },
    { id: 3, name: 'MES', label: 'MES', description: 'Mise en stationement (MES)', isActive: true }
  ],
  'IssueType': [],
  'OperationStatus': [],
  'ProcedureResponseStatus': [],
  'ProcedureStatus': [],
  'ProcedureType': [],
  'ResponseType': [
    { id: 8, name: 'TEXT', label: 'Text', description: 'Free text input field for user-entered text responses', isActive: true },
    { id: 9, name: 'TEXTAREA', label: 'Textarea', description: 'Multi-line text input for longer text responses', isActive: true },
    { id: 10, name: 'BOOLEAN', label: 'True/False', description: 'Radio buttons for boolean true/false responses', isActive: true },
    { id: 11, name: 'RADIO', label: 'Radio', description: 'Radio button group for single choice from multiple options', isActive: true },
    { id: 12, name: 'SELECT', label: 'Select', description: 'Dropdown select for single choice from multiple options', isActive: true },
    { id: 13, name: 'MULTISELECT', label: 'Multi-Select', description: 'Multi-select dropdown for multiple choices from options', isActive: true },
    { id: 14, name: 'FILE_UPLOAD', label: 'File Upload', description: 'File upload field for document, image, or media files', isActive: true },
    { id: 15, name: 'IMAGE_UPLOAD', label: 'Image Upload', description: 'Image upload field specifically for image files', isActive: true },
    { id: 16, name: 'DATETIME', label: 'DateTime', description: 'Date and time picker for combined date/time responses', isActive: true },
    { id: 17, name: 'RATING', label: 'Rating', description: 'Star or numeric rating input (e.g., 1-5 stars)', isActive: true },
    { id: 18, name: 'CHECKBOX', label: 'Checkbox', description: 'Single checkbox for yes/no or accept/decline responses', isActive: true }
  ],
  'Role': [
    { id: 0, name: 'conductor', label: 'Conductor', description: 'Conductor role', isActive: true },
    { id: 1, name: 'manager', label: 'Manager', description: 'Manager role', isActive: true },
    { id: 2, name: 'administrator', label: 'Administrator', description: 'Administrator role', isActive: true }
  ]
};

// ============================================================================
// VENDORS (Financial entities)
// ============================================================================

export const mockVendors = [
  {
    id: 1,
    name: "Office Supplies Co.",
    email: "contact@officesupplies.com",
    phone: "+1 (555) 123-4567",
    address: "123 Business St, New York, NY 10001",
    contact_person: "John Smith",
    notes: "Primary supplier for office materials",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Cloud Services Inc.",
    email: "sales@cloudservices.com",
    phone: "+1 (555) 234-5678",
    address: "456 Tech Ave, San Francisco, CA 94102",
    contact_person: "Sarah Johnson",
    notes: "Monthly subscription services",
    is_active: true,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z"
  },
  {
    id: 3,
    name: "Maintenance Solutions",
    email: "info@maintenance.com",
    phone: "+1 (555) 345-6789",
    address: "789 Service Rd, Chicago, IL 60601",
    contact_person: "Mike Davis",
    notes: "Equipment maintenance and repairs",
    is_active: true,
    created_at: "2024-01-03T00:00:00Z",
    updated_at: "2024-01-03T00:00:00Z"
  },
  {
    id: 4,
    name: "Marketing Agency Pro",
    email: "hello@marketingpro.com",
    phone: "+1 (555) 456-7890",
    address: "321 Creative Blvd, Los Angeles, CA 90001",
    contact_person: "Emily Chen",
    notes: "Digital marketing and advertising services",
    is_active: true,
    created_at: "2024-01-04T00:00:00Z",
    updated_at: "2024-01-04T00:00:00Z"
  },
  {
    id: 5,
    name: "Legal Advisors LLC",
    email: "contact@legaladvisors.com",
    phone: "+1 (555) 567-8901",
    address: "654 Law St, Washington, DC 20001",
    contact_person: "Robert Wilson",
    notes: "Legal consultation and services",
    is_active: false,
    created_at: "2024-01-05T00:00:00Z",
    updated_at: "2024-01-10T00:00:00Z"
  }
];

// ============================================================================
// COMBINED MOCK DATA OBJECT
// ============================================================================

// Combined mock data object for MSW handlers
export const mockData = {
  // Base entities
  users: mockUsers,
  locomotiveModels: mockLocomotiveModels,
  locations: mockLocations,
  events: mockEvents,
  operationTypes: mockOperationTypes,
  actionTypes: mockActionTypes,
  
  // Dependent entities
  locomotives: mockLocomotives,
  objects: mockObjects,
  actionRefTypes: mockActionRefTypes,
  checklists: mockChecklists,
  actions: mockActions,
  acts: mockActs,
  anomalies: mockAnomalies,
  operations: mockOperations,
  
  // Additional entities
  assetItems: mockAssetItems,
  assetModels: mockAssetModels,
  actionReferences: mockActionReferences,
  procedures: mockProcedures,
  questions: mockQuestions,
  responses: mockResponses,
  issues: mockIssues,
  locationLevels: mockLocationLevels,
  userSettings: mockUserSettings,
  settings: mockSettings,
  profiles: mockProfiles,
  metadataEnums: mockMetadataEnums,
  metadataEnumValues: mockMetadataEnumValues,
  vendors: mockVendors
};

// ============================================================================
// HELPER FUNCTIONS FOR DATA RELATIONSHIPS
// ============================================================================

// Helper function to get related data by ID
export const getRelatedData = {
  getUserById: (id: number) => mockUsers.find(user => user.id === id),
  getLocomotiveById: (id: number) => mockLocomotives.find(loco => loco.id === id),
  getLocomotiveModelById: (id: number) => mockLocomotiveModels.find(model => model.id === id),
  getLocationById: (id: number) => mockLocations.find(loc => loc.id === id),
  getObjectById: (id: number) => mockObjects.find(obj => obj.id === id),
  getChecklistById: (id: number) => mockChecklists.find(checklist => checklist.id === id),
  getEventById: (id: number) => mockEvents.find(event => event.id === id),
  getOperationTypeById: (id: number) => mockOperationTypes.find(opType => opType.id === id),
  getActionTypeById: (id: number) => mockActionTypes.find(actionType => actionType.id === id),
  getAnomalyById: (id: number) => mockAnomalies.find(anomaly => anomaly.id === id),
  getOperationById: (id: number) => mockOperations.find(operation => operation.id === id),
  getActById: (id: number) => mockActs.find(act => act.id === id),
  getIssueById: (id: number) => mockIssues.find(issue => issue.id === id),
  getAssetItemById: (id: number) => mockAssetItems.find(asset => asset.id === id),
  getAssetModelById: (id: number) => mockAssetModels.find(model => model.id === id),
  getActionReferenceById: (id: number) => mockActionReferences.find(ref => ref.id === id),
  getProcedureById: (id: number) => mockProcedures.find(proc => proc.id === id),
  getQuestionById: (id: number) => mockQuestions.find(q => q.id === id),
  getResponseById: (id: number) => mockResponses.find(resp => resp.id === id),
  getProfileById: (id: number) => mockProfiles.find(profile => profile.id === id),
  getUserSettingsById: (id: number) => mockUserSettings.find(settings => settings.id === id),
  getSettingByKey: (key: string) => mockSettings.find(setting => setting.key === key),
  getLocationLevelById: (id: number) => mockLocationLevels.find(level => level.id === id)
};

// Helper function to get data by foreign key relationships
export const getDataByRelationship = {
  getLocomotivesByModel: (modelId: number) => mockLocomotives.filter(loco => loco.model_id === modelId),
  getLocomotivesByLocation: (locationId: number) => mockLocomotives.filter(loco => loco.current_location_id === locationId),
  getLocomotiveModelsByManufacturer: (manufacturer: string) => mockLocomotiveModels.filter(model => model.manufacturer === manufacturer),
  getLocomotiveModelsByType: (type: string) => mockLocomotiveModels.filter(model => model.type === type),
  getLocomotiveModelsByStatus: (status: string) => mockLocomotiveModels.filter(model => model.status === status),
  getObjectsByLocation: (locationId: number) => mockObjects.filter(obj => obj.localizations?.some(loc => loc.id === locationId)),
  getChecklistsByEvent: (eventId: number) => mockChecklists.filter(checklist => checklist.eventId === eventId),
  getChecklistsByLocomotiveModel: (modelId: number) => mockChecklists.filter(checklist => checklist.locomotiveModelId === modelId),
  getActionsByChecklist: (checklistId: number) => mockActions.filter(action => {
    // Actions are linked to operations, which are linked to procedures
    // This relationship needs to be established through operations/procedures
    return false; // Placeholder - relationship not directly available in mock data
  }),
  getActsByLocomotive: (locomotiveId: number) => mockActs.filter(act => act.locomotive_id === locomotiveId),
  getActsByUser: (userId: number) => mockActs.filter(act => act.created_by === userId),
  getAnomaliesByLocomotive: (locomotiveId: number) => mockAnomalies.filter(anomaly => anomaly.locomotive_id === locomotiveId),
  getAnomaliesByLocation: (locationId: number) => mockAnomalies.filter(anomaly => anomaly.location_id === locationId),
  getOperationsByLocomotive: (locomotiveId: number) => [], // Operations don't have locomotive_id property
  getOperationsByUser: (userId: number) => [], // Operations don't have assigned_to property
  getIssuesByLocomotive: (locomotiveId: number) => mockIssues.filter(issue => issue.locomotive_id === locomotiveId),
  getIssuesByUser: (userId: number) => mockIssues.filter(issue => issue.assignedTo === userId),
  getResponsesByType: (responseTypeId: number) => mockResponses.filter(resp => resp.responseTypeId === responseTypeId),
  getAssetItemsByModel: (modelId: number) => mockAssetItems.filter(item => item.assetModelId === modelId),
  getAssetItemsByLocation: (locationId: number) => [], // AssetItems don't have locationId property
  getActionRefTypesByActionType: (actionTypeId: number) => mockActionRefTypes.filter(ref => ref.actionTypeId === actionTypeId),
  getLocationLevelsByParent: (parentId: number | null) => mockLocationLevels.filter(level => level.parentId === parentId)
};

// Export all data for easy access
export default mockData;