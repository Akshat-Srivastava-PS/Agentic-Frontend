import { z } from "zod";

export { z };

export interface Ctx {
  db<T = any>(): T;
  invalidateQueries(): void;
}

export type ActionDefinition<TReq = any, TRes = any> = {
  description?: string;
  request: z.ZodType<TReq>;
  response: z.ZodType<TRes>;
  handler: (ctx: Ctx, args: TReq) => Promise<TRes>;
};

export type ActionsModule = Record<string, ActionDefinition<any, any>>;

export function defineAction<TReq, TRes>(def: {
  description?: string;
  request: z.ZodType<TReq>;
  response: z.ZodType<TRes>;
  handler: (ctx: Ctx, args: TReq) => Promise<TRes>;
}): ActionDefinition<TReq, TRes> {
  return def;
}
