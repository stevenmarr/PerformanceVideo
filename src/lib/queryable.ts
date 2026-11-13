import type { Sql } from "@/lib/db";

/** Parameterized query surface shared by Postgres, PGLite, and tests. */
export type Queryable = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

export function fromSql(sql: Sql): Queryable {
  return {
    query: (text, params) => sql.query(text, params ?? []),
  };
}
