export type KeyNumberMetric = {
  value: string
  label: string
  detail?: string
}

export type TeamMember = {
  name: string
  role: string
  bio?: string
}

export type GalleryImage = {
  url: string
  alt: string
}

export type Testimonial = {
  content: string
  author: string
  role: string
  avatar?: string
}

export function getArrayAttr<T>(value: unknown): Array<T> {
  return Array.isArray(value) ? (value as Array<T>) : []
}

export function getColumnCount(value: unknown) {
  return value === 1 || value === 2 || value === 3 ? value : 3
}
