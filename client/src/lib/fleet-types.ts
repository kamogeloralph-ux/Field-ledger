export type TruckStatus = "Ready" | "Inspection due" | "Out of service";

export type Truck = {
  fleetNumber: string;
  registration: string;
  status: TruckStatus;
  type: string;
  lastInspection: string;
  assignedDriver?: string;
};
