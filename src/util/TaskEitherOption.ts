import { Lazy } from 'fp-ts/lib/function';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { getOptionM } from 'fp-ts/lib/OptionT';
import { getEitherM } from 'fp-ts/lib/EitherT';
import * as Task from 'fp-ts/lib/Task';
import { pipeable, pipe } from 'fp-ts/lib/pipeable';
import { Alt2, Alt2C } from 'fp-ts/lib/Alt';
import { Monad2, Monad2C } from 'fp-ts/lib/Monad'
import { MonadTask2 } from 'fp-ts/lib/MonadTask';
import { MonadThrow2 } from 'fp-ts/lib/MonadThrow';
import { Bifunctor2 } from 'fp-ts/lib/Bifunctor';
import { IO } from 'fp-ts/lib/IO';

declare module 'fp-ts/lib/HKT' {
  interface URItoKind2<E, A> {
    TaskEitherOption: TaskEitherOption<E, A>
  }
}

const T = getOptionM(TaskEither.taskEither);

export const URI = 'TaskEitherOption';
export type URI = typeof URI;
export interface TaskEitherOption<E, A> extends TaskEither.TaskEither<E, Option.Option<A>> {}

export const left: <E = never, A = never>(e: E) => TaskEitherOption<E, A> = TaskEither.left
export const right = <E = never, A = never>(a: A): TaskEitherOption<E, A> => TaskEither.right(Option.some(a))
export const some = right;
export const none = TaskEither.right(Option.none);

export const rightTask = <E = never, A = never>(ma: Task.Task<A>): TaskEitherOption<E, A> => {
  return T.fromM(TaskEither.taskEither.fromTask(ma));
}

export const rightIO = <E = never, A = never>(ma: IO<A>): TaskEitherOption<E, A> => {
  return rightTask(Task.task.fromIO(ma));
};

export const mapLeft: <E, G>(f: (e: E) => G) => <A>(fea: TaskEitherOption<E, A>) => TaskEitherOption<G, A> = TaskEither.mapLeft;

export function fold<E, A, B>(
  onLeft: (e: E) => Task.Task<B>,
  onNone: () => Task.Task<B>,
  onSome: (a: A) => Task.Task<B>
): (ma: TaskEitherOption<E, A>) => Task.Task<B> {
  return TaskEither.fold(onLeft, opt => Option.fold(onNone, onSome)(opt));
}

export function tryCatch<E, A>(f: Lazy<Promise<A>>, onRejected: (reason: unknown) => E): TaskEitherOption<E, A> {
  return () => f().then(a => Either.right(Option.some(a))).catch(e => Either.left(onRejected(e)));
}

export function tryCatchOption<E, A>(f: Lazy<Promise<Option.Option<A>>>, onRejected: (reason: unknown) => E): TaskEitherOption<E, A> {
  return () => f().then(optA => Either.right(optA)).catch(e => Either.left(onRejected(e)));
}

const taskEitherOption: Monad2<URI> & Alt2<URI> & MonadTask2<URI> & MonadThrow2<URI> = {
  URI,
  map: T.map,
  of: T.of,
  ap: T.ap,
  chain: T.chain,
  alt: T.alt,
  fromIO: rightIO,
  fromTask: rightTask,
  throwError: left
};

export const {
  alt,
  ap,
  apFirst,
  apSecond,
  chain,
  chainFirst,
  flatten,
  map,
  fromEither,
  fromPredicate,
  filterOrElse,
} = pipeable(taskEitherOption);


export function fromOption<E, A>(opt: Option.Option<A>): TaskEitherOption<E, A> {
  return TaskEither.right(opt);
}

export function fromTaskOption<E, A>(taskOpt: () => Promise<Option.Option<A>>): TaskEitherOption<E, A> {
  return TaskEither.rightTask(taskOpt);
}