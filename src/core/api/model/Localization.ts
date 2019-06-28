export interface Asset {
  id?: string,
  locale: string,
  name: string,
  released: boolean,
  tags?: string[],
  type: string,
  value: string,
  create?: string,
  updated?: string
}

export interface AssetFilter {
  locale?: string,
  name?: string,
  released?: string,
  type?: string,
  offset?: string,
  limit?: string
}

export interface LocaleFilter {
  fallback?: string,
  released?: string,
  offset?: string,
  limit?: string
}

export interface Locale {
  id: string,
  fallback: string,
  created?: string,
  updated?: string,
  released: boolean
}

export interface LocalizedFilter {
  name?: string,
  type?: string,
  locale?: string,
  args?: {[key: string]: string}
}