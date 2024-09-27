export function createError<E extends string>(type: E) {
  return (error: unknown): AtomError<E> => {
    return {
      type,
      error: error instanceof Error ? error : new Error(`${error}`),
    };
  };
}

export type AtomError<K extends string> = {
  type: K;
  error: Error;
};
