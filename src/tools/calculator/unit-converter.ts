// Length conversion
const lengthUnits: Record<string, number> = {
  'mm': 0.001,
  'cm': 0.01,
  'm': 1,
  'km': 1000,
  'inch': 0.0254,
  'ft': 0.3048,
  'yard': 0.9144,
  'mile': 1609.344
}

export function convertLength(value: number, from: string, to: string): number {
  const meters = value * lengthUnits[from]
  return meters / lengthUnits[to]
}

// Weight conversion
const weightUnits: Record<string, number> = {
  'g': 1,
  'kg': 1000,
  'ton': 1000000,
  'oz': 28.3495,
  'lb': 453.592
}

export function convertWeight(value: number, from: string, to: string): number {
  const grams = value * weightUnits[from]
  return grams / weightUnits[to]
}

// Temperature conversion
export function convertTemperature(value: number, from: string, to: string): number {
  let celsius: number

  // Convert to Celsius first
  switch (from) {
    case '°C':
      celsius = value
      break
    case '°F':
      celsius = (value - 32) * 5 / 9
      break
    case 'K':
      celsius = value - 273.15
      break
    default:
      throw new Error(`Unknown temperature unit: ${from}`)
  }

  // Convert from Celsius to target
  switch (to) {
    case '°C':
      return celsius
    case '°F':
      return celsius * 9 / 5 + 32
    case 'K':
      return celsius + 273.15
    default:
      throw new Error(`Unknown temperature unit: ${to}`)
  }
}

// Area conversion
const areaUnits: Record<string, number> = {
  'm²': 1,
  'km²': 1000000,
  'ha': 10000,
  'acre': 4046.8564224,
  'ft²': 0.09290304,
  'inch²': 0.00064516
}

export function convertArea(value: number, from: string, to: string): number {
  const sqMeters = value * areaUnits[from]
  return sqMeters / areaUnits[to]
}

// Volume conversion
const volumeUnits: Record<string, number> = {
  'mL': 0.001,
  'L': 1,
  'm³': 1000,
  'gal': 3.78541,
  'qt': 0.946353,
  'pt': 0.473176,
  'fl oz': 0.0295735
}

export function convertVolume(value: number, from: string, to: string): number {
  const liters = value * volumeUnits[from]
  return liters / volumeUnits[to]
}

// Get unit lists
export function getLengthUnits(): string[] {
  return Object.keys(lengthUnits)
}

export function getWeightUnits(): string[] {
  return Object.keys(weightUnits)
}

export function getTemperatureUnits(): string[] {
  return ['°C', '°F', 'K']
}

export function getAreaUnits(): string[] {
  return Object.keys(areaUnits)
}

export function getVolumeUnits(): string[] {
  return Object.keys(volumeUnits)
}
