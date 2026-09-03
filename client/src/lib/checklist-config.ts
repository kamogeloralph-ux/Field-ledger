export const checklistSections = [
  {
    id: "walkaround",
    number: "01",
    title: "Walkaround",
    note: "Exterior condition & safety",
    items: [
      { id: "lights", label: "Headlamps, indicators and hazards working", required: true },
      { id: "tyres", label: "Tyres, wheel nuts and visible damage checked", required: true },
      { id: "body", label: "Body panels, mirrors and glass secure", required: true },
    ],
  },
  {
    id: "cab",
    number: "02",
    title: "Cab & controls",
    note: "Driver area & instruments",
    items: [
      { id: "seatbelt", label: "Seat belt, seat and doors secure", required: true },
      { id: "dashboard", label: "Warning lights clear after start-up", required: true },
      { id: "brakes", label: "Brake, steering and clutch feel normal", required: true },
    ],
  },
  {
    id: "equipment",
    number: "03",
    title: "Equipment",
    note: "Load & emergency kit",
    items: [
      { id: "fire", label: "Fire extinguisher present and in date", required: true },
      { id: "kit", label: "Warning triangle and first-aid kit present", required: true },
      { id: "load", label: "Load area, doors and restraints secure", required: true },
    ],
  },
] as const;
