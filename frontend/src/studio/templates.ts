export const DEFAULT_CODE = `flowchart LR
    subgraph Client
        A([Browser]) --> B[React App]
    end
    subgraph API["API Layer"]
        C[Gateway] --> D[Auth Service]
        C --> E[Data Service]
        C --> F[AI Service]
    end
    subgraph Store
        G[(PostgreSQL)]
        H[(Redis Cache)]
        I[(Vector DB)]
    end
    B -->|HTTPS| C
    D --> G
    E --> G
    E --> H
    F --> I`;

export type Template = { icon: string; name: string; desc: string; code: string };

export const TEMPLATES: Template[] = [
  {
    icon: "🔀",
    name: "Flowchart",
    desc: "Process flow",
    code: `flowchart LR
    subgraph Client
        A([Browser]) --> B[React App]
    end
    subgraph API["API Layer"]
        C[Gateway] --> D[Auth]
        C --> E[Data]
        C --> F[AI]
    end
    subgraph Store
        G[(Postgres)]
        H[(Redis)]
        I[(Vector DB)]
    end
    B -->|HTTPS| C
    D --> G
    E --> G & H
    F --> I`,
  },
  {
    icon: "💬",
    name: "Sequence",
    desc: "Interactions",
    code: `sequenceDiagram
    participant U as User
    participant A as API
    participant DB as Database
    U->>A: POST /login
    A->>DB: SELECT user
    DB-->>A: User record
    A-->>U: JWT token`,
  },
  {
    icon: "📊",
    name: "Class",
    desc: "OOP structure",
    code: `classDiagram
    class Vehicle {
        +String make
        +start() void
    }
    class Car
    Vehicle <|-- Car`,
  },
  {
    icon: "🔄",
    name: "State",
    desc: "State machine",
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Working : start
    Working --> Idle : stop`,
  },
];
