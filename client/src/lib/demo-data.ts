/* Field Ledger direction: demo records should read like verified operational data, with clear status and no hidden ambiguity. */
export type TruckStatus = "Ready" | "Inspection due" | "Out of service";
export type InspectionStatus = "Completed" | "In progress" | "Needs review";

export type Truck = {
  fleetNumber: string;
  registration: string;
  status: TruckStatus;
  type: string;
  lastInspection: string;
  assignedDriver?: string;
};

export type Inspection = {
  id: string;
  fleetNumber: string;
  registration: string;
  driver: string;
  completedAt: string;
  status: InspectionStatus;
  issues: number;
};

export const trucks: Truck[] = [
  { fleetNumber: "7100796", registration: "LC77YCGP", status: "Ready", type: "Rigid truck", lastInspection: "Today, 05:42", assignedDriver: "Mandla Ndlovu" },
  { fleetNumber: "7442286", registration: "LN33TXGP", status: "Inspection due", type: "Freight tractor", lastInspection: "Yesterday, 05:51", assignedDriver: "Mandla Ndlovu" },
  { fleetNumber: "7512161", registration: "JF10TDGP", status: "Ready", type: "Freight tractor", lastInspection: "Today, 05:27", assignedDriver: "Sipho Maseko" },
  { fleetNumber: "7512163", registration: "JL32RYGP", status: "Ready", type: "Rigid truck", lastInspection: "Today, 05:35", assignedDriver: "Nandi Khumalo" },
  { fleetNumber: "7522123", registration: "LH44TSGP", status: "Ready", type: "Freight tractor", lastInspection: "Today, 05:18", assignedDriver: "Tebogo Molefe" },
  { fleetNumber: "8512892", registration: "LL68LTGP", status: "Out of service", type: "Freight tractor", lastInspection: "Mon, 14:10" },
  { fleetNumber: "8563850", registration: "NB67DNGP", status: "Inspection due", type: "Rigid truck", lastInspection: "Yesterday, 06:12" },
  { fleetNumber: "8563963", registration: "NC77VWGP", status: "Ready", type: "Rigid truck", lastInspection: "Today, 05:58", assignedDriver: "Ayanda Dlamini" },
];

export const inspections: Inspection[] = [
  { id: "IN-0902-081", fleetNumber: "7100796", registration: "LC77YCGP", driver: "Mandla Ndlovu", completedAt: "05:42", status: "Completed", issues: 0 },
  { id: "IN-0902-080", fleetNumber: "7512161", registration: "JF10TDGP", driver: "Sipho Maseko", completedAt: "05:27", status: "Completed", issues: 0 },
  { id: "IN-0902-079", fleetNumber: "7512163", registration: "JL32RYGP", driver: "Nandi Khumalo", completedAt: "05:35", status: "Needs review", issues: 1 },
  { id: "IN-0902-078", fleetNumber: "7522123", registration: "LH44TSGP", driver: "Tebogo Molefe", completedAt: "05:18", status: "Completed", issues: 0 },
];

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
];

export const demoDrivers = [
  { name: "Mandla Ndlovu", initials: "MN", role: "Driver" },
  { name: "Sipho Maseko", initials: "SM", role: "Driver" },
  { name: "Nandi Khumalo", initials: "NK", role: "Driver" },
  { name: "Tebogo Molefe", initials: "TM", role: "Driver" },
  { name: "Ayanda Dlamini", initials: "AD", role: "Driver" },
];

export const today = {
  day: "02",
  month: "SEP",
  weekday: "WEDNESDAY",
  label: "Wednesday 02 September 2026",
};
