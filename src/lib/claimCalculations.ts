 import { PayerService, UnitDefinition, RoundingRule } from '@/types/payerConfig';
 
 /**
  * Calculate billable units from session duration based on service configuration
  */
 export function calculateUnits(
   sessionDurationMinutes: number,
   unitDefinition: UnitDefinition,
   roundingRule: RoundingRule
 ): number {
   let rawUnits: number;
 
   switch (unitDefinition) {
     case '15_min':
       rawUnits = sessionDurationMinutes / 15;
       break;
     case '30_min':
       rawUnits = sessionDurationMinutes / 30;
       break;
     case '60_min':
       rawUnits = sessionDurationMinutes / 60;
       break;
     case 'per_session':
     case 'per_day':
     case 'per_month':
       rawUnits = 1;
       break;
     default:
       rawUnits = sessionDurationMinutes / 15;
   }
 
   switch (roundingRule) {
     case 'up':
       return Math.ceil(rawUnits);
     case 'down':
       return Math.floor(rawUnits);
     case 'nearest':
       return Math.round(rawUnits);
     case 'none':
     default:
       return rawUnits;
   }
 }
 
 /**
  * Calculate billable units from a PayerService object
  */
 export function calculateUnitsFromService(
   sessionDurationMinutes: number,
   service: PayerService
 ): number {
   return calculateUnits(
     sessionDurationMinutes,
     service.units.unit_definition,
     service.units.rounding_rule
   );
 }
 
 /**
  * Calculate charges based on units and service configuration
  */
 export function calculateCharges(
   units: number,
   service: PayerService
 ): number {
   if (service.rate.rate_type === 'flat_fee') {
     return service.rate.rate_amount;
   }
   return units * service.rate.rate_amount;
 }
 
 /**
  * Format units for display based on unit definition
  */
 export function formatUnitsDisplay(
   units: number,
   unitDefinition: UnitDefinition
 ): string {
   switch (unitDefinition) {
     case '15_min':
       return `${units} units (${(units * 15 / 60).toFixed(1)} hours)`;
     case '30_min':
       return `${units} units (${(units * 30 / 60).toFixed(1)} hours)`;
     case '60_min':
       return `${units} units (${units} hours)`;
     case 'per_session':
       return `${units} session${units !== 1 ? 's' : ''}`;
     case 'per_day':
       return `${units} day${units !== 1 ? 's' : ''}`;
     case 'per_month':
       return `${units} month${units !== 1 ? 's' : ''}`;
     default:
       return `${units} units`;
   }
 }
 
 /**
  * Validate service configuration and return warnings
  */
 export function validateServiceConfig(service: PayerService): string[] {
   const warnings: string[] = [];
 
   if (!service.cpt_hcpcs_code) {
     warnings.push('CPT/HCPCS code is required');
   }
 
   if (service.rate.rate_amount <= 0) {
     warnings.push('Rate amount must be greater than 0');
   }
 
   if (service.modifiers.modifier_required && !service.modifiers.modifier_1) {
     warnings.push('Modifiers are marked required but none specified');
   }
 
   if (service.auth.auth_required && service.auth.enforcement === 'block') {
     warnings.push('Auth enforcement is set to BLOCK - claims will fail without active authorization');
   }
 
   // Check for expired effective date
   if (service.rate.effective_end_date) {
     const endDate = new Date(service.rate.effective_end_date);
     if (endDate < new Date()) {
       warnings.push('Rate effective date has expired');
     }
   }
 
   // Check for future effective start date
   if (service.rate.effective_start_date) {
     const startDate = new Date(service.rate.effective_start_date);
     if (startDate > new Date()) {
       warnings.push('Rate effective date has not started yet');
     }
   }
 
   return warnings;
 }
 
 /**
  * Get unit definition description
  */
 export function getUnitDefinitionDescription(unitDefinition: UnitDefinition): string {
   switch (unitDefinition) {
     case '15_min':
       return 'Units are billed as 15-minute increments';
     case '30_min':
       return 'Units are billed as 30-minute increments';
     case '60_min':
       return 'Units are billed as hourly increments';
     case 'per_session':
       return 'Units are billed per session';
     case 'per_day':
       return 'Units are billed per day';
     case 'per_month':
       return 'Units are billed monthly';
     default:
       return 'Unknown unit definition';
   }
 }
 
 /**
  * Convert hours to units based on unit definition
  */
 export function hoursToUnits(hours: number, unitDefinition: UnitDefinition): number {
   const minutes = hours * 60;
   switch (unitDefinition) {
     case '15_min':
       return minutes / 15;
     case '30_min':
       return minutes / 30;
     case '60_min':
       return hours;
     default:
       return 1;
   }
 }
 
 /**
  * Convert units to hours based on unit definition
  */
 export function unitsToHours(units: number, unitDefinition: UnitDefinition): number {
   switch (unitDefinition) {
     case '15_min':
       return (units * 15) / 60;
     case '30_min':
       return (units * 30) / 60;
     case '60_min':
       return units;
     default:
       return 0;
   }
 }