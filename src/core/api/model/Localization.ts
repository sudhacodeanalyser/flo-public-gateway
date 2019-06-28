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
	released?: boolean,
	type?: string,
	offset?: number,
	limit?: number
}

export interface LocaleFilter {
	fallback?: string,
	released?: boolean,
	offset?: number,
	limit?: number
}

export interface Locale {
	id: string,
	fallback: string,
	created?: string,
	updated?: string,
	released: boolean
}

export interface LocalizedFilter {
	name: string,
	type: string,
	locale: string,
	args: {[key: string]: string}
}