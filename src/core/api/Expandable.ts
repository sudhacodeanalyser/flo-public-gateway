export type Expandable<T, ID extends keyof any = 'id'> = Record<ID, string> & Partial<T>

export default Expandable;
