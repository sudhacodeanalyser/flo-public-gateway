import { injectable, unmanaged } from 'inversify';

export type PropExpander<R, T> = (record: R) => Promise<Partial<T>>

@injectable()
class ObjectExpander<R, T> {
  constructor(
    @unmanaged() protected propExpanders: { [prop: string]: PropExpander<R, T> } = {}
  ) {}
  
  protected async expandProps(record: R, props: string[]): Promise<Partial<T>> {
    const expandedProps = await Promise.all(
      props.map(prop => this.expandProp(record, prop))
    );

    return expandedProps.reduce((acc, expandedProp) => ({ ...acc, ...expandedProp }), {});
  }

  protected async expandProp(record: R, prop: string): Promise<Partial<T>> {
    const propExpander: PropExpander<R, T> | undefined = this.propExpanders[prop];

    return propExpander === undefined ? {} : propExpander(record);
  }
}

export { ObjectExpander };