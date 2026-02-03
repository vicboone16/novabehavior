import { differenceInMinutes } from 'date-fns';
import type { Appointment } from '@/types/schedule';

interface OverlapGroup {
  appointments: Appointment[];
  columns: Map<string, number>;
  totalColumns: number;
}

/**
 * Detects overlapping appointments and assigns column positions for side-by-side rendering
 */
export function calculateOverlapPositions(appointments: Appointment[]): Map<string, { column: number; totalColumns: number }> {
  const result = new Map<string, { column: number; totalColumns: number }>();
  
  if (appointments.length === 0) return result;

  // Sort by start time, then by duration (longer first)
  const sorted = [...appointments].sort((a, b) => {
    const startDiff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    if (startDiff !== 0) return startDiff;
    return b.duration_minutes - a.duration_minutes;
  });

  // Find overlapping groups
  const groups: OverlapGroup[] = [];
  
  for (const appointment of sorted) {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    
    // Find if this appointment overlaps with any existing group
    let foundGroup: OverlapGroup | null = null;
    
    for (const group of groups) {
      for (const existing of group.appointments) {
        if (appointmentsOverlap(appointment, existing)) {
          foundGroup = group;
          break;
        }
      }
      if (foundGroup) break;
    }
    
    if (foundGroup) {
      // Add to existing group and assign column
      const column = findAvailableColumn(foundGroup, appointment);
      foundGroup.appointments.push(appointment);
      foundGroup.columns.set(appointment.id, column);
      foundGroup.totalColumns = Math.max(foundGroup.totalColumns, column + 1);
    } else {
      // Create new group
      const newGroup: OverlapGroup = {
        appointments: [appointment],
        columns: new Map([[appointment.id, 0]]),
        totalColumns: 1
      };
      groups.push(newGroup);
    }
  }
  
  // Convert groups to result map
  for (const group of groups) {
    for (const appointment of group.appointments) {
      result.set(appointment.id, {
        column: group.columns.get(appointment.id) || 0,
        totalColumns: group.totalColumns
      });
    }
  }
  
  return result;
}

function appointmentsOverlap(a: Appointment, b: Appointment): boolean {
  const aStart = new Date(a.start_time).getTime();
  const aEnd = new Date(a.end_time).getTime();
  const bStart = new Date(b.start_time).getTime();
  const bEnd = new Date(b.end_time).getTime();
  
  // Appointments overlap if one starts before the other ends
  return aStart < bEnd && bStart < aEnd;
}

function findAvailableColumn(group: OverlapGroup, newAppointment: Appointment): number {
  const newStart = new Date(newAppointment.start_time).getTime();
  const newEnd = new Date(newAppointment.end_time).getTime();
  
  // Check each column to see if it's available
  for (let col = 0; col < 10; col++) { // Max 10 columns
    let columnAvailable = true;
    
    for (const existing of group.appointments) {
      const existingCol = group.columns.get(existing.id);
      if (existingCol !== col) continue;
      
      const existingStart = new Date(existing.start_time).getTime();
      const existingEnd = new Date(existing.end_time).getTime();
      
      if (newStart < existingEnd && existingStart < newEnd) {
        columnAvailable = false;
        break;
      }
    }
    
    if (columnAvailable) return col;
  }
  
  return group.totalColumns; // Fallback to new column
}

/**
 * Calculate the left offset and width for an appointment based on its overlap position
 */
export function getOverlapStyle(
  appointmentId: string, 
  overlapPositions: Map<string, { column: number; totalColumns: number }>,
  padding: number = 2
): { left: string; width: string } {
  const position = overlapPositions.get(appointmentId);
  
  if (!position || position.totalColumns <= 1) {
    return { left: `${padding}px`, width: `calc(100% - ${padding * 2}px)` };
  }
  
  const columnWidth = 100 / position.totalColumns;
  const left = position.column * columnWidth;
  const width = columnWidth;
  
  return {
    left: `calc(${left}% + ${padding}px)`,
    width: `calc(${width}% - ${padding * 2}px)`
  };
}
