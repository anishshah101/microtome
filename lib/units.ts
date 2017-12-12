export const enum LengthUnit { MICRON, MILLIMETER, CENTIMETER, INCH }

export function lengthUnitToAbbrev(unit: LengthUnit): String {
  switch (unit) {
    case LengthUnit.MICRON:
      return "µm";
    case LengthUnit.MILLIMETER:
      return "mm";
    case LengthUnit.CENTIMETER:
      return "cm";
    case LengthUnit.INCH:
      return "in";
    default:
      return null;
  }
}

export function lengthUnitToString(unit: LengthUnit): String {
  return unit.toString().toLowerCase();
}

export const mm_in_cm: number = 10.0;
export const mm_in_in: number = 25.4;
export const mm_in_micron: number = 0.001

export function convertLengthUnit(value: number, from: LengthUnit, to: LengthUnit): number {
  // mm
  var conversion = 0.0;
  if (from === to) {
    return value;
  }

  switch (from) {
    case LengthUnit.MICRON:
      conversion = value * mm_in_micron;
      break;
    case LengthUnit.MILLIMETER:
      conversion = value;
      break;
    case LengthUnit.CENTIMETER:
      conversion = value * mm_in_cm;
      break;
    case LengthUnit.INCH:
      conversion = value * mm_in_in;
      break;
    default:
      break;
  }

  switch (to) {
    case LengthUnit.MICRON:
      conversion /= mm_in_micron;
      break;
    case LengthUnit.MILLIMETER:
      break;
    case LengthUnit.CENTIMETER:
      conversion /= mm_in_cm;
      break;
    case LengthUnit.INCH:
      conversion /= mm_in_in;
      break;
    default:
      break;
  }

  return conversion;
}